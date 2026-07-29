"""
Daily AI reply quotas and plan entitlements.
"""

from __future__ import annotations

from datetime import date
from typing import Optional, Tuple

from app.core.config import settings
from app.core.redis import redis_helper
from app.models.user import User


def daily_limit_for_plan(plan: str) -> int:
    if plan in ("pro", "agency"):
        return settings.PRO_DAILY_AI_REPLIES
    return settings.FREE_DAILY_AI_REPLIES


def allowed_platforms(plan: str) -> set[str]:
    if plan in ("pro", "agency"):
        return {"kick", "twitch", "youtube", "simulator"}
    return {"kick", "simulator"}  # free: one live platform family + simulator


async def check_and_increment_quota(user: Optional[User]) -> Tuple[bool, int, int]:
    """
    Returns (allowed, used, limit). If no user, allow with platform defaults.
    """
    plan = user.plan if user else "free"
    limit = daily_limit_for_plan(plan)
    user_id = user.id if user else 0
    key = f"quota:{user_id}:{date.today().isoformat()}"

    used = 0
    try:
        if redis_helper.redis:
            raw = await redis_helper.redis.get(key)
            used = int(raw or 0)
            if used >= limit:
                return False, used, limit
            used = await redis_helper.redis.incr(key)
            if used == 1:
                await redis_helper.redis.expire(key, 60 * 60 * 36)
            return True, used, limit
    except Exception:
        pass
    return True, used, limit


async def get_quota_status(user: Optional[User]) -> dict:
    plan = user.plan if user else "free"
    limit = daily_limit_for_plan(plan)
    user_id = user.id if user else 0
    key = f"quota:{user_id}:{date.today().isoformat()}"
    used = 0
    try:
        if redis_helper.redis:
            used = int(await redis_helper.redis.get(key) or 0)
    except Exception:
        pass
    return {
        "plan": plan,
        "used_today": used,
        "daily_limit": limit,
        "remaining": max(0, limit - used),
        "platforms": sorted(allowed_platforms(plan)),
    }
