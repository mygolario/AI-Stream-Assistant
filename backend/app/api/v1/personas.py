"""
backend/app/api/v1/personas.py
Endpoints for managing AI stream bot personas.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.persona import Persona
from app.models.settings import StreamerSettings
from app.schemas.persona import (
    PersonaCreate,
    PersonaUpdate,
    PersonaResponse
)

router = APIRouter()

# Default Built-in Presets
DEFAULT_PRESETS = [
    {
        "name": "Hype Assistant",
        "system_prompt": "You are a hyper-energetic streaming assistant! Express immense hype, use gaming slang (POG, GG, W), keep answers short (1-2 sentences), and answer chatter questions enthusiastically.",
        "temperature": 0.8,
        "is_preset": True
    },
    {
        "name": "Informative Mod",
        "system_prompt": "You are a polite, helpful chat moderator. Answer questions accurately based on stream knowledge base. Keep responses concise, objective, and friendly.",
        "temperature": 0.3,
        "is_preset": True
    },
    {
        "name": "Sarcastic Gamer",
        "system_prompt": "You are a witty, mildly sarcastic gamer assistant. Give playful banter while still providing correct info. Keep answers brief.",
        "temperature": 0.7,
        "is_preset": True
    }
]


@router.get("", response_model=List[PersonaResponse])
async def list_personas(db: Optional[AsyncSession] = Depends(get_db)):
    """List all available personas (presets + custom)."""
    if db is None:
        now = datetime.now(timezone.utc)
        return [
            PersonaResponse(
                id=i + 1,
                name=p["name"],
                system_prompt=p["system_prompt"],
                temperature=p["temperature"],
                is_preset=True,
                created_at=now,
            )
            for i, p in enumerate(DEFAULT_PRESETS)
        ]

    result = await db.execute(select(Persona).order_by(Persona.id))
    personas = result.scalars().all()

    # Seed presets if table is empty
    if not personas:
        for preset_data in DEFAULT_PRESETS:
            p = Persona(**preset_data)
            db.add(p)
        await db.commit()
        result = await db.execute(select(Persona).order_by(Persona.id))
        personas = result.scalars().all()

    return personas


@router.get("/presets", response_model=List[PersonaResponse])
async def list_preset_personas(db: Optional[AsyncSession] = Depends(get_db)):
    """List only preset personas."""
    if db is None:
        return await list_personas(db=None)
    result = await db.execute(select(Persona).where(Persona.is_preset == True))  # noqa: E712
    return result.scalars().all()


@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    persona_in: PersonaCreate,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Create a new custom persona."""
    if db is None:
        raise HTTPException(status_code=503, detail="Custom personas require Postgres storage")
    persona = Persona(
        name=persona_in.name,
        system_prompt=persona_in.system_prompt,
        temperature=persona_in.temperature,
        is_preset=False
    )
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return persona


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: int, db: Optional[AsyncSession] = Depends(get_db)):
    """Get persona details by ID."""
    if db is None:
        presets = await list_personas(db=None)
        for p in presets:
            if p.id == persona_id:
                return p
        raise HTTPException(status_code=404, detail="Persona not found")
    persona = await db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: int,
    persona_in: PersonaUpdate,
    db: Optional[AsyncSession] = Depends(get_db)
):
    """Update custom persona (presets cannot be overwritten)."""
    if db is None:
        raise HTTPException(status_code=503, detail="Persona updates require Postgres storage")
    persona = await db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    if persona.is_preset:
        raise HTTPException(status_code=400, detail="Cannot modify built-in preset persona")

    if persona_in.name is not None:
        persona.name = persona_in.name
    if persona_in.system_prompt is not None:
        persona.system_prompt = persona_in.system_prompt
    if persona_in.temperature is not None:
        persona.temperature = persona_in.temperature

    await db.commit()
    await db.refresh(persona)
    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(persona_id: int, db: Optional[AsyncSession] = Depends(get_db)):
    """Delete persona."""
    if db is None:
        raise HTTPException(status_code=503, detail="Persona deletes require Postgres storage")
    persona = await db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    if persona.is_preset:
        raise HTTPException(status_code=400, detail="Cannot delete built-in preset persona")

    await db.delete(persona)
    await db.commit()
    return None


@router.post("/{persona_id}/activate", response_model=PersonaResponse)
async def activate_persona(persona_id: int, db: Optional[AsyncSession] = Depends(get_db)):
    """Set active persona in streamer settings."""
    if db is None:
        presets = await list_personas(db=None)
        for p in presets:
            if p.id == persona_id:
                return p
        raise HTTPException(status_code=404, detail="Persona not found")
    persona = await db.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    result = await db.execute(select(StreamerSettings).limit(1))
    settings_obj = result.scalars().first()

    if not settings_obj:
        settings_obj = StreamerSettings(active_persona_id=persona.id)
        db.add(settings_obj)
    else:
        settings_obj.active_persona_id = persona.id

    await db.commit()
    return persona
