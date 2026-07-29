"""
Connectors connect/disconnect/status API.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_user
from app.core.security import decrypt_secret
from app.models.user import User
from app.models.settings import StreamerSettings
from app.connectors.manager import connector_manager
from app.services.ai_engine import ai_engine_pipeline
from app.services.quota import allowed_platforms
from app.services import supabase_auth
from app.api.websocket import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()


async def _settings_for_user(db: Optional[AsyncSession], user: Any) -> Any:
    if db is None:
        stored = await supabase_auth.get_settings_json(int(user.id))
        data = {
            "kick_channel_id": stored.get("kick_channel_id") or settings.KICK_CHANNEL_ID,
            "twitch_channel_id": stored.get("twitch_channel_id") or settings.TWITCH_CHANNEL_ID,
            "youtube_channel_id": stored.get("youtube_channel_id") or settings.YOUTUBE_CHANNEL_ID,
            "kick_token_encrypted": stored.get("kick_token_encrypted") or "",
            "twitch_token_encrypted": stored.get("twitch_token_encrypted") or "",
            "youtube_token_encrypted": stored.get("youtube_token_encrypted") or "",
        }
        from types import SimpleNamespace

        return SimpleNamespace(**data)

    result = await db.execute(select(StreamerSettings).where(StreamerSettings.user_id == user.id))
    obj = result.scalars().first()
    if obj:
        return obj
    result = await db.execute(select(StreamerSettings).limit(1))
    obj = result.scalars().first()
    if obj:
        obj.user_id = user.id
        await db.commit()
        await db.refresh(obj)
        return obj
    obj = StreamerSettings(user_id=user.id, selected_model=settings.DEFAULT_OPENROUTER_MODEL)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def _on_platform_message(message_data: dict[str, Any]) -> None:
    """Shared ingest callback for live connectors."""
    if message_data.get("is_bot"):
        return
    platform = message_data.get("platform", "unknown")
    username = message_data.get("username", "viewer")
    text = message_data.get("message", "")
    channel_id = message_data.get("channel_id", "default")

    await ws_manager.broadcast(
        {
            "type": "chat_message",
            "message": text,
            "username": username,
            "platform": platform,
            "isAiResponse": False,
            "isFiltered": False,
            "id": f"{platform}-{message_data.get('timestamp')}",
            "timestamp": message_data.get("timestamp"),
        }
    )

    async with AsyncSessionLocal() as session:
        result = await ai_engine_pipeline.process_chat_message(
            db=session,
            platform=platform,
            username=username,
            user_message=text,
            channel_id=channel_id,
            user_id=None,
        )
        if result.ai_response and not result.was_filtered:
            connector = connector_manager.get_connector(platform)
            if connector and connector.is_connected:
                await connector.send_message(result.ai_response)


@router.get("/status")
async def connectors_status(user: User = Depends(get_current_user)):
    status = {}
    for name, conn in connector_manager.connectors.items():
        status[name] = {
            "connected": conn.is_connected,
            "channel_id": getattr(conn, "channel_id", None),
            "platform": name,
        }
    return {"connectors": status, "allowed_platforms": sorted(allowed_platforms(user.plan))}


@router.post("/{platform}/connect")
async def connect_platform(
    platform: str,
    user: User = Depends(get_current_user),
    db: Optional[AsyncSession] = Depends(get_db),
):
    platform = platform.lower()
    if platform not in allowed_platforms(user.plan) and platform != "simulator":
        raise HTTPException(403, f"Plan '{user.plan}' cannot connect {platform}. Upgrade to Pro.")

    s = await _settings_for_user(db, user)

    if platform == "kick":
        channel = s.kick_channel_id or settings.KICK_CHANNEL_ID
        if not channel:
            raise HTTPException(400, "kick_channel_id not configured in settings")
        token = decrypt_secret(s.kick_token_encrypted or "") or settings.KICK_BOT_TOKEN
        conn = await connector_manager.setup_kick(channel_id=channel, chatroom_id=channel, bot_token=token)
        conn.on_message(_on_platform_message)
        ok = await conn.connect()
        return {"platform": "kick", "connected": ok, "channel_id": channel}

    if platform == "twitch":
        channel = s.twitch_channel_id or settings.TWITCH_CHANNEL_ID
        if not channel:
            raise HTTPException(400, "twitch_channel_id not configured in settings")
        token = decrypt_secret(s.twitch_token_encrypted or "") or settings.TWITCH_BOT_OAUTH_TOKEN
        conn = await connector_manager.setup_twitch(
            channel_id=channel,
            client_id=settings.TWITCH_CLIENT_ID,
            oauth_token=token,
        )
        conn.on_message(_on_platform_message)
        ok = await conn.connect()
        return {"platform": "twitch", "connected": ok, "channel_id": channel}

    if platform == "youtube":
        channel = s.youtube_channel_id or settings.YOUTUBE_CHANNEL_ID
        if not channel and not settings.YOUTUBE_LIVE_CHAT_ID:
            raise HTTPException(400, "youtube_channel_id / live chat id not configured")
        token = decrypt_secret(s.youtube_token_encrypted or "") or settings.YOUTUBE_OAUTH_TOKEN
        conn = await connector_manager.setup_youtube(
            channel_id=channel or settings.YOUTUBE_LIVE_CHAT_ID,
            live_chat_id=settings.YOUTUBE_LIVE_CHAT_ID or channel,
            api_key=settings.YOUTUBE_API_KEY,
            oauth_token=token,
        )
        conn.on_message(_on_platform_message)
        ok = await conn.connect()
        return {"platform": "youtube", "connected": ok, "channel_id": channel}

    raise HTTPException(404, "Unknown platform")


@router.post("/{platform}/disconnect")
async def disconnect_platform(platform: str, user: User = Depends(get_current_user)):
    platform = platform.lower()
    conn = connector_manager.get_connector(platform)
    if not conn:
        return {"platform": platform, "connected": False}
    await conn.disconnect()
    return {"platform": platform, "connected": False}
