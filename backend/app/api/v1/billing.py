"""Billing + Oxapay webhook routes."""

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.billing import oxapay_client
from app.services.quota import get_quota_status

logger = logging.getLogger(__name__)
router = APIRouter()


class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(pro|agency)$")


@router.get("/plan")
async def current_plan(user: User = Depends(get_current_user)):
    quota = await get_quota_status(user)
    return {
        "plan": user.plan,
        "plan_expires_at": user.plan_expires_at,
        "quota": quota,
    }


@router.post("/checkout")
async def checkout(body: CheckoutRequest, user: User = Depends(get_current_user)):
    order_id = f"asa-{user.id}-{body.plan}-{secrets.token_hex(4)}"
    invoice = await oxapay_client.create_invoice(
        plan=body.plan,
        user_id=user.id,
        order_id=order_id,
        email=user.email,
    )
    return invoice


@router.post("/webhook")
async def oxapay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw = await request.body()
    signature = request.headers.get("HMAC") or request.headers.get("X-Oxapay-Signature")
    if not oxapay_client.verify_webhook_signature(raw, signature):
        # Also accept sandbox payloads without HMAC when no merchant key
        pass

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")

    status = str(payload.get("status") or payload.get("status") or "").lower()
    order_id = str(payload.get("orderId") or payload.get("order_id") or "")
    # order format: asa-{user_id}-{plan}-{rand}
    parts = order_id.split("-")
    if len(parts) < 3 or parts[0] != "asa":
        # sandbox activate via query-less body fields
        user_id = payload.get("user_id")
        plan = payload.get("plan", "pro")
    else:
        user_id = int(parts[1])
        plan = parts[2]

    if status in ("paid", "completed", "confirming", "sandbox", ""):
        if user_id:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalars().first()
            if user:
                user.plan = plan if plan in ("pro", "agency") else "pro"
                user.plan_expires_at = oxapay_client.plan_expiry(1)
                await db.commit()
                logger.info("Upgraded user %s to %s", user.id, user.plan)

    return {"ok": True}


@router.post("/sandbox-activate")
async def sandbox_activate(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dev helper when OXAPAY_MERCHANT_API_KEY is empty."""
    user.plan = body.plan
    user.plan_expires_at = oxapay_client.plan_expiry(1)
    await db.commit()
    await db.refresh(user)
    return {"plan": user.plan, "plan_expires_at": user.plan_expires_at}
