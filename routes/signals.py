"""Signals route — Opportunity Radar API"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from agents.opportunity_radar import run_opportunity_radar

router = APIRouter()

@router.get("/scan")
async def scan_signals():
    return StreamingResponse(
        run_opportunity_radar(limit=8),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )