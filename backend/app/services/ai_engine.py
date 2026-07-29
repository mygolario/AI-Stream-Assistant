"""
Coordinator for the 2-Stage AI Processing Pipeline with moderation + quotas.
Works with Postgres when available; skips persistence when db is None (Vercel).
"""

import logging
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.services.intent_filter import intent_filter, IntentFilterResult
from app.services.rag import rag_service
from app.services.openrouter import openrouter_client
from app.services.persona_engine import persona_engine
from app.services.moderation import chat_moderator
from app.services.quota import check_and_increment_quota
from app.core.redis import redis_helper
from app.core.config import settings
from app.models.chat_message import ChatMessage
from app.models.analytics import AnalyticsLog
from app.models.settings import StreamerSettings
from app.models.user import User
from app.api.websocket import ws_manager

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    status: str  # filtered | processed | blocked | quota_exceeded | muted
    was_filtered: bool
    filter_reason: Optional[str] = None
    ai_response: Optional[str] = None
    tokens_used: int = 0
    tokens_saved: int = 0
    kb_snippets_used: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = None


class AIEnginePipeline:
    async def process_chat_message(
        self,
        db: Optional[AsyncSession],
        platform: str,
        username: str,
        user_message: str,
        channel_id: str = "default",
        user_id: Optional[int] = None,
    ) -> PipelineResult:
        # Load settings / mute
        settings_obj = await self._get_settings(db, user_id)
        if settings_obj and getattr(settings_obj, "bot_muted", False):
            return PipelineResult(status="muted", was_filtered=True, filter_reason="bot_muted", tokens_saved=0)

        if settings_obj and getattr(settings_obj, "mention_only", False):
            lowered = user_message.lower()
            if "@" not in lowered and not lowered.startswith("!ask"):
                return PipelineResult(
                    status="filtered",
                    was_filtered=True,
                    filter_reason="mention_only",
                    tokens_saved=8,
                )

        # Pre-moderation
        inbound_mod = chat_moderator.check_inbound(user_message)
        if not inbound_mod.allowed:
            await self._record_filtered(db, platform, username, user_message, inbound_mod.reason or "moderation", 5)
            return PipelineResult(
                status="blocked",
                was_filtered=True,
                filter_reason=inbound_mod.reason,
                tokens_saved=5,
            )

        # Stage 1 filter
        filter_res: IntentFilterResult = intent_filter.evaluate(user_message)
        if not filter_res.is_actionable:
            if db is not None:
                db.add(
                    ChatMessage(
                        platform=platform,
                        username=username,
                        message=user_message,
                        is_ai_response=False,
                        is_filtered=True,
                        tokens_used=0,
                    )
                )
                await self._update_analytics(db, is_filtered=True, tokens_saved=filter_res.estimated_tokens_saved)
                await db.commit()
            try:
                await redis_helper.add_chat_turn(channel_id, username, user_message, None)
            except Exception as e:
                logger.warning("Redis update failed: %s", e)

            await ws_manager.broadcast(
                {
                    "type": "filtered",
                    "message": user_message,
                    "username": username,
                    "isAiResponse": False,
                    "isFiltered": True,
                    "filter_reason": filter_res.reason,
                }
            )
            return PipelineResult(
                status="filtered",
                was_filtered=True,
                filter_reason=filter_res.reason,
                tokens_saved=filter_res.estimated_tokens_saved,
            )

        # Quota
        user = None
        if user_id and db is not None:
            user = await db.get(User, user_id)
        allowed, used, limit = await check_and_increment_quota(user)
        if not allowed:
            return PipelineResult(
                status="quota_exceeded",
                was_filtered=True,
                filter_reason=f"daily_quota_{used}/{limit}",
                tokens_saved=0,
            )

        # Stage 2
        kb_snippets: List[Dict[str, Any]] = []
        if db is not None:
            try:
                kb_snippets = await rag_service.search_similar_items(db, user_message, top_k=3)
            except Exception as e:
                logger.warning("RAG search skipped: %s", e)

        chat_history = []
        try:
            chat_history = await redis_helper.get_chat_history(channel_id, username, limit=6)
        except Exception as e:
            logger.warning("Redis history failed: %s", e)

        persona, settings_obj = await persona_engine.get_active_persona(db)
        system_prompt = persona_engine.compile_system_prompt(
            persona_name=persona.name,
            persona_prompt=persona.system_prompt,
            kb_snippets=kb_snippets,
            custom_prompt_override=getattr(settings_obj, "custom_prompt_override", None) if settings_obj else None,
        )
        if settings_obj and not getattr(settings_obj, "general_knowledge_enabled", False):
            system_prompt += (
                "\n\nIf the knowledge base does not contain the answer, reply briefly that you "
                "don't have that in the streamer's notes. Do not invent personal facts."
            )
        system_prompt += "\nKeep replies under 150 characters when possible. Stream chat style."

        messages_payload = [{"role": "system", "content": system_prompt}]
        for turn in chat_history:
            if turn.get("user"):
                messages_payload.append({"role": "user", "content": turn["user"]})
            if turn.get("assistant"):
                messages_payload.append({"role": "assistant", "content": turn["assistant"]})
        messages_payload.append({"role": "user", "content": user_message})

        api_key = settings.OPENROUTER_API_KEY
        if settings_obj and getattr(settings_obj, "openrouter_api_key", None):
            if not api_key:
                api_key = settings_obj.openrouter_api_key

        model = settings.DEFAULT_OPENROUTER_MODEL

        ai_text, tokens_used, model_used = await openrouter_client.generate_chat_response(
            messages=messages_payload,
            model=model,
            api_key=api_key,
            temperature=float(getattr(persona, "temperature", 0.7) or 0.7),
            max_tokens=120,
        )
        ai_text = chat_moderator.truncate_reply(ai_text, 150)
        outbound = chat_moderator.check_outbound(ai_text)
        if not outbound.allowed:
            ai_text = "I can't share that here — ask the streamer or mods."

        if db is not None:
            db.add(
                ChatMessage(
                    platform=platform,
                    username=username,
                    message=user_message,
                    is_ai_response=False,
                    is_filtered=False,
                    tokens_used=0,
                )
            )
            db.add(
                ChatMessage(
                    platform=platform,
                    username="AI Assistant",
                    message=ai_text,
                    is_ai_response=True,
                    is_filtered=False,
                    tokens_used=tokens_used,
                )
            )
            await self._update_analytics(db, is_ai_response=True, tokens_used=tokens_used)
            await db.commit()

        try:
            await redis_helper.add_chat_turn(channel_id, username, user_message, ai_text)
        except Exception as e:
            logger.warning("Redis turn failed: %s", e)

        await ws_manager.broadcast(
            {
                "type": "ai_response",
                "message": ai_text,
                "username": "AI Assistant",
                "isAiResponse": True,
                "isFiltered": False,
                "data": {
                    "platform": platform,
                    "channel_id": channel_id,
                    "username": username,
                    "user_message": user_message,
                    "ai_response": ai_text,
                    "persona": persona.name,
                    "tokens_used": tokens_used,
                },
            }
        )
        try:
            from app.api.v1.overlay import push_overlay_reply

            push_overlay_reply(
                {"username": username, "ai_response": ai_text, "user_message": user_message}
            )
        except Exception:
            pass
        await ws_manager.broadcast(
            {
                "type": "chat_message",
                "message": user_message,
                "username": username,
                "isAiResponse": False,
                "isFiltered": False,
            }
        )

        return PipelineResult(
            status="processed",
            was_filtered=False,
            ai_response=ai_text,
            tokens_used=tokens_used,
            kb_snippets_used=kb_snippets,
            model_used=model_used,
        )

    async def _get_settings(self, db: Optional[AsyncSession], user_id: Optional[int]) -> Optional[Any]:
        if db is None:
            if not user_id:
                return None
            try:
                from app.services import supabase_auth

                stored = await supabase_auth.get_settings_json(int(user_id))
                if not stored:
                    return None
                return SimpleNamespace(**stored)
            except Exception as e:
                logger.warning("Supabase settings load failed: %s", e)
                return None
        if user_id:
            result = await db.execute(select(StreamerSettings).where(StreamerSettings.user_id == user_id))
            obj = result.scalars().first()
            if obj:
                return obj
        result = await db.execute(select(StreamerSettings).limit(1))
        return result.scalars().first()

    async def _record_filtered(self, db, platform, username, message, reason, tokens_saved):
        if db is None:
            return
        db.add(
            ChatMessage(
                platform=platform,
                username=username,
                message=message,
                is_ai_response=False,
                is_filtered=True,
                tokens_used=0,
            )
        )
        await self._update_analytics(db, is_filtered=True, tokens_saved=tokens_saved)
        await db.commit()

    async def _update_analytics(
        self,
        db: Optional[AsyncSession],
        is_filtered: bool = False,
        is_ai_response: bool = False,
        tokens_used: int = 0,
        tokens_saved: int = 0,
    ):
        if db is None:
            return
        try:
            log = AnalyticsLog(
                message_count=1,
                filtered_count=1 if is_filtered else 0,
                ai_response_count=1 if is_ai_response else 0,
                estimated_tokens_saved=tokens_saved if is_filtered else 0,
            )
            db.add(log)
            _ = tokens_used
        except Exception as e:
            logger.error("AnalyticsLog error: %s", e)


ai_engine_pipeline = AIEnginePipeline()
