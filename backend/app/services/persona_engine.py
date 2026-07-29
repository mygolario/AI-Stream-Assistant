"""
backend/app/services/persona_engine.py
Persona Engine: Compiles system prompt with Active Persona, Custom Overrides,
Knowledge Base RAG context snippets, and Streamer Chat Rules.
"""

import logging
from types import SimpleNamespace
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.persona import Persona
from app.models.settings import StreamerSettings

logger = logging.getLogger(__name__)


class PersonaEngine:
    """
    Engine for fetching active streamer persona & assembling system prompts with RAG context.
    """

    PRESETS = [
        {
            "name": "Sarcastic Gamer",
            "system_prompt": "You are a witty, mildly sarcastic gamer assistant. Give playful banter while providing correct info.",
            "temperature": 0.8,
            "is_preset": True
        },
        {
            "name": "Friendly Assistant",
            "system_prompt": "You are a helpful, welcoming, and warm live stream co-host. Answer viewer questions with enthusiasm and clarity.",
            "temperature": 0.7,
            "is_preset": True
        },
        {
            "name": "Hype-Man",
            "system_prompt": "You are an energetic, high-vibe stream hype-man! Use exclamation marks and hype energy while answering questions concisely.",
            "temperature": 0.9,
            "is_preset": True
        },
        {
            "name": "Professional",
            "system_prompt": "You are a professional, articulate, and clear stream executive co-host. Provide precise and courteous answers.",
            "temperature": 0.5,
            "is_preset": True
        }
    ]

    DEFAULT_SYSTEM_RULES = """
CORE STREAM CHAT RULES:
1. You are an AI Co-Host & Chat Assistant for a live stream.
2. Keep responses CONCISE (1 to 2 sentences maximum, under 40 words) suitable for live chat.
3. Use stream knowledge base facts accurately when available.
4. Maintain your active persona tone consistently.
5. If requested information is absent from knowledge base, answer concisely in your persona voice without making up fake stream specs/links.
"""

    def compile_system_prompt(
        self,
        persona_name: str,
        persona_prompt: str,
        kb_snippets: List[Dict[str, Any]],
        custom_prompt_override: Optional[str] = None
    ) -> str:
        """
        Assemble system prompt containing Persona identity, Custom Overrides, Rules, and RAG Snippets.
        """
        base_prompt = (
            custom_prompt_override.strip()
            if (custom_prompt_override and custom_prompt_override.strip())
            else persona_prompt.strip()
        )

        rag_section = ""
        if kb_snippets:
            rag_section = "\n=== STREAMER KNOWLEDGE BASE FACTS ===\n"
            for i, snippet in enumerate(kb_snippets, 1):
                cat = snippet.get('category', 'info').upper()
                title = snippet.get('title', '')
                content = snippet.get('content', '')
                rag_section += f"Fact #{i} [{cat}] {title}: {content}\n"

        compiled_prompt = (
            f"=== ACTIVE PERSONA: {persona_name.upper()} ===\n"
            f"{base_prompt}\n"
            f"{self.DEFAULT_SYSTEM_RULES}"
            f"{rag_section}"
        )

        return compiled_prompt

    async def ensure_default_presets(self, db: AsyncSession) -> None:
        """Ensure built-in persona presets exist in DB."""
        for preset in self.PRESETS:
            res = await db.execute(select(Persona).where(Persona.name == preset["name"]))
            existing = res.scalars().first()
            if not existing:
                p = Persona(
                    name=preset["name"],
                    system_prompt=preset["system_prompt"],
                    temperature=preset["temperature"],
                    is_preset=True
                )
                db.add(p)
        await db.commit()

    async def get_active_persona(self, db: Optional[AsyncSession]) -> Tuple[Any, Any]:
        """
        Retrieve active Persona entity and StreamerSettings from database.
        Falls back to built-in presets when Postgres is unavailable.
        """
        if db is None:
            preset = self.PRESETS[0]
            persona = SimpleNamespace(
                id=1,
                name=preset["name"],
                system_prompt=preset["system_prompt"],
                temperature=preset["temperature"],
                is_preset=True,
            )
            settings_obj = SimpleNamespace(
                active_persona_id=1,
                custom_prompt_override="",
                general_knowledge_enabled=False,
                openrouter_api_key="",
                bot_muted=False,
                mention_only=False,
            )
            return (persona, settings_obj)

        # Fetch StreamerSettings
        res_settings = await db.execute(select(StreamerSettings).limit(1))
        settings_obj = res_settings.scalars().first()
        if not settings_obj:
            settings_obj = StreamerSettings()
            db.add(settings_obj)
            await db.commit()
            await db.refresh(settings_obj)

        # Fetch Active Persona
        active_persona = None
        if settings_obj.active_persona_id:
            active_persona = await db.get(Persona, settings_obj.active_persona_id)

        if not active_persona:
            res_persona = await db.execute(select(Persona).where(Persona.is_preset == True).limit(1))  # noqa: E712
            active_persona = res_persona.scalars().first()

        if not active_persona:
            active_persona = Persona(
                name="Sarcastic Gamer",
                system_prompt="You are a witty, mildly sarcastic gamer assistant. Give playful banter while providing correct info.",
                temperature=0.7,
                is_preset=True
            )

        return (active_persona, settings_obj)


persona_engine = PersonaEngine()
