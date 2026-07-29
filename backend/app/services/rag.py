"""
backend/app/services/rag.py
RAG Service: Text chunker, vector embedding generator (with offline fallback),
and pgvector vector similarity search over KnowledgeBaseItem.
"""

import math
import zlib
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.knowledge_base import KnowledgeBaseItem

logger = logging.getLogger(__name__)


class RAGService:
    """
    Knowledge Base RAG Service for chunking, vector generation, and pgvector retrieval.
    """

    def __init__(self, vector_dim: int = settings.VECTOR_DIMENSION):
        self.vector_dim = vector_dim

    def chunk_text(self, text_content: str, max_chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split long text into overlapping chunks based on sentence/word boundaries.
        """
        if not text_content or len(text_content) <= max_chunk_size:
            return [text_content] if text_content else []

        paragraphs = text_content.split("\n\n")
        chunks = []
        current_chunk = ""

        for p in paragraphs:
            if len(current_chunk) + len(p) <= max_chunk_size:
                current_chunk += ("\n\n" if current_chunk else "") + p
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # Handle paragraph larger than max_chunk_size
                if len(p) > max_chunk_size:
                    words = p.split(" ")
                    sub_chunk = ""
                    for word in words:
                        if len(sub_chunk) + len(word) + 1 <= max_chunk_size:
                            sub_chunk += (" " if sub_chunk else "") + word
                        else:
                            chunks.append(sub_chunk)
                            # Apply overlap
                            overlap_words = sub_chunk.split(" ")[-max(1, overlap // 10):]
                            sub_chunk = " ".join(overlap_words) + " " + word
                    if sub_chunk:
                        current_chunk = sub_chunk
                else:
                    current_chunk = p

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def generate_fallback_embedding(self, text_content: str) -> List[float]:
        """
        Generate a deterministic 1536-dimensional L2-normalized float vector
        using word n-gram feature hashing for offline testing and fallback mode.
        """
        vec = [0.0] * self.vector_dim
        words = text_content.lower().split()

        if not words:
            return vec

        # Unigrams and Bigrams hashing
        tokens = words + [f"{words[i]}_{words[i+1]}" for i in range(len(words)-1)]

        for token in tokens:
            crc = zlib.crc32(token.encode('utf-8'))
            idx = crc % self.vector_dim
            sign = 1.0 if (crc & 1) else -1.0
            vec[idx] += sign

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]

        return vec

    async def generate_embedding(self, text_content: str, api_key: Optional[str] = None) -> List[float]:
        """
        Generate embedding vector for input text. Uses OpenRouter/API if key is available,
        else falls back to deterministic feature hashing embedder.
        """
        effective_key = api_key or settings.OPENROUTER_API_KEY
        if not effective_key:
            return self.generate_fallback_embedding(text_content)

        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/embeddings",
                    headers={"Authorization": f"Bearer {effective_key}"},
                    json={"input": text_content, "model": "text-embedding-3-small"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    embedding_data = data["data"][0]["embedding"]
                    if len(embedding_data) == self.vector_dim:
                        return embedding_data
        except Exception as e:
            logger.debug(f"Online embedding call failed, falling back to feature hash: {e}")

        return self.generate_fallback_embedding(text_content)

    async def embed_and_save_item(self, db: AsyncSession, item_id: int) -> Optional[KnowledgeBaseItem]:
        """
        Generate vector embedding for a KnowledgeBaseItem and update DB record.
        """
        item = await db.get(KnowledgeBaseItem, item_id)
        if not item:
            return None

        combined_text = f"Title: {item.title}\nCategory: {item.category}\nContent: {item.content}"
        vector = await self.generate_embedding(combined_text)
        item.embedding = vector

        await db.commit()
        await db.refresh(item)
        return item

    async def search_similar_items(
        self,
        db: AsyncSession,
        query_text: str,
        top_k: int = 3,
        min_similarity: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Query pgvector index (or in-memory vector math fallback) for top-K similar KnowledgeBaseItem records.
        """
        query_vec = await self.generate_embedding(query_text)

        # Attempt pgvector SQL query execution
        try:
            query = (
                select(
                    KnowledgeBaseItem,
                    KnowledgeBaseItem.embedding.cosine_distance(query_vec).label("distance")
                )
                .where(KnowledgeBaseItem.embedding.isnot(None))
                .order_by("distance")
                .limit(top_k)
            )

            result = await db.execute(query)
            rows = result.all()

            matching_items = []
            for item, distance in rows:
                dist_val = float(distance or 0.0)
                similarity = 1.0 - dist_val
                matching_items.append({
                    "id": item.id,
                    "title": item.title,
                    "category": item.category,
                    "content": item.content,
                    "similarity_score": round(similarity, 4),
                    "distance": round(dist_val, 4)
                })

            return matching_items

        except Exception as e:
            logger.debug(f"pgvector query failed or non-Postgres DB used, using in-memory cosine fallback: {e}")
            return await self._in_memory_similarity_search(db, query_vec, top_k)

    async def _in_memory_similarity_search(
        self,
        db: AsyncSession,
        query_vec: List[float],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """In-memory cosine similarity fallback for non-pgvector database environments."""
        all_items_query = select(KnowledgeBaseItem).where(KnowledgeBaseItem.embedding.isnot(None))
        res = await db.execute(all_items_query)
        all_items = res.scalars().all()

        if not all_items:
            return []

        norm_q = math.sqrt(sum(a * a for a in query_vec))

        scored_items = []
        for item in all_items:
            if not item.embedding:
                continue
            item_vec = item.embedding
            norm_i = math.sqrt(sum(b * b for b in item_vec))

            if norm_q > 0 and norm_i > 0:
                dot = sum(a * b for a, b in zip(query_vec, item_vec))
                sim = float(dot / (norm_q * norm_i))
            else:
                sim = 0.0

            dist = max(0.0, 1.0 - sim)
            scored_items.append((item, dist, sim))

        scored_items.sort(key=lambda x: x[1])  # Ascending order of distance

        results = []
        for item, dist, sim in scored_items[:top_k]:
            results.append({
                "id": item.id,
                "title": item.title,
                "category": item.category,
                "content": item.content,
                "similarity_score": round(sim, 4),
                "distance": round(dist, 4)
            })

        return results


rag_service = RAGService()
