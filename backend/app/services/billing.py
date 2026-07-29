"""
Oxapay crypto billing client + webhook helpers.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OXAPAY_API = "https://api.oxapay.com/merchants/request"
PLAN_AMOUNTS_USD = {"pro": 19.0, "agency": 79.0}


class OxapayClient:
    async def create_invoice(
        self,
        *,
        plan: str,
        user_id: int,
        order_id: str,
        email: str,
    ) -> dict[str, Any]:
        amount = PLAN_AMOUNTS_USD.get(plan, 19.0)
        if not settings.OXAPAY_MERCHANT_API_KEY:
            # Dev fallback: return a mock checkout URL
            return {
                "success": True,
                "sandbox": True,
                "track_id": f"sandbox-{order_id}",
                "payment_url": f"{settings.FRONTEND_URL}/billing?checkout=sandbox&plan={plan}&order={order_id}",
                "amount": amount,
            }

        payload = {
            "merchant": settings.OXAPAY_MERCHANT_API_KEY,
            "amount": amount,
            "currency": "USD",
            "lifeTime": 60,
            "feePaidByPayer": 0,
            "underPaidCover": 0,
            "callbackUrl": settings.OXAPAY_CALLBACK_URL,
            "returnUrl": f"{settings.FRONTEND_URL}/billing?status=return",
            "description": f"AI Stream Assistant {plan} subscription",
            "orderId": order_id,
            "email": email,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(OXAPAY_API, json=payload)
            data = res.json() if res.content else {}
            if res.status_code >= 400:
                logger.error("Oxapay invoice error: %s", data)
                raise RuntimeError(f"Oxapay error: {data}")
            return {
                "success": True,
                "track_id": data.get("trackId") or data.get("track_id"),
                "payment_url": data.get("payLink") or data.get("payment_url") or data.get("link"),
                "amount": amount,
                "raw": data,
            }

    def verify_webhook_signature(self, raw_body: bytes, signature: Optional[str]) -> bool:
        if not settings.OXAPAY_MERCHANT_API_KEY:
            return True  # sandbox
        if not signature:
            return False
        digest = hmac.new(
            settings.OXAPAY_MERCHANT_API_KEY.encode("utf-8"),
            raw_body,
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(digest, signature)

    def plan_expiry(self, months: int = 1) -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=30 * months)


oxapay_client = OxapayClient()
