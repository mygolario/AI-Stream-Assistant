from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class StreamerSettingsBase(BaseModel):
    openrouter_api_key: Optional[str] = Field(default="")
    selected_model: str = Field(default="google/gemini-2.0-flash-001")
    active_persona_id: Optional[int] = Field(default=None)
    custom_prompt_override: Optional[str] = Field(default="")
    kick_channel_id: Optional[str] = Field(default="")
    twitch_channel_id: Optional[str] = Field(default="")


class StreamerSettingsUpdate(StreamerSettingsBase):
    pass


class StreamerSettingsResponse(StreamerSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestApiKeyRequest(BaseModel):
    api_key: str = Field(..., example="sk-or-v1-...")


class TestApiKeyResponse(BaseModel):
    valid: bool
    message: str
