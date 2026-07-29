"""
backend/app/connectors/twitch.py
Twitch EventSub chat connector handling channel.chat.message events.
"""

import asyncio
import json
import logging
import websockets
from typing import Dict, Any, Optional
import httpx

from app.connectors.base import AbstractChatConnector

logger = logging.getLogger(__name__)

TWITCH_EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws"


class TwitchChatConnector(AbstractChatConnector):
    """
    Twitch EventSub Chat Connector over WebSocket.
    Listens for channel.chat.message notification events.
    """

    def __init__(self, channel_id: str, client_id: str = "", oauth_token: str = ""):
        super().__init__(platform_name="twitch", channel_id=channel_id)
        self.client_id = client_id
        self.oauth_token = oauth_token
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self.session_id: Optional[str] = None
        self._listen_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        if self._is_connected:
            return True

        try:
            logger.info(f"Connecting to Twitch EventSub WS for channel {self.channel_id}...")
            self._ws = await websockets.connect(TWITCH_EVENTSUB_WS_URL, ping_interval=20, ping_timeout=10)
            self._is_connected = True

            # Start listening loop
            self._listen_task = asyncio.create_task(self._listen_loop())
            logger.info(f"Connected to Twitch EventSub WebSocket for channel {self.channel_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Twitch EventSub: {e}")
            self._is_connected = False
            return False

    async def disconnect(self) -> None:
        self._is_connected = False
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()

        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        logger.info(f"Disconnected Twitch chat connector for channel {self.channel_id}")

    async def send_message(self, message: str) -> bool:
        """
        Send chat message to Twitch using Twitch Send Chat Message Helix API.
        """
        logger.info(f"[Twitch Bot Send] Channel: {self.channel_id} -> {message}")
        if self.client_id and self.oauth_token:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Client-Id": self.client_id,
                    "Authorization": f"Bearer {self.oauth_token.replace('oauth:', '')}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "broadcaster_id": self.channel_id,
                    "sender_id": self.channel_id,
                    "message": message
                }
                res = await client.post("https://api.twitch.tv/helix/chat/messages", json=payload, headers=headers)
                return res.status_code == 200
        return True

    async def _listen_loop(self) -> None:
        """Loop to read EventSub WebSocket frames."""
        while self._is_connected and self._ws:
            try:
                raw_msg = await self._ws.recv()
                data = json.loads(raw_msg)
                metadata = data.get("metadata", {})
                message_type = metadata.get("message_type")

                if message_type == "session_welcome":
                    self.session_id = data.get("payload", {}).get("session", {}).get("id")
                    logger.info(f"Received Twitch EventSub session_welcome ID: {self.session_id}")
                    await self._create_chat_subscription()

                elif message_type == "notification":
                    event_payload = data.get("payload", {})
                    subscription_type = event_payload.get("subscription", {}).get("type")

                    if subscription_type == "channel.chat.message":
                        event = event_payload.get("event", {})
                        chatter_name = event.get("chatter_user_name", "Unknown")
                        chatter_id = event.get("chatter_user_id", "")
                        message_text = event.get("message", {}).get("text", "")

                        normalized = self.normalize_message(
                            username=chatter_name,
                            message=message_text,
                            user_id=chatter_id,
                            raw_event=event
                        )
                        await self._dispatch_message(normalized)

                elif message_type == "session_keepalive":
                    pass

                elif message_type == "session_reconnect":
                    reconnect_url = data.get("payload", {}).get("session", {}).get("reconnect_url")
                    if reconnect_url:
                        logger.info(f"Twitch requested reconnect to {reconnect_url}")
                        self._ws = await websockets.connect(reconnect_url)

            except websockets.exceptions.ConnectionClosed:
                logger.warning("Twitch WebSocket connection closed.")
                self._is_connected = False
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Twitch EventSub listen loop: {e}")
                await asyncio.sleep(1)

    async def _create_chat_subscription(self) -> None:
        """Create channel.chat.message EventSub subscription for this session."""
        if not self.session_id or not self.client_id or not self.oauth_token:
            logger.warning("Twitch EventSub subscription skipped (missing session/credentials)")
            return
        headers = {
            "Client-Id": self.client_id,
            "Authorization": f"Bearer {self.oauth_token.replace('oauth:', '')}",
            "Content-Type": "application/json",
        }
        body = {
            "type": "channel.chat.message",
            "version": "1",
            "condition": {
                "broadcaster_user_id": str(self.channel_id),
                "user_id": str(self.channel_id),
            },
            "transport": {
                "method": "websocket",
                "session_id": self.session_id,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.twitch.tv/helix/eventsub/subscriptions",
                    headers=headers,
                    json=body,
                )
                if res.status_code in (200, 202):
                    logger.info("Twitch channel.chat.message subscription created")
                else:
                    logger.error("Twitch subscription failed HTTP %s: %s", res.status_code, res.text[:300])
        except Exception as e:
            logger.error("Twitch subscription error: %s", e)
