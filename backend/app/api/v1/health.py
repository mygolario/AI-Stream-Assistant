from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import redis_helper

router = APIRouter()


@router.get("/health")
async def health_check(db: Optional[AsyncSession] = Depends(get_db)):
    """Health check endpoint to verify API, PostgreSQL pgvector, and Redis status."""
    db_ok = False
    redis_ok = False

    if db is not None:
        try:
            res = await db.execute(text("SELECT 1"))
            if res.scalar() == 1:
                db_ok = True
        except Exception:
            db_ok = False
    elif settings.SUPABASE_URL:
        db_ok = True

    try:
        if redis_helper.redis and await redis_helper.redis.ping():
            redis_ok = True
    except Exception:
        redis_ok = False

    return {
        "status": "online" if db_ok else "degraded",
        "database": "connected" if (db is not None and db_ok) else ("supabase" if not settings.postgres_enabled else "error"),
        "redis": "connected" if redis_ok else "error",
        "version": "1.1.0",
        "model": "google/gemini-3.5-flash-lite",
        "postgres_enabled": settings.postgres_enabled,
    }
