"""Charts route — Pattern Intelligence API"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yfinance as yf
import httpx
import json
from agents.chart_intelligence import detect_patterns, get_ohlcv_for_chart, analyze_chart_with_llm
from agents.opportunity_radar import cached_history, enrich_with_history

router = APIRouter()


class AnalyzeRequest(BaseModel):
    ticker: str
    period: str = "6mo"


def get_stock_info(ticker: str) -> dict:
    """Build a stock info dict using cached_history + enrich_with_history."""
    base = {"ticker": ticker, "name": ticker.split(".")[0],
            "price": 0, "change_1d": 0, "volume": 0, "market_cap": 0}
    try:
        hist = cached_history(ticker, "1mo")
        if not hist.empty and len(hist) >= 2:
            base["price"]     = round(float(hist["Close"].iloc[-1]), 2)
            base["change_1d"] = round(float(
                (hist["Close"].iloc[-1] - hist["Close"].iloc[-2]) /
                hist["Close"].iloc[-2] * 100), 2)
        info = yf.Ticker(ticker).fast_info
        base["market_cap"] = getattr(info, "market_cap", 0) or 0
        # try to get a proper name
        try:
            full_info  = yf.Ticker(ticker).info
            base["name"]   = full_info.get("shortName", base["name"])
            base["sector"] = full_info.get("sector", "Unknown")
            base["industry"] = full_info.get("industry", "Unknown")
        except Exception:
            pass
    except Exception:
        pass

    enriched = enrich_with_history(base)
    return enriched if enriched else base


@router.get("/ohlcv/{ticker}")
async def get_ohlcv(ticker: str, period: str = "6mo"):
    data = get_ohlcv_for_chart(ticker, period)
    return {"ticker": ticker, "data": data}


@router.get("/patterns/{ticker}")
async def get_patterns(ticker: str):
    hist     = cached_history(ticker, "6mo")
    patterns = detect_patterns(hist, ticker)
    stock    = get_stock_info(ticker)
    return {"ticker": ticker, "patterns": patterns, "stock": stock}


@router.post("/analyze")
async def analyze_chart(req: AnalyzeRequest):
    hist     = cached_history(req.ticker, req.period)
    patterns = detect_patterns(hist, req.ticker)
    stock    = get_stock_info(req.ticker)

    async def generate():
        async for chunk in analyze_chart_with_llm(req.ticker, patterns, stock):
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
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": q, "quotesCount": 10, "newsCount": 0,
                        "enableFuzzyQuery": True, "region": "IN"},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5,
            )
            data = resp.json()

        INDIAN_EXCHANGES = {"NSI", "BSE", "NSE", "BOM"}
        results = []
        for item in data.get("quotes", []):
            if item.get("quoteType") not in ("EQUITY", "INDEX"):
                continue
            if item.get("exchange") not in INDIAN_EXCHANGES:
                continue
            results.append({
                "ticker": item.get("symbol", ""),
                "name":   item.get("longname") or item.get("shortname", ""),
                "sector": item.get("sector", ""),
                "type":   item.get("quoteType", "").lower(),
            })
        return results[:8]
    except Exception:
        return []