"""
Simple Redis-backed background job worker (Celery alternative for launch).
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Optional

from app.core.redis import redis_helper

logger = logging.getLogger(__name__)
QUEUE_KEY = "asa:jobs"


class JobWorker:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Background job worker started")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()

    async def enqueue(self, job_type: str, payload: dict[str, Any]) -> None:
        try:
            if redis_helper.redis:
                await redis_helper.redis.rpush(
                    QUEUE_KEY, json.dumps({"type": job_type, "payload": payload})
                )
        except Exception as e:
            logger.warning("Failed to enqueue job: %s", e)

    async def _loop(self) -> None:
        while self._running:
            try:
                if not redis_helper.redis:
                    await asyncio.sleep(2)
                    continue
                item = await redis_helper.redis.blpop(QUEUE_KEY, timeout=2)
                if not item:
                    continue
                _, raw = item
                job = json.loads(raw)
                await self._handle(job.get("type"), job.get("payload") or {})
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Job worker error: %s", e)
                await asyncio.sleep(1)

    async def _handle(self, job_type: Optional[str], payload: dict) -> None:
        logger.info("Processing job %s payload_keys=%s", job_type, list(payload.keys()))
        if job_type == "reindex_embeddings":
            # Placeholder: actual reindex can be expanded later
            logger.info("Reindex requested for kb_id=%s", payload.get("kb_id"))
        elif job_type == "webhook_retry":
            logger.info("Webhook retry for %s", payload.get("url"))


job_worker = JobWorker()
