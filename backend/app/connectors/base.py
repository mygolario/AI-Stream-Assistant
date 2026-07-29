"""
backend/app/connectors/base.py
Abstract base class for streaming chat connectors.
"""

from abc import ABC, abstractmethod
from typing import Callable, Awaitable, Dict, Any, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Standardized Chat Callback Signature
ChatCallback = Callable[[Dict[str, Any]], Awaitable[None]]


class AbstractChatConnector(ABC):
    """
    Abstract Base Class for live stream chat connectors.
    Provides unified interface for connecting, disconnecting, receiving and sending messages.
    """

    def __init__(self, platform_name: str, channel_id: str):
        self.platform_name = platform_name
        self.channel_id = channel_id
        self._is_connected: bool = False
        self._on_message_callback: Optional[ChatCallback] = None

    @property
    def is_connected(self) -> bool:
        """Return current connection status."""
        return self._is_connected

    def on_message(self, callback: ChatCallback) -> None:
        """Register asynchronous callback for incoming normalized messages."""
        self._on_message_callback = callback

    @abstractmethod
    async def connect(self) -> bool:
        """
        Establish connection to chat service (WebSocket / Webhook listener).
        Returns True if connection succeeded.
        """
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Gracefully close connection to chat service."""
        pass

    @abstractmethod
    async def send_message(self, message: str) -> bool:
        """
        Send chat message to channel on behalf of bot.
        Returns True if successfully sent.
        """
        pass

    def normalize_message(
        self,
        username: str,
        message: str,
        user_id: str = "",
        raw_event: Optional[Dict[str, Any]] = None,
        is_bot: bool = False
    ) -> Dict[str, Any]:
        """
        Standardize raw platform message into unified application schema.
        """
        return {
            "platform": self.platform_name,
            "channel_id": self.channel_id,
            "username": username,
            "user_id": user_id or username.lower(),
            "message": message.strip(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_event": raw_event or {},
            "is_bot": is_bot
        }

    async def _dispatch_message(self, message_data: Dict[str, Any]) -> None:
        """Internal helper to dispatch message to registered callback."""
        if self._on_message_callback:
            try:
                await self._on_message_callback(message_data)
            except Exception as e:
                logger.error(f"Error in on_message callback for {self.platform_name}: {e}", exc_info=True)
