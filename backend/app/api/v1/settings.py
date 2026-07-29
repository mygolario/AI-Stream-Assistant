"""
backend/app/api/v1/settings.py
Endpoints for managing OpenRouter API keys, model selections, and channel configs.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.core.database import get_db
from app.models.settings import StreamerSettings
from app.schemas.settings import (
    StreamerSettingsUpdate,
    StreamerSettingsResponse,
    TestApiKeyRequest,
    TestApiKeyResponse
)

router = APIRouter()


async def get_or_create_settings(db: AsyncSession) -> StreamerSettings:
    result = await db.execute(select(StreamerSettings).limit(1))
    settings_obj = result.scalars().first()
    if not settings_obj:
        settings_obj = StreamerSettings()
        db.add(settings_obj)
        await db.commit()
        await db.refresh(settings_obj)
    return settings_obj


@router.get("", response_model=StreamerSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current streamer settings."""
    return await get_or_create_settings(db)


@router.put("", response_model=StreamerSettingsResponse)
async def update_settings(
    settings_in: StreamerSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update streamer settings."""
    settings_obj = await get_or_create_settings(db)

    if settings_in.openrouter_api_key is not None:
        settings_obj.openrouter_api_key = settings_in.openrouter_api_key
    if settings_in.selected_model is not None:
        settings_obj.selected_model = settings_in.selected_model
    if settings_in.active_persona_id is not None:
        settings_obj.active_persona_id = settings_in.active_persona_id
    if settings_in.custom_prompt_override is not None:
        settings_obj.custom_prompt_override = settings_in.custom_prompt_override
    if settings_in.kick_channel_id is not None:
        settings_obj.kick_channel_id = settings_in.kick_channel_id
    if settings_in.twitch_channel_id is not None:
        settings_obj.twitch_channel_id = settings_in.twitch_channel_id

    await db.commit()
    await db.refresh(settings_obj)
    return settings_obj


@router.post("/test-key", response_model=TestApiKeyResponse)
async def test_openrouter_key(req: TestApiKeyRequest):
    """Verify validity of OpenRouter API Key against OpenRouter models endpoint."""
    if not req.api_key:
        return TestApiKeyResponse(valid=False, message="API Key is empty")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {req.api_key}"}
            res = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers)
            if res.status_code == 200:
                return TestApiKeyResponse(valid=True, message="OpenRouter API Key is valid")
            else:
                return TestApiKeyResponse(valid=False, message=f"Invalid API Key (HTTP {res.status_code})")
    except Exception as e:
        return TestApiKeyResponse(valid=False, message=f"Verification error: {str(e)}")
