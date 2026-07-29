"""
Supabase PostgREST-backed auth store for Vercel (when direct Postgres URL is unavailable).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TABLE = "stream_assistant_users"


def supabase_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY)


def _headers(prefer: Optional[str] = None) -> dict[str, str]:
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _rest(path: str = "") -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE}{path}"


async def find_user_by_email(email: str) -> Optional[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            _rest(),
            params={"email": f"eq.{email.lower()}", "select": "*"},
            headers=_headers(),
        )
        if res.status_code >= 400:
            logger.error("Supabase find email failed: %s %s", res.status_code, res.text[:200])
            return None
        rows = res.json()
        return rows[0] if rows else None


async def find_user_by_id(user_id: int) -> Optional[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            _rest(),
            params={"id": f"eq.{user_id}", "select": "*"},
            headers=_headers(),
        )
        if res.status_code >= 400:
            return None
        rows = res.json()
        return rows[0] if rows else None


async def create_user(
    *,
    email: str,
    hashed_password: str,
    display_name: str,
) -> dict[str, Any]:
    payload = {
        "email": email.lower(),
        "hashed_password": hashed_password,
        "display_name": display_name,
        "role": "owner",
        "plan": "free",
        "is_active": True,
        "settings_json": {},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            _rest(),
            json=payload,
            headers=_headers(prefer="return=representation"),
        )
        if res.status_code >= 400:
            logger.error("Supabase create user failed: %s %s", res.status_code, res.text[:300])
            raise RuntimeError(f"Supabase create failed: {res.status_code}")
        rows = res.json()
        return rows[0]


async def update_user(user_id: int, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(
            _rest(),
            params={"id": f"eq.{user_id}"},
            json=patch,
            headers=_headers(prefer="return=representation"),
        )
        if res.status_code >= 400:
            logger.error("Supabase update user failed: %s %s", res.status_code, res.text[:300])
            return None
        rows = res.json()
        return rows[0] if rows else None


async def get_settings_json(user_id: int) -> dict[str, Any]:
    row = await find_user_by_id(user_id)
    if not row:
        return {}
    raw = row.get("settings_json") or {}
    return raw if isinstance(raw, dict) else {}


async def save_settings_json(user_id: int, data: dict[str, Any]) -> dict[str, Any]:
    updated = await update_user(user_id, {"settings_json": data})
    if not updated:
        raise RuntimeError("Failed to save settings to Supabase")
    raw = updated.get("settings_json") or data
    return raw if isinstance(raw, dict) else data
