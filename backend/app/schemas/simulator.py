from pydantic import BaseModel, Field
from typing import Optional


class SimulatorStartRequest(BaseModel):
    interval_seconds: float = Field(default=3.0, ge=0.5, le=60.0)
    channel_id: Optional[str] = Field(default="simulated_channel")


class SimulatorStatusResponse(BaseModel):
    is_running: bool
    interval_seconds: float
    total_messages_generated: int
    channel_id: str


class SimulatorSendRequest(BaseModel):
    username: str = Field(..., example="CustomViewer")
    message: str = Field(..., example="How do I join the subscriber discord?")
    platform: Optional[str] = Field(default="simulator")
