"""Auth dependencies for FastAPI routes."""

from __future__ import annotations

import logging
from types import SimpleNamespace
from typing import Any, Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.services import supabase_auth

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

AuthUser = Union[User, SimpleNamespace]


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Optional[AsyncSession] = Depends(get_db),
) -> AuthUser:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = int(payload["sub"])

    if db is not None:
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if user and user.is_active:
                return user
        except Exception as e:
            logger.warning("Postgres get_current_user failed: %s", e)

    row = await supabase_auth.find_user_by_id(user_id)
    if not row or not row.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return SimpleNamespace(**row)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Optional[AsyncSession] = Depends(get_db),
) -> Optional[AuthUser]:
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
