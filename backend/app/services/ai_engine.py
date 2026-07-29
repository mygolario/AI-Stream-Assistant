"""
backend/app/services/ai_engine.py
Coordinator for the 2-Stage AI Processing Pipeline:
Stage 1: Intent Filter (Heuristic noise drop)
Stage 2: RAG Vector Search + Redis History + Persona Prompt + OpenRouter LLM Execution
"""

import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.intent_filter import intent_filter, IntentFilterResult
from app.services.rag import rag_service
from app.services.openrouter import openrouter_client
from app.services.persona_engine import persona_engine
from app.core.redis import redis_helper
from app.models.chat_message import ChatMessage
from app.models.analytics import AnalyticsLog
from app.api.websocket import ws_manager

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    status: str  # "filtered" or "processed"
    was_filtered: bool
    filter_reason: Optional[str] = None
    ai_response: Optional[str] = None
    tokens_used: int = 0
    tokens_saved: int = 0
    kb_snippets_used: Optional[List[Dict[str, Any]]] = None
    model_used: Optional[str] = None


class AIEnginePipeline:
    """
    Central Coordinator for processing live stream chat messages through Stage 1 & Stage 2.
    """

    async def process_chat_message(
        self,
        db: AsyncSession,
        platform: str,
        username: str,
        user_message: str,
        channel_id: str = "default"
    ) -> PipelineResult:
        """
        Process an incoming chat message through Stage 1 Intent Filter & Stage 2 RAG + OpenRouter LLM.
        """
        # ==========================================
        # STAGE 1: HEURISTIC COST FILTER EVALUATION
        # ==========================================
        filter_res: IntentFilterResult = intent_filter.evaluate(user_message)

        if not filter_res.is_actionable:
            # Message is noise -> Filter out and record metrics
            chat_entry = ChatMessage(
                platform=platform,
                username=username,
                message=user_message,
                is_ai_response=False,
                is_filtered=True,
                tokens_used=0
            )
            db.add(chat_entry)
            await self._update_analytics(db, is_filtered=True, tokens_saved=filter_res.estimated_tokens_saved)
            await db.commit()

            # Store turn in Redis sliding history
            try:
                await redis_helper.add_chat_turn(
                    channel_id=channel_id,
                    username=username,
                    user_message=user_message,
                    bot_response=None
                )
            except Exception as e:
                logger.warning(f"Failed to update Redis for filtered message: {e}")

            logger.info(f"[IntentFilter DROPPED] '{user_message}' (Reason: {filter_res.reason}, Saved: ~{filter_res.estimated_tokens_saved} tokens)")

            return PipelineResult(
                status="filtered",
                was_filtered=True,
                filter_reason=filter_res.reason,
                ai_response=None,
                tokens_used=0,
                tokens_saved=filter_res.estimated_tokens_saved
            )

        # ==========================================
        # STAGE 2: RAG + CONTEXT + PERSONA + LLM
        # ==========================================
        logger.info(f"[IntentFilter PASSED] '{user_message}' -> Triggering Stage 2 RAG & OpenRouter LLM")

        # 1. RAG Vector Search over KnowledgeBaseItem
        kb_snippets = await rag_service.search_similar_items(db, user_message, top_k=3)

        # 2. Fetch Redis Conversation History
        chat_history = []
        try:
            chat_history = await redis_helper.get_chat_history(channel_id, username, limit=6)
        except Exception as e:
            logger.warning(f"Failed to fetch Redis chat history: {e}")

        # 3. Retrieve Active Persona & Streamer Settings
        persona, settings_obj = await persona_engine.get_active_persona(db)

        # 4. Compile Persona System Prompt
        system_prompt = persona_engine.compile_system_prompt(
            persona_name=persona.name,
            persona_prompt=persona.system_prompt,
            kb_snippets=kb_snippets,
            custom_prompt_override=settings_obj.custom_prompt_override
        )

        # 5. Format LLM Messages Payload
        messages_payload = [{"role": "system", "content": system_prompt}]
        for turn in chat_history:
            if turn.get("user"):
                messages_payload.append({"role": "user", "content": turn["user"]})
            if turn.get("assistant"):
                messages_payload.append({"role": "assistant", "content": turn["assistant"]})

        messages_payload.append({"role": "user", "content": user_message})

        # 6. Execute OpenRouter Client Call
        ai_text, tokens_used, model_used = await openrouter_client.generate_chat_response(
            messages=messages_payload,
            model=settings_obj.selected_model,
            api_key=settings_obj.openrouter_api_key,
            temperature=persona.temperature
        )

        # 7. Record User Message & AI Response in Database
        user_entry = ChatMessage(
            platform=platform,
            username=username,
            message=user_message,
            is_ai_response=False,
            is_filtered=False,
            tokens_used=0
        )
        db.add(user_entry)

        ai_entry = ChatMessage(
            platform=platform,
            username="AI Assistant",
            message=ai_text,
            is_ai_response=True,
            is_filtered=False,
            tokens_used=tokens_used
        )
        db.add(ai_entry)

        await self._update_analytics(db, is_filtered=False, is_ai_response=True, tokens_used=tokens_used)
        await db.commit()

        # 8. Update Redis Sliding Window Memory
        try:
            await redis_helper.add_chat_turn(
                channel_id=channel_id,
                username=username,
                user_message=user_message,
                bot_response=ai_text
            )
        except Exception as e:
            logger.warning(f"Failed to update Redis for AI turn: {e}")

        # 9. Broadcast AI Response over WebSocket
        ws_payload = {
            "type": "ai_response",
            "data": {
                "platform": platform,
                "channel_id": channel_id,
                "username": username,
                "user_message": user_message,
                "ai_response": ai_text,
                "persona": persona.name,
                "tokens_used": tokens_used
            }
        }
        try:
            await ws_manager.broadcast(ws_payload)
        except Exception as e:
            logger.warning(f"Failed WS broadcast: {e}")

        return PipelineResult(
            status="processed",
            was_filtered=False,
            ai_response=ai_text,
            tokens_used=tokens_used,
            kb_snippets_used=kb_snippets,
            model_used=model_used
        )

    async def _update_analytics(
        self,
        db: AsyncSession,
        is_filtered: bool = False,
        is_ai_response: bool = False,
        tokens_used: int = 0,
        tokens_saved: int = 0
    ):
        """Helper to update AnalyticsLog record in DB."""
        try:
            log = AnalyticsLog(
                message_count=1,
                filtered_count=1 if is_filtered else 0,
                ai_response_count=1 if is_ai_response else 0,
                estimated_tokens_saved=tokens_saved if is_filtered else tokens_used
            )
            db.add(log)
        except Exception as e:
            logger.error(f"Error updating AnalyticsLog: {e}")


ai_engine_pipeline = AIEnginePipeline()
