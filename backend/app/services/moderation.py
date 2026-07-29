"""
Light pre/post moderation for stream chat safety.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


BLOCK_PATTERNS = [
    re.compile(r"\b(kill\s+yourself|kys)\b", re.I),
    re.compile(r"\b(nazi|white\s*power)\b", re.I),
    re.compile(r"\b(child\s*porn|csam)\b", re.I),
    re.compile(r"(https?://\S+\.(?:exe|bat|cmd|scr))\b", re.I),
]

POST_BLOCK_PATTERNS = [
    re.compile(r"\b(give\s+me\s+your\s+password|send\s+crypto\s+to)\b", re.I),
    re.compile(r"\b(ssn|social\s+security\s+number)\b", re.I),
]


@dataclass
class ModerationResult:
    allowed: bool
    reason: Optional[str] = None


class ChatModerator:
    def check_inbound(self, text: str) -> ModerationResult:
        for pattern in BLOCK_PATTERNS:
            if pattern.search(text or ""):
                return ModerationResult(False, "blocked_inbound_policy")
        return ModerationResult(True)

    def check_outbound(self, text: str) -> ModerationResult:
        for pattern in POST_BLOCK_PATTERNS + BLOCK_PATTERNS:
            if pattern.search(text or ""):
                return ModerationResult(False, "blocked_outbound_policy")
        # Keep replies stream-length friendly
        if text and len(text) > 400:
            return ModerationResult(False, "reply_too_long")
        return ModerationResult(True)

    def truncate_reply(self, text: str, max_len: int = 150) -> str:
        text = (text or "").strip()
        if len(text) <= max_len:
            return text
        return text[: max_len - 1].rstrip() + "…"


chat_moderator = ChatModerator()
