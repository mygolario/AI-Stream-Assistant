from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatMessageCreate(BaseModel):
    platform: str = Field(default="simulator", description="kick, twitch, or simulator")
    username: str = Field(..., description="Username of the chatter")
    message: str = Field(..., description="Content of the chat message")
    user_id: Optional[str] = Field(default="", description="Unique platform user ID")


class ChatMessageResponse(BaseModel):
    id: int
    timestamp: datetime
    platform: str
    username: str
    message: str
    is_ai_response: bool
    is_filtered: bool
    tokens_used: int

    class Config:
        from_attributes = True


class DirectChatMessageRequest(BaseModel):
    platform: str = Field(default="simulator")
    username: str = Field(..., example="Gamer123")
    message: str = Field(..., example="What's your stream schedule?")
    channel_id: Optional[str] = Field(default="main_channel")


class DirectChatMessageResponse(BaseModel):
    status: str
    received_message: ChatMessageResponse
    ai_response: Optional[str] = None
    was_filtered: bool = False
