import json
import redis.asyncio as aioredis
from typing import List, Dict, Any, Optional
from app.core.config import settings


class RedisMemoryHelper:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.async_redis_url
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Establish Redis connection."""
        if not self.redis:
            self.redis = await aioredis.from_url(self.redis_url, decode_responses=True)

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            self.redis = None

    def _get_key(self, channel_id: str, username: str) -> str:
        return f"chat_history:{channel_id}:{username}"

    async def add_chat_turn(
        self,
        channel_id: str,
        username: str,
        user_message: str,
        bot_response: Optional[str] = None,
        max_turns: int = 10,
        ttl_seconds: int = 3600
    ):
        """Store user message and optional bot response in sliding window."""
        if not self.redis:
            await self.connect()

        key = self._get_key(channel_id, username)

        # Format item
        item = {
            "user": user_message,
            "assistant": bot_response
        }

        await self.redis.rpush(key, json.dumps(item))
        await self.redis.ltrim(key, -max_turns, -1)
        await self.redis.expire(key, ttl_seconds)

    async def get_chat_history(
        self,
        channel_id: str,
        username: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve recent chat turns for a specific user."""
        if not self.redis:
            await self.connect()

        key = self._get_key(channel_id, username)
        raw_items = await self.redis.lrange(key, -limit, -1)

        history = []
        for raw in raw_items:
            try:
                history.append(json.loads(raw))
            except Exception:
                continue
        return history

    async def clear_chat_history(self, channel_id: str, username: str):
        """Clear conversation history for a specific user."""
        if not self.redis:
            await self.connect()

        key = self._get_key(channel_id, username)
        await self.redis.delete(key)


redis_helper = RedisMemoryHelper()
