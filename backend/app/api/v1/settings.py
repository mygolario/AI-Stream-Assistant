"""
Endpoints for managing settings (masked secrets, encrypted tokens).
Works with Postgres when available; falls back to Supabase settings_json on Vercel.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user, AuthUser
from app.core.security import encrypt_secret, mask_secret
from app.models.settings import StreamerSettings
from app.models.user import User
from app.schemas.settings import (
    StreamerSettingsUpdate,
    StreamerSettingsResponse,
    TestApiKeyRequest,
    TestApiKeyResponse,
)
from app.services import supabase_auth

router = APIRouter()


def _default_settings_dict(user_id: int = 0) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": user_id or 1,
        "openrouter_api_key": "",
        "selected_model": settings.DEFAULT_OPENROUTER_MODEL,
        "active_persona_id": None,
        "custom_prompt_override": "",
        "kick_channel_id": "",
        "twitch_channel_id": "",
        "youtube_channel_id": "",
        "kick_token_encrypted": "",
        "twitch_token_encrypted": "",
        "youtube_token_encrypted": "",
        "bot_muted": False,
        "general_knowledge_enabled": False,
        "max_replies_per_minute": 10,
        "mention_only": False,
        "created_at": now,
        "updated_at": now,
    }


def _dict_to_response(data: dict[str, Any]) -> StreamerSettingsResponse:
    created = data.get("created_at") or datetime.now(timezone.utc)
    updated = data.get("updated_at") or datetime.now(timezone.utc)
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace("Z", "+00:00"))
    if isinstance(updated, str):
        updated = datetime.fromisoformat(updated.replace("Z", "+00:00"))
    return StreamerSettingsResponse(
        id=int(data.get("id") or 1),
        openrouter_api_key=mask_secret(data.get("openrouter_api_key") or ""),
        selected_model=data.get("selected_model") or settings.DEFAULT_OPENROUTER_MODEL,
        active_persona_id=data.get("active_persona_id"),
        custom_prompt_override=data.get("custom_prompt_override") or "",
        kick_channel_id=data.get("kick_channel_id") or "",
        twitch_channel_id=data.get("twitch_channel_id") or "",
        youtube_channel_id=data.get("youtube_channel_id") or "",
        bot_muted=bool(data.get("bot_muted")),
        general_knowledge_enabled=bool(data.get("general_knowledge_enabled")),
        max_replies_per_minute=int(data.get("max_replies_per_minute") or 10),
        mention_only=bool(data.get("mention_only")),
        created_at=created,
        updated_at=updated,
    )


async def get_or_create_settings(db: AsyncSession, user: User | None = None) -> StreamerSettings:
    if user:
        result = await db.execute(select(StreamerSettings).where(StreamerSettings.user_id == user.id))
        settings_obj = result.scalars().first()
        if settings_obj:
            return settings_obj
    result = await db.execute(select(StreamerSettings).limit(1))
    settings_obj = result.scalars().first()
    if not settings_obj:
        settings_obj = StreamerSettings(
            user_id=user.id if user else None,
            selected_model=settings.DEFAULT_OPENROUTER_MODEL,
        )
        db.add(settings_obj)
        await db.commit()
        await db.refresh(settings_obj)
    elif user and not settings_obj.user_id:
        settings_obj.user_id = user.id
        await db.commit()
        await db.refresh(settings_obj)
    return settings_obj


def _to_response(obj: StreamerSettings) -> StreamerSettingsResponse:
    return StreamerSettingsResponse(
        id=obj.id,
        openrouter_api_key=mask_secret(obj.openrouter_api_key),
        selected_model=obj.selected_model or settings.DEFAULT_OPENROUTER_MODEL,
        active_persona_id=obj.active_persona_id,
        custom_prompt_override=obj.custom_prompt_override or "",
        kick_channel_id=obj.kick_channel_id or "",
        twitch_channel_id=obj.twitch_channel_id or "",
        youtube_channel_id=obj.youtube_channel_id or "",
        bot_muted=bool(obj.bot_muted),
        general_knowledge_enabled=bool(obj.general_knowledge_enabled),
        max_replies_per_minute=obj.max_replies_per_minute or 10,
        mention_only=bool(obj.mention_only),
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


def _apply_update_to_dict(data: dict[str, Any], settings_in: StreamerSettingsUpdate) -> dict[str, Any]:
    if settings_in.openrouter_api_key is not None and settings_in.openrouter_api_key != "":
        if "…" not in settings_in.openrouter_api_key and "****" not in settings_in.openrouter_api_key:
            data["openrouter_api_key"] = settings_in.openrouter_api_key
    data["selected_model"] = settings.DEFAULT_OPENROUTER_MODEL
    if settings_in.active_persona_id is not None:
        data["active_persona_id"] = settings_in.active_persona_id
    if settings_in.custom_prompt_override is not None:
        data["custom_prompt_override"] = settings_in.custom_prompt_override
    if settings_in.kick_channel_id is not None:
        data["kick_channel_id"] = settings_in.kick_channel_id
    if settings_in.twitch_channel_id is not None:
        data["twitch_channel_id"] = settings_in.twitch_channel_id
    if settings_in.youtube_channel_id is not None:
        data["youtube_channel_id"] = settings_in.youtube_channel_id
    if settings_in.kick_bot_token:
        data["kick_token_encrypted"] = encrypt_secret(settings_in.kick_bot_token)
    if settings_in.twitch_bot_token:
        data["twitch_token_encrypted"] = encrypt_secret(settings_in.twitch_bot_token)
    if settings_in.youtube_bot_token:
        data["youtube_token_encrypted"] = encrypt_secret(settings_in.youtube_bot_token)
    if settings_in.bot_muted is not None:
        data["bot_muted"] = settings_in.bot_muted
    if settings_in.general_knowledge_enabled is not None:
        data["general_knowledge_enabled"] = settings_in.general_knowledge_enabled
    if settings_in.max_replies_per_minute is not None:
        data["max_replies_per_minute"] = settings_in.max_replies_per_minute
    if settings_in.mention_only is not None:
        data["mention_only"] = settings_in.mention_only
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return data


@router.get("", response_model=StreamerSettingsResponse)
async def get_settings(
    db: Optional[AsyncSession] = Depends(get_db),
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    if db is None:
        uid = int(getattr(user, "id", 0) or 0)
        stored = await supabase_auth.get_settings_json(uid) if uid else {}
        data = {**_default_settings_dict(uid), **stored, "id": uid or 1}
        return _dict_to_response(data)

    obj = await get_or_create_settings(db, user if isinstance(user, User) else None)
    return _to_response(obj)


@router.put("", response_model=StreamerSettingsResponse)
async def update_settings(
    settings_in: StreamerSettingsUpdate,
    db: Optional[AsyncSession] = Depends(get_db),
    user: Optional[AuthUser] = Depends(get_optional_user),
):
    if db is None:
        uid = int(getattr(user, "id", 0) or 0)
        if not uid:
            raise HTTPException(401, "Not authenticated")
        stored = await supabase_auth.get_settings_json(uid)
        data = _apply_update_to_dict({**_default_settings_dict(uid), **stored, "id": uid}, settings_in)
        saved = await supabase_auth.save_settings_json(uid, data)
        return _dict_to_response({**data, **saved, "id": uid})

    settings_obj = await get_or_create_settings(db, user if isinstance(user, User) else None)

    if settings_in.openrouter_api_key is not None and settings_in.openrouter_api_key != "":
        if "…" not in settings_in.openrouter_api_key and "****" not in settings_in.openrouter_api_key:
            settings_obj.openrouter_api_key = settings_in.openrouter_api_key
    if settings_in.selected_model is not None:
        settings_obj.selected_model = settings.DEFAULT_OPENROUTER_MODEL
    if settings_in.active_persona_id is not None:
        settings_obj.active_persona_id = settings_in.active_persona_id
    if settings_in.custom_prompt_override is not None:
        settings_obj.custom_prompt_override = settings_in.custom_prompt_override
    if settings_in.kick_channel_id is not None:
        settings_obj.kick_channel_id = settings_in.kick_channel_id
    if settings_in.twitch_channel_id is not None:
        settings_obj.twitch_channel_id = settings_in.twitch_channel_id
    if settings_in.youtube_channel_id is not None:
        settings_obj.youtube_channel_id = settings_in.youtube_channel_id
    if settings_in.kick_bot_token:
        settings_obj.kick_token_encrypted = encrypt_secret(settings_in.kick_bot_token)
    if settings_in.twitch_bot_token:
        settings_obj.twitch_token_encrypted = encrypt_secret(settings_in.twitch_bot_token)
    if settings_in.youtube_bot_token:
        settings_obj.youtube_token_encrypted = encrypt_secret(settings_in.youtube_bot_token)
    if settings_in.bot_muted is not None:
        settings_obj.bot_muted = settings_in.bot_muted
    if settings_in.general_knowledge_enabled is not None:
        settings_obj.general_knowledge_enabled = settings_in.general_knowledge_enabled
    if settings_in.max_replies_per_minute is not None:
        settings_obj.max_replies_per_minute = settings_in.max_replies_per_minute
    if settings_in.mention_only is not None:
        settings_obj.mention_only = settings_in.mention_only

    await db.commit()
    await db.refresh(settings_obj)
    return _to_response(settings_obj)


@router.post("/test-key", response_model=TestApiKeyResponse)
async def test_api_key(body: TestApiKeyRequest):
    key = body.api_key or settings.OPENROUTER_API_KEY
    if not key:
        return TestApiKeyResponse(valid=False, message="No API key provided")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {key}"},
            )
            if res.status_code < 400:
                return TestApiKeyResponse(valid=True, message="OpenRouter key looks valid")
            return TestApiKeyResponse(valid=False, message=f"OpenRouter rejected key ({res.status_code})")
    except Exception as e:
        return TestApiKeyResponse(valid=False, message=str(e))
