from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    platform = Column(String(50), nullable=False, default="simulator")  # kick, twitch, simulator
    username = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_ai_response = Column(Boolean, nullable=False, default=False)
    is_filtered = Column(Boolean, nullable=False, default=False)
    tokens_used = Column(Integer, nullable=False, default=0)
