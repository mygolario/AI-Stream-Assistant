from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.config import settings


class StreamerSettingsBase(BaseModel):
    openrouter_api_key: Optional[str] = Field(default="")
    selected_model: str = Field(default=settings.DEFAULT_OPENROUTER_MODEL)
    active_persona_id: Optional[int] = Field(default=None)
    custom_prompt_override: Optional[str] = Field(default="")
    kick_channel_id: Optional[str] = Field(default="")
    twitch_channel_id: Optional[str] = Field(default="")
    youtube_channel_id: Optional[str] = Field(default="")
    kick_bot_token: Optional[str] = Field(default=None)
    twitch_bot_token: Optional[str] = Field(default=None)
    youtube_bot_token: Optional[str] = Field(default=None)
    bot_muted: Optional[bool] = Field(default=False)
    general_knowledge_enabled: Optional[bool] = Field(default=False)
    max_replies_per_minute: Optional[int] = Field(default=10)
    mention_only: Optional[bool] = Field(default=False)


class StreamerSettingsUpdate(StreamerSettingsBase):
    pass


class StreamerSettingsResponse(BaseModel):
    id: int
    openrouter_api_key: Optional[str] = ""
    selected_model: str
    active_persona_id: Optional[int] = None
    custom_prompt_override: Optional[str] = ""
    kick_channel_id: Optional[str] = ""
    twitch_channel_id: Optional[str] = ""
    youtube_channel_id: Optional[str] = ""
    bot_muted: bool = False
    general_knowledge_enabled: bool = False
    max_replies_per_minute: int = 10
    mention_only: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestApiKeyRequest(BaseModel):
    api_key: str = Field(..., examples=["sk-or-v1-..."])


class TestApiKeyResponse(BaseModel):
    valid: bool
    message: str
