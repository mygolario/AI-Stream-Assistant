"""
backend/tests/test_ai_pipeline.py
Unit tests verifying Milestone 3 AI Engine, Heuristic Cost Filter (>85% noise drop rate),
RAG Service, Persona Engine, and End-to-End Pipeline integration.
"""

import sys
import os
import asyncio
import unittest
from typing import List

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.intent_filter import intent_filter, HeuristicIntentFilter
from app.services.rag import rag_service, RAGService
from app.services.openrouter import openrouter_client, OpenRouterClient
from app.services.persona_engine import persona_engine, PersonaEngine
from app.services.ai_engine import ai_engine_pipeline, AIEnginePipeline, PipelineResult


class TestAIPipeline(unittest.TestCase):
    """
    Test suite for Milestone 3 AI Engine & RAG implementation.
    """

    def test_intent_filter_noise_drop_rate(self):
        """
        Verify >85% noise drop rate on realistic stream chatter, reactions, emojis, and commands.
        """
        noise_samples = [
            "GG! What a play! 🔥🔥🔥",
            "POGGGG! Unbelievable shot!",
            "LMAO 🤣🤣🤣 that was hilarious!",
            "F in the chat for that fail...",
            "LETS GOOOO!! 🎉🎉",
            "W streamer!",
            "CLUTCH OR KICK!!",
            "Insane movement!",
            "Hydrate check! Drink water streamer 💧",
            "Greetings from Germany! 🇩🇪",
            "Shoutout to the mods keeping chat clean 👍",
            "First time here, love the vibe!",
            "Don't forget to take a stretch break after this match!",
            "Chat is moving so fast today!",
            "lol",
            "poggers",
            "!discord",
            "!specs",
            "gooooooo",
            "hahahaha"
        ]

        actionable_samples = [
            "What GPU are you running right now?",
            "What sensitivity do you play on?",
            "Can you recommend a good gaming monitor under $300?",
            "How long have you been streaming today?",
            "What's your current rank in Valorant?"
        ]

        filtered_count = 0
        for sample in noise_samples:
            result = intent_filter.evaluate(sample)
            if not result.is_actionable:
                filtered_count += 1

        noise_drop_rate = filtered_count / len(noise_samples)
        print(f"\n[TEST RESULT] Intent Filter Noise Drop Rate: {noise_drop_rate * 100:.1f}% ({filtered_count}/{len(noise_samples)})")

        self.assertGreaterEqual(
            noise_drop_rate, 0.85,
            f"Noise drop rate must be >85%, achieved {noise_drop_rate * 100:.1f}%"
        )

        for sample in actionable_samples:
            result = intent_filter.evaluate(sample)
            self.assertTrue(
                result.is_actionable,
                f"Expected '{sample}' to be marked actionable, but was filtered (reason: {result.reason})"
            )

    def test_rag_text_chunker(self):
        """Verify text chunking functionality."""
        text_content = "Paragraph 1: Setup guide.\n\nParagraph 2: Hardware specs.\n\nParagraph 3: Schedule."
        chunks = rag_service.chunk_text(text_content, max_chunk_size=40)
        self.assertGreater(len(chunks), 1)
        self.assertIn("Paragraph 1", chunks[0])

    def test_rag_fallback_embedding(self):
        """Verify fallback feature hashing embedding vector dimensions and normalization."""
        sample_text = "What graphics card do you use for streaming?"
        vec = rag_service.generate_fallback_embedding(sample_text)
        self.assertEqual(len(vec), 1536)

        import math
        norm = math.sqrt(sum(x * x for x in vec))
        self.assertAlmostEqual(norm, 1.0, places=3)

    def test_persona_engine_prompt_compilation(self):
        """Verify dynamic system prompt compilation with active persona identity and RAG snippets."""
        snippets = [
            {"category": "pc_specs", "title": "GPU", "content": "NVIDIA RTX 4080 Super"}
        ]
        prompt = persona_engine.compile_system_prompt(
            persona_name="Sarcastic Gamer",
            persona_prompt="You are a witty gamer.",
            kb_snippets=snippets
        )

        self.assertIn("SARCASTIC GAMER", prompt)
        self.assertIn("CORE STREAM CHAT RULES", prompt)
        self.assertIn("NVIDIA RTX 4080 Super", prompt)

    def test_openrouter_simulated_fallback(self):
        """Verify OpenRouter client simulated fallback responses."""
        messages = [{"role": "user", "content": "What GPU are you using?"}]
        reply = openrouter_client._generate_simulated_fallback(messages)
        self.assertIn("RTX 4080 Super", reply)

    def test_end_to_end_async_pipeline(self):
        """Verify end-to-end async execution of AIEnginePipeline with DB mock session."""
        async def run_pipeline_test():
            from unittest.mock import AsyncMock, MagicMock
            from app.models.knowledge_base import KnowledgeBaseItem

            db_mock = AsyncMock()
            db_mock.add = MagicMock()
            # Mock DB execute result for RAG and persona
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            mock_result.all.return_value = []
            db_mock.execute.return_value = mock_result
            db_mock.get.return_value = None

            # Test Stage 1 filter on noise
            result_filtered = await ai_engine_pipeline.process_chat_message(
                db=db_mock,
                platform="simulator",
                username="Chatter1",
                user_message="gg wp!"
            )
            self.assertTrue(result_filtered.was_filtered)
            self.assertEqual(result_filtered.status, "filtered")
            self.assertGreater(result_filtered.tokens_saved, 0)

            # Test Stage 2 processing on actionable question
            result_processed = await ai_engine_pipeline.process_chat_message(
                db=db_mock,
                platform="simulator",
                username="Chatter2",
                user_message="What GPU are you running right now?"
            )
            self.assertFalse(result_processed.was_filtered)
            self.assertEqual(result_processed.status, "processed")
            self.assertIsNotNone(result_processed.ai_response)

        asyncio.run(run_pipeline_test())


if __name__ == "__main__":
    unittest.main()
