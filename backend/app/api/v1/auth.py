"""
Auth routes: register, login, me, OAuth redirects (Twitch/Kick/Google).
"""

from __future__ import annotations

import secrets
from typing import Optional
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

router = APIRouter()


async def _ensure_settings(db: AsyncSession, user_id: int) -> None:
    result = await db.execute(select(StreamerSettings).where(StreamerSettings.user_id == user_id))
    if not result.scalars().first():
        db.add(StreamerSettings(user_id=user_id, selected_model=settings.DEFAULT_OPENROUTER_MODEL))
        await db.commit()


def _token_for(user: User) -> TokenResponse:
    token = create_access_token(str(user.id), extra={"role": user.role, "plan": user.plan})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
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
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalars().first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_for(user)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


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
        # Kick OAuth host may vary; use documented authorize endpoint
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
            # Best-effort Kick OAuth token exchange; adjust when Kick docs change
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

    user = await _upsert_oauth_user(
        db, provider=provider, subject=subject, email=email, display_name=display_name
    )
    token = create_access_token(str(user.id), extra={"role": user.role, "plan": user.plan})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={token}")
