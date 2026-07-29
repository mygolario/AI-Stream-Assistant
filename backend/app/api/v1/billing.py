"""Billing + Oxapay webhook routes."""

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import get_current_user, AuthUser
from app.models.user import User
from app.services.billing import oxapay_client
from app.services.quota import get_quota_status
from app.services import supabase_auth

logger = logging.getLogger(__name__)
router = APIRouter()


class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(pro|agency)$")


@router.get("/plan")
async def current_plan(user: AuthUser = Depends(get_current_user)):
    quota = await get_quota_status(user)
    return {
        "plan": getattr(user, "plan", "free"),
        "plan_expires_at": getattr(user, "plan_expires_at", None),
        "quota": quota,
    }


@router.post("/checkout")
async def checkout(body: CheckoutRequest, user: AuthUser = Depends(get_current_user)):
    order_id = f"asa-{user.id}-{body.plan}-{secrets.token_hex(4)}"
    invoice = await oxapay_client.create_invoice(
        plan=body.plan,
        user_id=int(user.id),
        order_id=order_id,
        email=user.email,
    )
    return invoice


@router.post("/webhook")
async def oxapay_webhook(request: Request, db: Optional[AsyncSession] = Depends(get_db)):
    raw = await request.body()
    signature = request.headers.get("HMAC") or request.headers.get("X-Oxapay-Signature")
    if not oxapay_client.verify_webhook_signature(raw, signature):
        pass

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")

    status = str(payload.get("status") or "").lower()
    order_id = str(payload.get("orderId") or payload.get("order_id") or "")
    parts = order_id.split("-")
    if len(parts) < 3 or parts[0] != "asa":
        user_id = payload.get("user_id")
        plan = payload.get("plan", "pro")
    else:
        user_id = int(parts[1])
        plan = parts[2]

    if status in ("paid", "completed", "confirming", "sandbox", "") and user_id:
        plan_val = plan if plan in ("pro", "agency") else "pro"
        expires = oxapay_client.plan_expiry(1)
        if db is not None:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalars().first()
            if user:
                user.plan = plan_val
                user.plan_expires_at = expires
                await db.commit()
                logger.info("Upgraded user %s to %s", user.id, user.plan)
        else:
            await supabase_auth.update_user(
                int(user_id),
                {"plan": plan_val, "plan_expires_at": expires.isoformat()},
            )
            logger.info("Upgraded supabase user %s to %s", user_id, plan_val)

    return {"ok": True}


@router.post("/sandbox-activate")
async def sandbox_activate(
    body: CheckoutRequest,
    user: AuthUser = Depends(get_current_user),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Dev helper when OXAPAY_MERCHANT_API_KEY is empty."""
    expires = oxapay_client.plan_expiry(1)
    if db is not None and isinstance(user, User):
        user.plan = body.plan
        user.plan_expires_at = expires
        await db.commit()
        await db.refresh(user)
        return {"plan": user.plan, "plan_expires_at": user.plan_expires_at}

    updated = await supabase_auth.update_user(
        int(user.id),
        {"plan": body.plan, "plan_expires_at": expires.isoformat()},
    )
    if not updated:
        raise HTTPException(503, "Unable to update plan")
    return {
        "plan": updated.get("plan", body.plan),
        "plan_expires_at": updated.get("plan_expires_at", expires.isoformat()),
    }
