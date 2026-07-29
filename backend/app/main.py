"""
backend/app/main.py
Main FastAPI application entry point with lifespan initialization and router registration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import init_db_extensions, get_db
from app.core.redis import redis_helper
from app.connectors.manager import connector_manager
from app.api.websocket import ws_manager, router as ws_router

# Import V1 API Routers
from app.api.v1.health import router as health_router
from app.api.v1.simulator import router as simulator_router
from app.api.v1.knowledge_base import router as kb_router
from app.api.v1.personas import router as personas_router
from app.api.v1.settings import router as settings_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Starting {settings.PROJECT_NAME} backend...")
    try:
        await init_db_extensions()
        print("pgvector database extension initialized.")
    except Exception as e:
        print(f"Warning: DB initialization error: {e}")

    try:
        await redis_helper.connect()
        print("Redis client connected.")
    except Exception as e:
        print(f"Warning: Redis connection error: {e}")

    # Attach WebSocket broadcaster to Mock Simulator
    connector_manager.simulator.set_broadcaster(ws_manager)
    print("Mock Stream Simulator initialized with WebSocket broadcaster.")

    yield

    # Shutdown
    print("Shutting down backend services...")
    await connector_manager.shutdown_all()
    await redis_helper.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def root_health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint to verify API, PostgreSQL pgvector, and Redis status."""
    db_ok = False
    redis_ok = False

    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            db_ok = True
    except Exception:
        db_ok = False

    try:
        if redis_helper.redis and await redis_helper.redis.ping():
            redis_ok = True
    except Exception:
        redis_ok = False

    return {
        "status": "online" if (db_ok and redis_ok) else "degraded",
        "database": "connected" if db_ok else "error",
        "redis": "connected" if redis_ok else "error",
        "version": "1.0.0"
    }


# Include V1 Routers
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(simulator_router, prefix=f"{settings.API_V1_STR}/simulator", tags=["Simulator"])
app.include_router(kb_router, prefix=f"{settings.API_V1_STR}/knowledge-base", tags=["Knowledge Base"])
app.include_router(personas_router, prefix=f"{settings.API_V1_STR}/personas", tags=["Personas"])
app.include_router(settings_router, prefix=f"{settings.API_V1_STR}/settings", tags=["Settings"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(chat_router, prefix=f"{settings.API_V1_STR}/chat", tags=["Chat"])

# Include WebSocket Router
app.include_router(ws_router, tags=["WebSocket"])
