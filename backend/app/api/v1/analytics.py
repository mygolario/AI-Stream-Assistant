"""
Analytics summary + real time-series from AnalyticsLog / ChatMessage.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.chat_message import ChatMessage
from app.models.analytics import AnalyticsLog
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    AnalyticsTimeSeriesResponse,
    TimeSeriesPoint,
)

router = APIRouter()


@router.get("", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    res_total = await db.execute(select(func.count(ChatMessage.id)))
    total_messages = res_total.scalar() or 0

    res_filtered = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.is_filtered == True)  # noqa: E712
    )
    filtered_messages = res_filtered.scalar() or 0

    res_ai = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.is_ai_response == True)  # noqa: E712
    )
    ai_responses_sent = res_ai.scalar() or 0

    res_saved = await db.execute(select(func.sum(AnalyticsLog.estimated_tokens_saved)))
    tokens_saved = res_saved.scalar() or 0

    platforms = {}
    for platform in ("kick", "twitch", "youtube", "simulator"):
        res_p = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.platform == platform)
        )
        platforms[platform] = res_p.scalar() or 0

    filter_rate = (filtered_messages / total_messages * 100) if total_messages > 0 else 0.0

    return AnalyticsSummaryResponse(
        total_messages=total_messages,
        filtered_messages=filtered_messages,
        ai_responses_sent=ai_responses_sent,
        estimated_tokens_saved=int(tokens_saved),
        filter_rate_percentage=round(filter_rate, 2),
        platform_breakdown=platforms,
    )


@router.get("/time-series", response_model=AnalyticsTimeSeriesResponse)
async def get_time_series_analytics(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    points: list[TimeSeriesPoint] = []
    for i in range(23, -1, -1):
        start = now - timedelta(hours=i + 1)
        end = now - timedelta(hours=i)
        res = await db.execute(
            select(
                func.coalesce(func.sum(AnalyticsLog.message_count), 0),
                func.coalesce(func.sum(AnalyticsLog.ai_response_count), 0),
                func.coalesce(func.sum(AnalyticsLog.filtered_count), 0),
            ).where(
                and_(AnalyticsLog.timestamp >= start, AnalyticsLog.timestamp < end)
            )
        )
        row = res.one()
        points.append(
            TimeSeriesPoint(
                timestamp=end.strftime("%H:00"),
                message_count=int(row[0] or 0),
                ai_response_count=int(row[1] or 0),
                filtered_count=int(row[2] or 0),
            )
        )
    return AnalyticsTimeSeriesResponse(points=points)
