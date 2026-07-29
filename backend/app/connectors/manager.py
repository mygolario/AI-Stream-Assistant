"""
backend/app/connectors/manager.py
Manager for starting, stopping, and routing platform connectors.
"""

import logging
from typing import Dict, Optional

from app.connectors.base import AbstractChatConnector
from app.connectors.kick import KickChatConnector
from app.connectors.twitch import TwitchChatConnector
from app.connectors.youtube import YouTubeChatConnector
from app.connectors.mock_simulator import MockStreamSimulator

logger = logging.getLogger(__name__)


class ConnectorManager:
    def __init__(self):
        self.connectors: Dict[str, AbstractChatConnector] = {}
        self.simulator: MockStreamSimulator = MockStreamSimulator()
        self.connectors["simulator"] = self.simulator

    def get_connector(self, platform: str) -> Optional[AbstractChatConnector]:
        return self.connectors.get(platform.lower())

    async def setup_kick(
        self, channel_id: str, chatroom_id: Optional[str] = None, bot_token: str = ""
    ) -> KickChatConnector:
        if "kick" in self.connectors:
            await self.connectors["kick"].disconnect()
        kick_conn = KickChatConnector(
            channel_id=channel_id, chatroom_id=chatroom_id, bot_token=bot_token
        )
        self.connectors["kick"] = kick_conn
        return kick_conn

    async def setup_twitch(
        self, channel_id: str, client_id: str = "", oauth_token: str = ""
    ) -> TwitchChatConnector:
        if "twitch" in self.connectors:
            await self.connectors["twitch"].disconnect()
        twitch_conn = TwitchChatConnector(
            channel_id=channel_id, client_id=client_id, oauth_token=oauth_token
        )
        self.connectors["twitch"] = twitch_conn
        return twitch_conn

    async def setup_youtube(
        self,
        channel_id: str,
        live_chat_id: str = "",
        api_key: str = "",
        oauth_token: str = "",
    ) -> YouTubeChatConnector:
        if "youtube" in self.connectors:
            await self.connectors["youtube"].disconnect()
        yt = YouTubeChatConnector(
            channel_id=channel_id,
            live_chat_id=live_chat_id,
            api_key=api_key,
            oauth_token=oauth_token,
        )
        self.connectors["youtube"] = yt
        return yt

    async def shutdown_all(self):
        for name, connector in self.connectors.items():
            try:
                await connector.disconnect()
            except Exception as e:
                logger.error("Error shutting down connector %s: %s", name, e)


connector_manager = ConnectorManager()
