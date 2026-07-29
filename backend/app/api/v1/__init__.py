"""
API v1 Package.
"""
from app.api.v1.health import router as health_router
from app.api.v1.simulator import router as simulator_router
from app.api.v1.knowledge_base import router as kb_router
from app.api.v1.personas import router as personas_router
from app.api.v1.settings import router as settings_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.chat import router as chat_router

__all__ = [
    "health_router",
    "simulator_router",
    "kb_router",
    "personas_router",
    "settings_router",
    "analytics_router",
    "chat_router",
]
