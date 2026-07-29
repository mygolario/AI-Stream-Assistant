"""
YouTube Live Chat connector (poll-based).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import httpx

from app.connectors.base import AbstractChatConnector

logger = logging.getLogger(__name__)


class YouTubeChatConnector(AbstractChatConnector):
    def __init__(
        self,
        channel_id: str,
        live_chat_id: str = "",
        api_key: str = "",
        oauth_token: str = "",
        poll_interval: float = 5.0,
    ):
        super().__init__(platform_name="youtube", channel_id=channel_id)
        self.live_chat_id = live_chat_id or channel_id
        self.api_key = api_key
        self.oauth_token = oauth_token
        self.poll_interval = poll_interval
        self._page_token: Optional[str] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._seen_ids: set[str] = set()

    async def connect(self) -> bool:
        if self._is_connected:
            return True
        if not self.live_chat_id:
            logger.error("YouTube live_chat_id missing")
            return False
        self._is_connected = True
        self._listen_task = asyncio.create_task(self._poll_loop())
        logger.info("YouTube chat connector started for %s", self.live_chat_id)
        return True

    async def disconnect(self) -> None:
        self._is_connected = False
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
        logger.info("YouTube chat connector stopped")

    async def send_message(self, message: str) -> bool:
        logger.info("[YouTube Bot Send] %s -> %s", self.live_chat_id, message)
        if not self.oauth_token:
            return True  # log-only when no token
        url = "https://www.googleapis.com/youtube/v3/liveChat/messages"
        params = {"part": "snippet"}
        body = {
            "snippet": {
                "liveChatId": self.live_chat_id,
                "type": "textMessageEvent",
                "textMessageDetails": {"messageText": message[:200]},
            }
        }
        headers = {"Authorization": f"Bearer {self.oauth_token}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, params=params, json=body, headers=headers)
                return res.status_code in (200, 201)
        except Exception as e:
            logger.error("YouTube send failed: %s", e)
            return False

    async def _poll_loop(self) -> None:
        while self._is_connected:
            try:
                await self._fetch_page()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("YouTube poll error: %s", e)
            await asyncio.sleep(self.poll_interval)

    async def _fetch_page(self) -> None:
        if not self.api_key and not self.oauth_token:
            return
        params = {
            "liveChatId": self.live_chat_id,
            "part": "snippet,authorDetails",
            "maxResults": 50,
        }
        if self._page_token:
            params["pageToken"] = self._page_token
        headers = {}
        if self.oauth_token:
            headers["Authorization"] = f"Bearer {self.oauth_token}"
        else:
            params["key"] = self.api_key

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://www.googleapis.com/youtube/v3/liveChat/messages",
                params=params,
                headers=headers,
            )
            if res.status_code != 200:
                logger.warning("YouTube poll HTTP %s: %s", res.status_code, res.text[:200])
                return
            data = res.json()
            self._page_token = data.get("nextPageToken")
            for item in data.get("items", []):
                msg_id = item.get("id")
                if not msg_id or msg_id in self._seen_ids:
                    continue
                self._seen_ids.add(msg_id)
                snippet = item.get("snippet", {})
                author = item.get("authorDetails", {})
                text = snippet.get("displayMessage") or snippet.get("textMessageDetails", {}).get("messageText", "")
                if not text:
                    continue
                normalized = self.normalize_message(
                    username=author.get("displayName", "YouTubeUser"),
                    message=text,
                    user_id=author.get("channelId", ""),
                    raw_event=item,
                    is_bot=bool(author.get("isChatOwner") and "bot" in (author.get("displayName") or "").lower()),
                )
                await self._dispatch_message(normalized)
