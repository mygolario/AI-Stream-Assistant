"""Contract smoke tests for auth security helpers and API surface."""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    decrypt_secret,
    encrypt_secret,
    hash_password,
    mask_secret,
    verify_password,
)
from app.main import app
from app.services.moderation import chat_moderator
from app.services.quota import allowed_platforms, daily_limit_for_plan


class TestContracts(unittest.TestCase):
    def test_default_model_is_gemini_flash_lite(self):
        self.assertEqual(settings.DEFAULT_OPENROUTER_MODEL, "google/gemini-3.5-flash-lite")

    def test_password_and_jwt_roundtrip(self):
        hashed = hash_password("secure-pass-123")
        self.assertTrue(verify_password("secure-pass-123", hashed))
        token = create_access_token("42", extra={"plan": "free"})
        payload = decode_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], "42")
        self.assertEqual(payload["plan"], "free")

    def test_secret_encryption_and_mask(self):
        raw = "oauth-token-value-123456"
        enc = encrypt_secret(raw)
        self.assertNotEqual(enc, raw)
        self.assertEqual(decrypt_secret(enc), raw)
        masked = mask_secret("sk-or-v1-abcdefghijklmnop")
        self.assertTrue("…" in masked or "****" in masked)

    def test_moderation_and_quota_defaults(self):
        self.assertFalse(chat_moderator.check_inbound("kys now").allowed)
        self.assertTrue(chat_moderator.check_inbound("What GPU are you using?").allowed)
        self.assertEqual(daily_limit_for_plan("free"), settings.FREE_DAILY_AI_REPLIES)
        self.assertIn("youtube", allowed_platforms("pro"))
        self.assertNotIn("youtube", allowed_platforms("free"))

    def test_critical_routes_registered(self):
        paths = set(app.openapi().get("paths", {}).keys())
        required = [
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/billing/checkout",
            "/api/v1/overlay/obs",
            "/api/v1/connectors/{platform}/connect",
            "/api/v1/connectors/status",
            "/api/v1/agency/organizations",
        ]
        for path in required:
            self.assertIn(path, paths, msg=f"Missing route: {path}")
        self.assertGreaterEqual(len(paths), 30)


if __name__ == "__main__":
    unittest.main()
