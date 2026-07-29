"""
backend/app/main.py
Main FastAPI application entry point.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import init_db_extensions, get_db
from app.core.redis import redis_helper
from app.connectors.manager import connector_manager
from app.api.websocket import ws_manager, router as ws_router

from app.api.v1.health import router as health_router
from app.api.v1.simulator import router as simulator_router
from app.api.v1.knowledge_base import router as kb_router
from app.api.v1.personas import router as personas_router
from app.api.v1.settings import router as settings_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.chat import router as chat_router
from app.api.v1.auth import router as auth_router
from app.api.v1.connectors import router as connectors_router
from app.api.v1.billing import router as billing_router
from app.api.v1.agency import router as agency_router
from app.api.v1.overlay import router as overlay_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s backend (postgres_enabled=%s)...",
        settings.PROJECT_NAME,
        settings.postgres_enabled,
    )
    if settings.postgres_enabled:
        try:
            await init_db_extensions()
            # Ensure tables exist on fresh serverless databases
            from app.models import (  # noqa: F401
                User,
                Organization,
                OrganizationMember,
                WorkspaceChannel,
                StreamerSettings,
                KnowledgeBaseItem,
                Persona,
                AnalyticsLog,
                ChatMessage,
            )
            from app.core.database import Base, engine

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("pgvector + schema ready.")
        except Exception as e:
            logger.warning("DB initialization error: %s", e)
    else:
        logger.info("Skipping Postgres init (using Supabase auth fallback).")

    try:
        await redis_helper.connect()
        logger.info("Redis client connected.")
    except Exception as e:
        logger.warning("Redis connection error: %s", e)

    connector_manager.simulator.set_broadcaster(ws_manager)
    logger.info("Mock Stream Simulator initialized with WebSocket broadcaster.")

    # Start background job worker loop (embeddings / retries) only when Redis is up
    from app.services.jobs import job_worker
    from app.core.redis import redis_helper as _rh

    try:
        if _rh.redis:
            await job_worker.start()
        else:
            logger.info("Job worker skipped (Redis unavailable).")
    except Exception as e:
        logger.warning("Job worker start skipped: %s", e)

    yield

    logger.info("Shutting down backend services...")
    try:
        await job_worker.stop()
    except Exception:
        pass
    await connector_manager.shutdown_all()
    await redis_helper.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + [settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def root_health_check(db: AsyncSession | None = Depends(get_db)):
    db_ok = False
    redis_ok = False
    if db is not None:
        try:
            res = await db.execute(text("SELECT 1"))
            if res.scalar() == 1:
                db_ok = True
        except Exception:
            db_ok = False
    elif settings.SUPABASE_URL:
        db_ok = True  # auth fallback configured; no direct Postgres
    try:
        if redis_helper.redis and await redis_helper.redis.ping():
            redis_ok = True
    except Exception:
        redis_ok = False
    return {
        "status": "online" if db_ok else "degraded",
        "database": "connected" if db_ok else ("supabase" if not settings.postgres_enabled else "error"),
        "redis": "connected" if redis_ok else "error",
        "version": "1.1.0",
        "model": settings.DEFAULT_OPENROUTER_MODEL,
        "postgres_enabled": settings.postgres_enabled,
    }


app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(simulator_router, prefix=f"{settings.API_V1_STR}/simulator", tags=["Simulator"])
app.include_router(kb_router, prefix=f"{settings.API_V1_STR}/knowledge-base", tags=["Knowledge Base"])
app.include_router(personas_router, prefix=f"{settings.API_V1_STR}/personas", tags=["Personas"])
app.include_router(settings_router, prefix=f"{settings.API_V1_STR}/settings", tags=["Settings"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(chat_router, prefix=f"{settings.API_V1_STR}/chat", tags=["Chat"])
app.include_router(connectors_router, prefix=f"{settings.API_V1_STR}/connectors", tags=["Connectors"])
app.include_router(billing_router, prefix=f"{settings.API_V1_STR}/billing", tags=["Billing"])
app.include_router(agency_router, prefix=f"{settings.API_V1_STR}/agency", tags=["Agency"])
app.include_router(overlay_router, prefix=f"{settings.API_V1_STR}/overlay", tags=["Overlay"])
app.include_router(ws_router, tags=["WebSocket"])
