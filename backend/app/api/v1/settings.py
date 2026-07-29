"""
Endpoints for managing settings (masked secrets, encrypted tokens).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.core.security import encrypt_secret, mask_secret
from app.models.settings import StreamerSettings
from app.models.user import User
from app.schemas.settings import (
    StreamerSettingsUpdate,
    StreamerSettingsResponse,
    TestApiKeyRequest,
    TestApiKeyResponse,
)

router = APIRouter()


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


@router.get("", response_model=StreamerSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    obj = await get_or_create_settings(db, user)
    return _to_response(obj)


@router.put("", response_model=StreamerSettingsResponse)
async def update_settings(
    settings_in: StreamerSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    settings_obj = await get_or_create_settings(db, user)

    if settings_in.openrouter_api_key is not None and settings_in.openrouter_api_key != "":
        # Ignore masked values on save
        if "…" not in settings_in.openrouter_api_key and "****" not in settings_in.openrouter_api_key:
            settings_obj.openrouter_api_key = settings_in.openrouter_api_key
    if settings_in.selected_model is not None:
        settings_obj.selected_model = settings.DEFAULT_OPENROUTER_MODEL  # lock model per product decision
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
async def test_openrouter_key(req: TestApiKeyRequest):
    if not req.api_key:
        return TestApiKeyResponse(valid=False, message="API Key is empty")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {req.api_key}"}
            res = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers)
            if res.status_code == 200:
                return TestApiKeyResponse(valid=True, message="OpenRouter API Key is valid")
            return TestApiKeyResponse(valid=False, message=f"Invalid API Key (HTTP {res.status_code})")
    except Exception as e:
        return TestApiKeyResponse(valid=False, message=f"Verification error: {str(e)}")
