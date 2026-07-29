"""
backend/app/api/v1/simulator.py
REST API Endpoints for controlling Mock Stream Simulator.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.connectors.manager import connector_manager
from app.schemas.simulator import (
    SimulatorStartRequest,
    SimulatorStatusResponse,
    SimulatorSendRequest
)

router = APIRouter()


@router.post("/start", response_model=SimulatorStatusResponse)
async def start_simulator(req: SimulatorStartRequest):
    """Start the Mock Stream Simulator."""
    sim = connector_manager.simulator
    sim.interval_seconds = req.interval_seconds
    if req.channel_id:
        sim.channel_id = req.channel_id

    success = await sim.connect()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start simulator")

    return SimulatorStatusResponse(
        is_running=sim.is_connected,
        interval_seconds=sim.interval_seconds,
        total_messages_generated=sim.total_generated,
        channel_id=sim.channel_id
    )


@router.post("/stop", response_model=SimulatorStatusResponse)
async def stop_simulator():
    """Stop the Mock Stream Simulator."""
    sim = connector_manager.simulator
    await sim.disconnect()

    return SimulatorStatusResponse(
        is_running=sim.is_connected,
        interval_seconds=sim.interval_seconds,
        total_messages_generated=sim.total_generated,
        channel_id=sim.channel_id
    )


@router.get("/status", response_model=SimulatorStatusResponse)
async def get_simulator_status():
    """Get current status of Mock Stream Simulator."""
    sim = connector_manager.simulator
    return SimulatorStatusResponse(
        is_running=sim.is_connected,
        interval_seconds=sim.interval_seconds,
        total_messages_generated=sim.total_generated,
        channel_id=sim.channel_id
    )


@router.post("/send")
async def send_simulated_message(req: SimulatorSendRequest):
    """Manually inject a custom message into the simulator stream."""
    sim = connector_manager.simulator
    msg = await sim.inject_custom_message(
        username=req.username,
        text=req.message,
        platform=req.platform or "simulator"
    )
    return {"status": "injected", "message": msg}
