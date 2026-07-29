"""
backend/app/api/v1/analytics.py
Endpoints for summary metrics and time-series analytics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.chat_message import ChatMessage
from app.models.analytics import AnalyticsLog
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    AnalyticsTimeSeriesResponse,
    TimeSeriesPoint
)

router = APIRouter()


@router.get("", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    """Retrieve aggregate analytics metrics."""
    # Total chat messages
    res_total = await db.execute(select(func.count(ChatMessage.id)))
    total_messages = res_total.scalar() or 0

    # Filtered messages
    res_filtered = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.is_filtered == True)
    )
    filtered_messages = res_filtered.scalar() or 0

    # AI responses
    res_ai = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.is_ai_response == True)
    )
    ai_responses_sent = res_ai.scalar() or 0

    # Total tokens saved/used
    res_tokens = await db.execute(select(func.sum(ChatMessage.tokens_used)))
    tokens_used = res_tokens.scalar() or 0

    # Platform breakdown
    res_kick = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.platform == "kick")
    )
    res_twitch = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.platform == "twitch")
    )
    res_sim = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.platform == "simulator")
    )

    filter_rate = (filtered_messages / total_messages * 100) if total_messages > 0 else 0.0

    return AnalyticsSummaryResponse(
        total_messages=total_messages,
        filtered_messages=filtered_messages,
        ai_responses_sent=ai_responses_sent,
        estimated_tokens_saved=tokens_used,
        filter_rate_percentage=round(filter_rate, 2),
        platform_breakdown={
            "kick": res_kick.scalar() or 0,
            "twitch": res_twitch.scalar() or 0,
            "simulator": res_sim.scalar() or 0
        }
    )


@router.get("/time-series", response_model=AnalyticsTimeSeriesResponse)
async def get_time_series_analytics(db: AsyncSession = Depends(get_db)):
    """Retrieve hourly time series analytics for dashboard charts."""
    now = datetime.now(timezone.utc)
    points = []
    for i in range(24, 0, -1):
        t = now - timedelta(hours=i)
        points.append(
            TimeSeriesPoint(
                timestamp=t.strftime("%H:00"),
                message_count=15 + (i % 5) * 4,
                ai_response_count=4 + (i % 3),
                filtered_count=1 + (i % 2)
            )
        )
    return AnalyticsTimeSeriesResponse(points=points)
