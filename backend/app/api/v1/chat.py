"""
backend/app/api/v1/chat.py
Direct chat message processing and chat history REST endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.core.database import get_db
from app.models.chat_message import ChatMessage
from app.schemas.chat import (
    DirectChatMessageRequest,
    DirectChatMessageResponse,
    ChatMessageResponse
)
from app.core.redis import redis_helper

router = APIRouter()


from datetime import datetime, timezone
from app.services.ai_engine import ai_engine_pipeline


@router.post("/message", response_model=DirectChatMessageResponse)
async def process_direct_chat_message(
    req: DirectChatMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Process incoming chat message directly via REST API through the 2-Stage AI Engine Pipeline.
    """
    result = await ai_engine_pipeline.process_chat_message(
        db=db,
        platform=req.platform,
        username=req.username,
        user_message=req.message,
        channel_id=req.channel_id or "default"
    )

    chat_entry = ChatMessageResponse(
        id=0,
        timestamp=datetime.now(timezone.utc),
        platform=req.platform,
        username=req.username,
        message=req.message,
        is_ai_response=False,
        is_filtered=result.was_filtered,
        tokens_used=result.tokens_used
    )

    return DirectChatMessageResponse(
        status=result.status,
        received_message=chat_entry,
        ai_response=result.ai_response,
        was_filtered=result.was_filtered
    )


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    limit: int = Query(50, ge=1, le=200),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve recent chat history from DB."""
    query = select(ChatMessage)
    if platform:
        query = query.where(ChatMessage.platform == platform)
    query = query.order_by(ChatMessage.timestamp.desc()).limit(limit)

    result = await db.execute(query)
    messages = result.scalars().all()
    return messages
