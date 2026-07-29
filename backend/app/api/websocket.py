"""
backend/app/api/websocket.py
WebSocket endpoint router and connection manager for live chat broadcasting.
"""

import json
import logging
from typing import Set, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """
    WebSocket Connection Manager for multi-client event broadcasting.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"New WebSocket client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active clients: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send JSON message to specific client connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal WS message: {e}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast JSON message payload to all connected clients."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        disconnected_clients = set()

        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client, removing connection: {e}")
                disconnected_clients.add(connection)

        for dead_client in disconnected_clients:
            self.disconnect(dead_client)


ws_manager = ConnectionManager()


@router.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint. Optional JWT via ?token= for dashboard clients.
    """
    token = websocket.query_params.get("token")
    if token:
        from app.core.security import decode_access_token

        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=4401)
            return

    await ws_manager.connect(websocket)

    # Send initial welcome notice
    await ws_manager.send_personal_message(
        {
            "type": "system_notice",
            "message": "Connected to AI Stream Assistant WebSocket endpoint",
            "status": "ready"
        },
        websocket
    )

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type")

                if msg_type == "ping":
                    await ws_manager.send_personal_message({"type": "pong"}, websocket)
                elif msg_type in ["client_message", "chat_message"]:
                    user_msg = data.get("message", "")
                    user_name = data.get("username", "ws_user")
                    platform_name = data.get("platform", "websocket")
                    channel = data.get("channel_id", "default")

                    if user_msg:
                        from app.core.database import AsyncSessionLocal
                        from app.services.ai_engine import ai_engine_pipeline
                        async with AsyncSessionLocal() as session:
                            result = await ai_engine_pipeline.process_chat_message(
                                db=session,
                                platform=platform_name,
                                username=user_name,
                                user_message=user_msg,
                                channel_id=channel
                            )
                            await ws_manager.send_personal_message(
                                {
                                    "type": "message_ack",
                                    "status": result.status,
                                    "was_filtered": result.was_filtered,
                                    "ai_response": result.ai_response
                                },
                                websocket
                            )
            except json.JSONDecodeError:
                await ws_manager.send_personal_message({"type": "error", "message": "Invalid JSON"}, websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
