"""
MarketMind — AI for the Indian Investor
Multi-agent backend: Opportunity Radar + Chart Intelligence + Market ChatGPT
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json

from routes.signals import router as signals_router
from routes.charts import router as charts_router
from routes.chat import router as chat_router
from routes.portfolio import router as portfolio_router
from routes.market import router as market_router

app = FastAPI(title="MarketMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signals_router, prefix="/api/signals", tags=["signals"])
app.include_router(charts_router, prefix="/api/charts", tags=["charts"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(market_router, prefix="/api/market", tags=["market"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "MarketMind"}