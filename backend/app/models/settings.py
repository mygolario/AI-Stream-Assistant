from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class StreamerSettings(Base):
    __tablename__ = "streamer_settings"

    id = Column(Integer, primary_key=True, index=True)
    openrouter_api_key = Column(String(255), nullable=True, default="")
    selected_model = Column(String(100), nullable=False, default="google/gemini-2.0-flash-001")
    active_persona_id = Column(Integer, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True)
    custom_prompt_override = Column(Text, nullable=True, default="")
    kick_channel_id = Column(String(100), nullable=True, default="")
    twitch_channel_id = Column(String(100), nullable=True, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
