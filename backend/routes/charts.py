"""Charts route — Pattern Intelligence API"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import yfinance as yf
import json
import asyncio
from agents.chart_intelligence import detect_patterns, get_ohlcv_for_chart, analyze_chart_with_llm
from agents.opportunity_radar import fetch_stock_data

router = APIRouter()

import requests
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
})

class AnalyzeRequest(BaseModel):
    ticker: str
    period: str = "6mo"


@router.get("/ohlcv/{ticker}")
async def get_ohlcv(ticker: str, period: str = "6mo"):
    data = get_ohlcv_for_chart(ticker, period)
    return {"ticker": ticker, "data": data}


@router.get("/patterns/{ticker}")
async def get_patterns(ticker: str):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="6mo")
    patterns = detect_patterns(hist, ticker)
    stock_info = fetch_stock_data(ticker, "1mo")
    return {"ticker": ticker, "patterns": patterns, "stock": stock_info}


@router.post("/analyze")
async def analyze_chart(req: AnalyzeRequest):
    """Stream technical analysis for a given ticker."""
    stock = yf.Ticker(req.ticker)
    hist = stock.history(period=req.period)
    patterns = detect_patterns(hist, req.ticker)
    stock_info = fetch_stock_data(req.ticker, "1mo")

    async def generate():
        async for chunk in analyze_chart_with_llm(req.ticker, patterns, stock_info):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/search")
async def search_stocks(q: str = ""):
    if not q:
        return []
    import httpx
    try:
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": q,
            "quotesCount": 10,
            "newsCount": 0,
            "enableFuzzyQuery": True,
            "region": "IN",
        }
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=5)
            data = resp.json()

        results = []
        INDIAN_EXCHANGES = {"NSI", "BSE", "NSE", "BOM"}
        for item in data.get("quotes", []):
            type_ = item.get("quoteType", "")
            exchange = item.get("exchange", "")
            if type_ not in ("EQUITY", "INDEX"):
                continue
            if exchange not in INDIAN_EXCHANGES:
                continue
            results.append({
                "ticker": item.get("symbol", ""),
                "name":   item.get("longname") or item.get("shortname", ""),
                "sector": item.get("sector", ""),
                "type":   type_.lower(),
            })
        return results[:8]

    except Exception:
        return []