from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.config import settings


class StreamerSettings(Base):
    __tablename__ = "streamer_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    openrouter_api_key = Column(String(512), nullable=True, default="")
    selected_model = Column(String(100), nullable=False, default=settings.DEFAULT_OPENROUTER_MODEL)
    active_persona_id = Column(Integer, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True)
    custom_prompt_override = Column(Text, nullable=True, default="")
    kick_channel_id = Column(String(100), nullable=True, default="")
    twitch_channel_id = Column(String(100), nullable=True, default="")
    youtube_channel_id = Column(String(100), nullable=True, default="")
    kick_token_encrypted = Column(Text, nullable=True, default="")
    twitch_token_encrypted = Column(Text, nullable=True, default="")
    youtube_token_encrypted = Column(Text, nullable=True, default="")
    bot_muted = Column(Boolean, nullable=False, default=False)
    general_knowledge_enabled = Column(Boolean, nullable=False, default=False)
    max_replies_per_minute = Column(Integer, nullable=False, default=10)
    mention_only = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
