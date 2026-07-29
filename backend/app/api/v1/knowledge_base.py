"""
backend/app/api/v1/knowledge_base.py
CRUD Endpoints for Knowledge Base management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.core.database import get_db
from app.models.knowledge_base import KnowledgeBaseItem
from app.schemas.knowledge_base import (
    KBItemCreate,
    KBItemUpdate,
    KBItemResponse
)

from app.services.rag import rag_service

router = APIRouter()


@router.get("", response_model=List[KBItemResponse])
async def list_kb_items(
    category: Optional[str] = Query(None, description="Filter by category (faq, pc_specs, links, doc)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Optional[AsyncSession] = Depends(get_db)
):
    """List all Knowledge Base items with optional category filtering."""
    if db is None:
        return []
    query = select(KnowledgeBaseItem)
    if category:
        query = query.where(KnowledgeBaseItem.category == category)
    query = query.offset(skip).limit(limit).order_by(KnowledgeBaseItem.id.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=KBItemResponse, status_code=status.HTTP_201_CREATED)
async def create_kb_item(
    item_in: KBItemCreate,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Create a new Knowledge Base item and auto-generate vector embedding."""
    if db is None:
        raise HTTPException(status_code=503, detail="Knowledge base writes require Postgres storage")
    db_item = KnowledgeBaseItem(
        title=item_in.title,
        category=item_in.category,
        content=item_in.content
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    # Auto-generate embedding for RAG search
    await rag_service.embed_and_save_item(db, db_item.id)
    return db_item


@router.get("/{item_id}", response_model=KBItemResponse)
async def get_kb_item(
    item_id: int,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Get specific Knowledge Base item by ID."""
    if db is None:
        raise HTTPException(status_code=503, detail="Knowledge base requires Postgres storage")
    item = await db.get(KnowledgeBaseItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge base item not found")
    return item


@router.put("/{item_id}", response_model=KBItemResponse)
async def update_kb_item(
    item_id: int,
    item_in: KBItemUpdate,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Update Knowledge Base item and re-generate embedding."""
    if db is None:
        raise HTTPException(status_code=503, detail="Knowledge base writes require Postgres storage")
    item = await db.get(KnowledgeBaseItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge base item not found")

    if item_in.title is not None:
        item.title = item_in.title
    if item_in.category is not None:
        item.category = item_in.category
    if item_in.content is not None:
        item.content = item_in.content

    await db.commit()
    await db.refresh(item)

    # Re-generate embedding
    await rag_service.embed_and_save_item(db, item.id)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb_item(
    item_id: int,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Delete Knowledge Base item."""
    if db is None:
        raise HTTPException(status_code=503, detail="Knowledge base writes require Postgres storage")
    item = await db.get(KnowledgeBaseItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge base item not found")

    await db.delete(item)
    await db.commit()
    return None
