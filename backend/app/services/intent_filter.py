"""
backend/app/services/intent_filter.py
Stage 1: Heuristic Cost Filter for filtering non-actionable chat noise.
Targeting >85% noise drop rate to save LLM token costs.
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class IntentFilterResult:
    is_actionable: bool
    reason: str
    confidence: float
    estimated_tokens_saved: int = 100


class HeuristicIntentFilter:
    """
    High-accuracy heuristic pattern matching engine for stream chat messages.
    Filters out emojis, reactions, short banter, bot commands, and repetitive spam.
    Targeting >85% noise drop rate.
    """

    # 1. Emoji regex matching standard unicode ranges & emote formats
    RE_EMOJI_ONLY = re.compile(
        r'^[\s\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\u2b55\u203c\u2049\u2139\u2194-\u2199\u21a9-\u21aa\u231a-\u231b\u23e9-\u23ec\u23f0\u23f3\u25fd-\u25fe\u2614-\u2615\u2648-\u2653\u267f\u2693\u26a1\u26aa-\u26ab\u26bd-\u26be\u26c4-\u26c5\u26ce\u26d4\u26ea\u26f2-\u26f3\u26f5\u26fa\u26fd\u2702\u2705\u2708-\u270d\u270f\u2712\u2714\u2716\u271d\u2721\u2728\u2733-\u2734\u2744\u2747\u274c\u274e\u2753-\u2755\u2757\u2763-\u2764\u2795-\u2797\u27a1\u27b0\u27bf\u2934-\u2935\u2b05-\u2b07\u2b1b-\u2b1c\u2b50\u2b55]+$',
        re.UNICODE
    )

    # 2. Standalone stream reactions & gaming banter (case-insensitive)
    RE_REACTION_WORDS = re.compile(
        r'^(gg|ggs|gg\s*ez|ez|wp|gg\s*wp|lol|lmao|rofl|kek|kekw|pog|poggers|pogchamp|monkas|f|w|l|clutch|hype|nice|rip|omg|bruh|based|cringe|facts|fr|truu|tru|noob|goat|sub|hypee+|lets\s*go+|let\'?s\s*go+|clutch\s*or\s*kick|insane\s*movement|unbelievable\s*shot)\b',
        re.IGNORECASE
    )

    # Common reaction/banter sub-phrases
    RE_BANTER_PHRASES = re.compile(
        r'(what a play|in the chat|hydrate check|drink water|first time here|greetings from|shoutout to|stretch break|chat is moving|love the vibe|what a fail|insane movement|unbelievable shot|w streamer|l streamer)',
        re.IGNORECASE
    )

    # 3. Short greetings without question mark
    RE_GREETING_WORDS = re.compile(
        r'^(hi|hello|hey|yo|sup|gn|gm|good morning|good evening|cya|bye|welcome|greetings)\b',
        re.IGNORECASE
    )

    # 4. Command prefix (!discord, /me, .rank, $price, %clip)
    RE_COMMAND_PREFIX = re.compile(r'^[!/.$%]\w+')

    # 5. Excessive character repetitions ("hahahaha", "goooooo", "noooooo", "LOOOOOOL")
    RE_REPEATED_CHARS = re.compile(r'(.)\1{3,}')

    # 6. Interrogative question starters
    RE_QUESTION_STARTERS = re.compile(
        r'^(what|whats|what\'s|how|why|when|who|where|which|can|could|would|is|are|do|does|recommend|tell)\b',
        re.IGNORECASE
    )

    def evaluate(self, message: str) -> IntentFilterResult:
        """
        Evaluate if a chat message is actionable (requires LLM processing) or non-actionable noise.
        """
        cleaned = message.strip()

        # Rule 1: Empty or extremely short string
        if not cleaned:
            return IntentFilterResult(
                is_actionable=False,
                reason="empty_message",
                confidence=1.0,
                estimated_tokens_saved=50
            )

        if len(cleaned) == 1 and cleaned not in "?!":
            return IntentFilterResult(
                is_actionable=False,
                reason="single_character",
                confidence=0.98,
                estimated_tokens_saved=50
            )

        # Rule 3: Command prefix (!discord, !specs, etc.) - check before question mark to handle "!help?"
        if self.RE_COMMAND_PREFIX.match(cleaned):
            return IntentFilterResult(
                is_actionable=False,
                reason="bot_command",
                confidence=1.0,
                estimated_tokens_saved=75
            )

        # Rule 2: Explicit question mark presence or question starter -> high priority actionable
        has_question_mark = "?" in cleaned
        starts_with_interrogative = bool(self.RE_QUESTION_STARTERS.search(cleaned))

        # Check if exclamation reaction like "what a play!" or "what a shot!"
        is_exclamation_reaction = bool(re.search(r'^what a (play|shot|fail|game|match)', cleaned, re.IGNORECASE))

        if (has_question_mark or (starts_with_interrogative and len(cleaned.split()) >= 3)) and not is_exclamation_reaction:
            return IntentFilterResult(
                is_actionable=True,
                reason="explicit_question" if has_question_mark else "interrogative_question",
                confidence=0.95,
                estimated_tokens_saved=0
            )

        # Rule 4: Emoji-only message
        if self.RE_EMOJI_ONLY.match(cleaned):
            return IntentFilterResult(
                is_actionable=False,
                reason="emoji_only",
                confidence=0.99,
                estimated_tokens_saved=60
            )

        # Remove emojis for reaction and banter text checks
        stripped_text = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\u2b55\u203c\u2049\u2139]', '', cleaned).strip()
        stripped_text_nopunct = re.sub(r'[!.,\-_~]+$', '', stripped_text).strip()

        if not stripped_text_nopunct:
            return IntentFilterResult(
                is_actionable=False,
                reason="emoji_only",
                confidence=0.99,
                estimated_tokens_saved=60
            )

        # Rule 5: Standard reaction & banter words ("gg", "lol", "POG", "lmao 🤣🤣", "W streamer!")
        if self.RE_REACTION_WORDS.match(stripped_text_nopunct) or self.RE_BANTER_PHRASES.search(stripped_text_nopunct):
            return IntentFilterResult(
                is_actionable=False,
                reason="stream_reaction",
                confidence=0.95,
                estimated_tokens_saved=80
            )

        # Rule 6: Simple greetings without question mark (length <= 25 chars)
        if len(cleaned) <= 25 and self.RE_GREETING_WORDS.match(stripped_text_nopunct) and not has_question_mark:
            return IntentFilterResult(
                is_actionable=False,
                reason="simple_greeting",
                confidence=0.90,
                estimated_tokens_saved=70
            )

        # Rule 7: Single word without '?' (length <= 14 chars)
        words = cleaned.split()
        if len(words) == 1 and len(cleaned) <= 14 and not has_question_mark:
            return IntentFilterResult(
                is_actionable=False,
                reason="single_word_reaction",
                confidence=0.88,
                estimated_tokens_saved=60
            )

        # Rule 8: Repeated spam characters ("gooooooo", "hahahaha", "LOOOOOOL")
        if self.RE_REPEATED_CHARS.search(cleaned) and not has_question_mark and len(words) <= 4:
            return IntentFilterResult(
                is_actionable=False,
                reason="spam_repeat",
                confidence=0.92,
                estimated_tokens_saved=80
            )

        # Rule 9: Default Actionable if message contains >= 4 words and no noise matches
        if len(words) >= 4:
            return IntentFilterResult(
                is_actionable=True,
                reason="multi_word_query",
                confidence=0.85,
                estimated_tokens_saved=0
            )

        # Rule 10: Short ambiguous chatter -> non-actionable default
        return IntentFilterResult(
            is_actionable=False,
            reason="short_ambiguous_chatter",
            confidence=0.75,
            estimated_tokens_saved=75
        )


intent_filter = HeuristicIntentFilter()
