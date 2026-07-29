"""
backend/app/connectors/kick.py
Kick chat connector supporting Pusher WebSocket events and Webhook payloads.
"""

import asyncio
import json
import logging
import websockets
from typing import Dict, Any, Optional
import httpx

from app.connectors.base import AbstractChatConnector

logger = logging.getLogger(__name__)

KICK_PUSHER_WS_URL = "wss://ws-us2.pusher.com/app/eb1d5f28608d4dbd97f9?protocol=7&client=js&version=7.4.0&flash=false"


class KickChatConnector(AbstractChatConnector):
    """
    Kick Chat Connector using Pusher WebSocket connection.
    Subscribes to channel chatroom events and parses ChatMessageEvent payloads.
    """

    def __init__(self, channel_id: str, chatroom_id: Optional[str] = None, bot_token: str = ""):
        super().__init__(platform_name="kick", channel_id=channel_id)
        self.chatroom_id = chatroom_id or channel_id
        self.bot_token = bot_token
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        if self._is_connected:
            return True

        try:
            logger.info(f"Connecting to Kick Pusher WS for channel {self.channel_id} (chatroom: {self.chatroom_id})...")
            self._ws = await websockets.connect(KICK_PUSHER_WS_URL, ping_interval=30, ping_timeout=10)
            self._is_connected = True

            # Subscribe to Kick chatroom channel
            subscribe_payload = {
                "event": "pusher:subscribe",
                "data": {
                    "auth": "",
                    "channel": f"chatrooms.{self.chatroom_id}.v2"
                }
            }
            await self._ws.send(json.dumps(subscribe_payload))

            # Start listening loop
            self._listen_task = asyncio.create_task(self._listen_loop())
            logger.info(f"Successfully connected to Kick chat for channel {self.channel_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Kick chat: {e}")
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
        logger.info(f"Disconnected Kick chat connector for channel {self.channel_id}")

    async def send_message(self, message: str) -> bool:
        """Send message to Kick chat via public API when bot token is configured."""
        logger.info(f"[Kick Bot Send] Channel: {self.channel_id} -> {message}")
        if not self.bot_token:
            logger.warning("Kick bot token missing; message logged only")
            return True
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.bot_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                # Kick chat send endpoints evolve; try public v2 then legacy path
                payloads = [
                    ("https://kick.com/api/v2/messages/send/" + str(self.chatroom_id), {"content": message, "type": "message"}),
                    ("https://api.kick.com/public/v1/chat", {"content": message, "broadcaster_user_id": int(self.channel_id) if str(self.channel_id).isdigit() else self.channel_id}),
                ]
                for url, body in payloads:
                    res = await client.post(url, json=body, headers=headers)
                    if res.status_code in (200, 201):
                        return True
                    logger.warning("Kick send attempt %s -> HTTP %s", url, res.status_code)
        except Exception as e:
            logger.error("Kick send_message failed: %s", e)
            return False
        return False

    async def _listen_loop(self) -> None:
        """Listen loop for incoming Pusher WebSocket messages."""
        while self._is_connected and self._ws:
            try:
                raw_msg = await self._ws.recv()
                data = json.loads(raw_msg)
                event_name = data.get("event")

                if event_name == "App\\Events\\ChatMessageEvent":
                    event_data = json.loads(data.get("data", "{}"))
                    sender = event_data.get("sender", {})
                    username = sender.get("username", "Unknown")
                    user_id = str(sender.get("id", ""))
                    content = event_data.get("content", "")

                    is_bot = False
                    identity = sender.get("identity", {})
                    badges = identity.get("badges", []) if isinstance(identity, dict) else []
                    if badges and isinstance(badges, list) and len(badges) > 0:
                        is_bot = badges[0].get("type") == "bot"

                    normalized = self.normalize_message(
                        username=username,
                        message=content,
                        user_id=user_id,
                        raw_event=event_data,
                        is_bot=is_bot
                    )
                    await self._dispatch_message(normalized)

                elif event_name == "pusher:ping":
                    await self._ws.send(json.dumps({"event": "pusher:pong", "data": {}}))

            except websockets.exceptions.ConnectionClosed:
                logger.warning("Kick WebSocket connection closed. Attempting reconnect...")
                self._is_connected = False
                await asyncio.sleep(5)
                if not self._is_connected:
                    await self.connect()
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error reading Kick WebSocket frame: {e}")
                await asyncio.sleep(1)

    async def parse_webhook_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse Kick HTTP webhook payload fallback.
        """
        event_type = payload.get("event")
        if event_type == "chat.message":
            sender = payload.get("data", {}).get("sender", {})
            normalized = self.normalize_message(
                username=sender.get("username", "Unknown"),
                message=payload.get("data", {}).get("content", ""),
                user_id=str(sender.get("id", "")),
                raw_event=payload
            )
            return normalized
        return None
