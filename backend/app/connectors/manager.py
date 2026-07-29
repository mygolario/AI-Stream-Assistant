"""
backend/app/connectors/manager.py
Manager for starting, stopping, and routing platform connectors.
"""

import logging
from typing import Dict, Optional, Any
from app.connectors.base import AbstractChatConnector
from app.connectors.kick import KickChatConnector
from app.connectors.twitch import TwitchChatConnector
from app.connectors.mock_simulator import MockStreamSimulator

logger = logging.getLogger(__name__)


class ConnectorManager:
    """
    Central Manager for platform connectors and Mock Simulator.
    """

    def __init__(self):
        self.connectors: Dict[str, AbstractChatConnector] = {}
        self.simulator: MockStreamSimulator = MockStreamSimulator()
        self.connectors["simulator"] = self.simulator

    def get_connector(self, platform: str) -> Optional[AbstractChatConnector]:
        return self.connectors.get(platform.lower())

    async def setup_kick(self, channel_id: str, chatroom_id: Optional[str] = None) -> KickChatConnector:
        if "kick" in self.connectors:
            await self.connectors["kick"].disconnect()
        kick_conn = KickChatConnector(channel_id=channel_id, chatroom_id=chatroom_id)
        self.connectors["kick"] = kick_conn
        return kick_conn

    async def setup_twitch(self, channel_id: str, client_id: str = "", oauth_token: str = "") -> TwitchChatConnector:
        if "twitch" in self.connectors:
            await self.connectors["twitch"].disconnect()
        twitch_conn = TwitchChatConnector(channel_id=channel_id, client_id=client_id, oauth_token=oauth_token)
        self.connectors["twitch"] = twitch_conn
        return twitch_conn

    async def shutdown_all(self):
        for name, connector in self.connectors.items():
            try:
                await connector.disconnect()
            except Exception as e:
                logger.error(f"Error shutting down connector {name}: {e}")


connector_manager = ConnectorManager()
