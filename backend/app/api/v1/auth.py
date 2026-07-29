"""
Auth routes: register, login, me, OAuth redirects (Twitch/Kick/Google).
Uses SQLAlchemy when Postgres is reachable; otherwise Supabase PostgREST fallback.
"""

from __future__ import annotations

import logging
import secrets
from types import SimpleNamespace
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.models.settings import StreamerSettings
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import supabase_auth

logger = logging.getLogger(__name__)
router = APIRouter()


async def _ensure_settings(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(select(StreamerSettings).where(StreamerSettings.user_id == user_id))
    if not result.scalars().first():
        db.add(StreamerSettings(user_id=user_id, selected_model=settings.DEFAULT_OPENROUTER_MODEL))
        await db.commit()


def _token_for_user_obj(user: Any) -> TokenResponse:
    token = create_access_token(
        str(user.id),
        extra={"role": getattr(user, "role", "owner"), "plan": getattr(user, "plan", "free")},
    )
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=int(user.id),
            email=user.email,
            display_name=user.display_name or "",
            role=getattr(user, "role", "owner"),
            plan=getattr(user, "plan", "free"),
            plan_expires_at=getattr(user, "plan_expires_at", None),
            organization_id=getattr(user, "organization_id", None),
            oauth_provider=getattr(user, "oauth_provider", None),
        ),
    )


def _ns_from_row(row: dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(**row)


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: Optional[AsyncSession] = Depends(get_db)):
    # Prefer Postgres when available
    if db is not None:
        try:
            existing = await db.execute(select(User).where(User.email == body.email.lower()))
            if existing.scalars().first():
                raise HTTPException(status_code=400, detail="Email already registered")
            user = User(
                email=body.email.lower(),
                hashed_password=hash_password(body.password),
                display_name=body.display_name or body.email.split("@")[0],
                role="owner",
                plan="free",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            await _ensure_settings(db, user.id)
            return _token_for_user_obj(user)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Postgres register unavailable (%s); trying Supabase fallback", e)
            await db.rollback()

    if not supabase_auth.supabase_configured():
        raise HTTPException(status_code=503, detail="Auth storage unavailable")

    existing_row = await supabase_auth.find_user_by_email(body.email)
    if existing_row:
        raise HTTPException(status_code=400, detail="Email already registered")
    row = await supabase_auth.create_user(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.email.split("@")[0],
    )
    return _token_for_user_obj(_ns_from_row(row))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: Optional[AsyncSession] = Depends(get_db)):
    if db is not None:
        try:
            result = await db.execute(select(User).where(User.email == body.email.lower()))
            user = result.scalars().first()
            if user and user.hashed_password and verify_password(body.password, user.hashed_password):
                return _token_for_user_obj(user)
            if user:
                raise HTTPException(status_code=401, detail="Invalid email or password")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Postgres login unavailable (%s); trying Supabase fallback", e)
            await db.rollback()

    if not supabase_auth.supabase_configured():
        raise HTTPException(status_code=401, detail="Invalid email or password")

    row = await supabase_auth.find_user_by_email(body.email)
    if not row or not row.get("hashed_password") or not verify_password(body.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_for_user_obj(_ns_from_row(row))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=int(user.id),
        email=user.email,
        display_name=user.display_name or "",
        role=getattr(user, "role", "owner"),
        plan=getattr(user, "plan", "free"),
        plan_expires_at=getattr(user, "plan_expires_at", None),
        organization_id=getattr(user, "organization_id", None),
        oauth_provider=getattr(user, "oauth_provider", None),
    )


@router.get("/oauth/{provider}")
async def oauth_start(provider: str):
    provider = provider.lower()
    state = secrets.token_urlsafe(16)
    if provider == "google":
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(400, "Google OAuth not configured")
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "state": state,
        }
        return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")
    if provider == "twitch":
        if not settings.TWITCH_CLIENT_ID:
            raise HTTPException(400, "Twitch OAuth not configured")
        params = {
            "client_id": settings.TWITCH_CLIENT_ID,
            "redirect_uri": settings.TWITCH_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": "user:read:email",
            "state": state,
        }
        return RedirectResponse(f"https://id.twitch.tv/oauth2/authorize?{urlencode(params)}")
    if provider == "kick":
        if not settings.KICK_CLIENT_ID:
            raise HTTPException(400, "Kick OAuth not configured")
        params = {
            "client_id": settings.KICK_CLIENT_ID,
            "redirect_uri": settings.KICK_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": "user:read",
            "state": state,
        }
        return RedirectResponse(f"https://id.kick.com/oauth/authorize?{urlencode(params)}")
    raise HTTPException(404, "Unknown provider")


async def _upsert_oauth_user(
    db: AsyncSession,
    *,
    provider: str,
    subject: str,
    email: str,
    display_name: str,
) -> User:
    result = await db.execute(
        select(User).where(User.oauth_provider == provider, User.oauth_subject == subject)
    )
    user = result.scalars().first()
    if user:
        return user
    by_email = await db.execute(select(User).where(User.email == email.lower()))
    user = by_email.scalars().first()
    if user:
        user.oauth_provider = provider
        user.oauth_subject = subject
        await db.commit()
        await db.refresh(user)
        return user
    user = User(
        email=email.lower(),
        display_name=display_name or email.split("@")[0],
        oauth_provider=provider,
        oauth_subject=subject,
        role="owner",
        plan="free",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await _ensure_settings(db, user.id)
    return user


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    provider = provider.lower()
    if not code:
        raise HTTPException(400, "Missing code")

    email = ""
    subject = ""
    display_name = ""

    async with httpx.AsyncClient(timeout=20.0) as client:
        if provider == "google":
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            tokens = token_res.json()
            access = tokens.get("access_token")
            info = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access}"},
            )
            profile = info.json()
            email = profile.get("email") or f"{profile.get('id')}@google.oauth"
            subject = str(profile.get("id"))
            display_name = profile.get("name") or display_name
        elif provider == "twitch":
            token_res = await client.post(
                "https://id.twitch.tv/oauth2/token",
                data={
                    "client_id": settings.TWITCH_CLIENT_ID,
                    "client_secret": settings.TWITCH_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.TWITCH_OAUTH_REDIRECT_URI,
                },
            )
            tokens = token_res.json()
            access = tokens.get("access_token")
            info = await client.get(
                "https://api.twitch.tv/helix/users",
                headers={
                    "Authorization": f"Bearer {access}",
                    "Client-Id": settings.TWITCH_CLIENT_ID,
                },
            )
            data = (info.json().get("data") or [{}])[0]
            subject = str(data.get("id"))
            display_name = data.get("display_name") or data.get("login") or "TwitchUser"
            email = data.get("email") or f"{subject}@twitch.oauth"
        elif provider == "kick":
            token_res = await client.post(
                "https://id.kick.com/oauth/token",
                data={
                    "client_id": settings.KICK_CLIENT_ID,
                    "client_secret": settings.KICK_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.KICK_OAUTH_REDIRECT_URI,
                },
            )
            tokens = token_res.json()
            access = tokens.get("access_token")
            info = await client.get(
                "https://api.kick.com/public/v1/users",
                headers={"Authorization": f"Bearer {access}"},
            )
            profile = info.json() if info.status_code < 400 else {}
            subject = str(profile.get("id") or tokens.get("user_id") or code[:12])
            display_name = profile.get("name") or profile.get("username") or "KickUser"
            email = profile.get("email") or f"{subject}@kick.oauth"
        else:
            raise HTTPException(404, "Unknown provider")

    try:
        user = await _upsert_oauth_user(
            db, provider=provider, subject=subject, email=email, display_name=display_name
        )
        token = create_access_token(str(user.id), extra={"role": user.role, "plan": user.plan})
    except Exception:
        # Supabase OAuth upsert fallback
        row = await supabase_auth.find_user_by_email(email)
        if not row:
            row = await supabase_auth.create_user(
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(16)),
                display_name=display_name or email.split("@")[0],
            )
        token = create_access_token(str(row["id"]), extra={"role": row.get("role", "owner"), "plan": row.get("plan", "free")})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={token}")
