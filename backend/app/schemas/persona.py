from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PersonaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Hype Assistant")
    system_prompt: str = Field(..., min_length=1, example="You are an energetic streaming assistant...")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    is_preset: bool = Field(default=False)


class PersonaCreate(PersonaBase):
    pass


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None


class PersonaResponse(PersonaBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
