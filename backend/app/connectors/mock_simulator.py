"""
backend/app/connectors/mock_simulator.py
Mock Stream Simulator generating realistic streamer chat traffic.
"""

import asyncio
import random
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.connectors.base import AbstractChatConnector

logger = logging.getLogger(__name__)

# Sample User Pool for Realistic Stream Chat
SIMULATED_USERS = [
    "GamerPro99", "VibeMaster", "PixelQueen", "StreamLurker", "NoobSlayer_xX",
    "Mod_Sarah", "ChillGuy42", "HyperDrive", "GG_Ez_Boy", "CosmicCat",
    "ShadowNinja", "TechGeek", "CozyViewer", "Sub_Booster", "AlphaGamer"
]

# Sample Message Database categorized by type
SIMULATED_MESSAGES = {
    "question": [
        "What GPU are you running right now?",
        "What sensitivity do you play on?",
        "Can you recommend a good gaming monitor under $300?",
        "How long have you been streaming today?",
        "Are you going to play Elden Ring DLC later?",
        "What's your current rank in Valorant?",
        "What microphone is that?",
        "How do you configure your OBS setup for 1080p60?"
    ],
    "reaction": [
        "GG! What a play! 🔥🔥🔥",
        "POGGGG! Unbelievable shot!",
        "LMAO 🤣🤣🤣 that was hilarious!",
        "F in the chat for that fail...",
        "LETS GOOOO!! 🎉🎉",
        "W streamer!",
        "CLUTCH OR KICK!!",
        "Insane movement!"
    ],
    "banter": [
        "Hydrate check! Drink water streamer 💧",
        "Just tuned in, what did I miss?",
        "Greetings from Germany! 🇩🇪",
        "Shoutout to the mods keeping chat clean 👍",
        "First time here, love the vibe!",
        "Don't forget to take a stretch break after this match!",
        "Chat is moving so fast today!"
    ]
}


class MockStreamSimulator(AbstractChatConnector):
    """
    Mock Stream Simulator for realistic chat traffic generation.
    Supports adjustable interval, start/stop/pause, and manual injection.
    """

    def __init__(self, interval_seconds: float = 3.0, channel_id: str = "simulated_channel"):
        super().__init__(platform_name="simulator", channel_id=channel_id)
        self.interval_seconds = interval_seconds
        self.total_generated: int = 0
        self._sim_task: Optional[asyncio.Task] = None
        self._ws_broadcaster: Optional[Any] = None  # Reference to ConnectionManager

    def set_broadcaster(self, broadcaster: Any):
        """Set WebSocket connection manager for live client broadcasting."""
        self._ws_broadcaster = broadcaster

    async def connect(self) -> bool:
        """Start the mock simulator generation task."""
        if self._is_connected:
            return True

        self._is_connected = True
        self._sim_task = asyncio.create_task(self._generator_loop())
        logger.info(f"Mock Stream Simulator started (interval: {self.interval_seconds}s)")
        return True

    async def disconnect(self) -> None:
        """Stop the mock simulator generation task."""
        self._is_connected = False
        if self._sim_task and not self._sim_task.done():
            self._sim_task.cancel()
            self._sim_task = None
        logger.info("Mock Stream Simulator stopped")

    async def send_message(self, message: str) -> bool:
        """Simulate sending bot message to simulated channel."""
        logger.info(f"[Simulator Bot Send] {message}")
        bot_msg = self.normalize_message(
            username="StreamAssistantBot",
            message=message,
            user_id="bot_001",
            is_bot=True
        )
        await self._dispatch_and_broadcast(bot_msg)
        return True

    async def inject_custom_message(self, username: str, text: str, platform: str = "simulator") -> Dict[str, Any]:
        """Manually inject a custom user message into the simulator pipeline."""
        normalized = {
            "platform": platform,
            "channel_id": self.channel_id,
            "username": username,
            "user_id": f"usr_{username.lower()}",
            "message": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_event": {"injected": True},
            "is_bot": False
        }
        self.total_generated += 1
        await self._dispatch_and_broadcast(normalized)
        return normalized

    async def _generator_loop(self) -> None:
        """Continuous background loop creating realistic stream chat."""
        while self._is_connected:
            try:
                await asyncio.sleep(self.interval_seconds)
                if not self._is_connected:
                    break

                category = random.choices(
                    ["question", "reaction", "banter"],
                    weights=[0.35, 0.40, 0.25],
                    k=1
                )[0]

                username = random.choice(SIMULATED_USERS)
                text = random.choice(SIMULATED_MESSAGES[category])

                msg_data = self.normalize_message(
                    username=username,
                    message=text,
                    user_id=f"sim_{username.lower()}",
                    raw_event={"category": category}
                )
                self.total_generated += 1
                await self._dispatch_and_broadcast(msg_data)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Mock Stream Simulator loop: {e}")
                await asyncio.sleep(1)

    async def _dispatch_and_broadcast(self, msg_data: Dict[str, Any]) -> None:
        """Dispatch message to pipeline callback and broadcast via WebSocket."""
        # 1. Trigger internal callback (AI pipeline)
        await self._dispatch_message(msg_data)

        # 2. Trigger AI Engine processing for non-bot chat messages
        if not msg_data.get("is_bot"):
            asyncio.create_task(self._process_message_with_ai(msg_data))

        # 3. Broadcast live event to WebSocket clients
        if self._ws_broadcaster:
            await self._ws_broadcaster.broadcast({
                "type": "chat_message",
                "message": msg_data.get("message"),
                "username": msg_data.get("username"),
                "isAiResponse": False,
                "isFiltered": False,
                "timestamp": msg_data.get("timestamp"),
                "data": msg_data,
            })

    async def _process_message_with_ai(self, msg_data: Dict[str, Any]):
        """Process non-bot chat message through the 2-Stage AI Engine Pipeline."""
        try:
            from app.core.database import AsyncSessionLocal
            from app.services.ai_engine import ai_engine_pipeline
            async with AsyncSessionLocal() as session:
                await ai_engine_pipeline.process_chat_message(
                    db=session,
                    platform=msg_data.get("platform", "simulator"),
                    username=msg_data.get("username", "viewer"),
                    user_message=msg_data.get("message", ""),
                    channel_id=msg_data.get("channel_id", self.channel_id)
                )
        except Exception as e:
            logger.error(f"Error in mock simulator AI processing task: {e}")

