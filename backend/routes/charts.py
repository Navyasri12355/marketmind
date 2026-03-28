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
    """Stream Claude's technical analysis for a given ticker."""
    stock = yf.Ticker(req.ticker)
    hist = stock.history(period=req.period)
    patterns = detect_patterns(hist, req.ticker)
    stock_info = fetch_stock_data(req.ticker, "1mo")

    async def generate():
        async for chunk in analyze_chart_with_claude(req.ticker, patterns, stock_info):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/search")
async def search_stocks(q: str = ""):
    """Search NSE stocks by name/ticker."""
    NSE_STOCKS = [
        {"ticker": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy"},
        {"ticker": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT"},
        {"ticker": "HDFCBANK.NS", "name": "HDFC Bank", "sector": "Banking"},
        {"ticker": "INFY.NS", "name": "Infosys", "sector": "IT"},
        {"ticker": "ICICIBANK.NS", "name": "ICICI Bank", "sector": "Banking"},
        {"ticker": "HINDUNILVR.NS", "name": "Hindustan Unilever", "sector": "FMCG"},
        {"ticker": "ITC.NS", "name": "ITC Limited", "sector": "FMCG"},
        {"ticker": "SBIN.NS", "name": "State Bank of India", "sector": "Banking"},
        {"ticker": "BAJFINANCE.NS", "name": "Bajaj Finance", "sector": "NBFC"},
        {"ticker": "BHARTIARTL.NS", "name": "Bharti Airtel", "sector": "Telecom"},
        {"ticker": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "sector": "Banking"},
        {"ticker": "AXISBANK.NS", "name": "Axis Bank", "sector": "Banking"},
        {"ticker": "ASIANPAINT.NS", "name": "Asian Paints", "sector": "Consumer"},
        {"ticker": "MARUTI.NS", "name": "Maruti Suzuki", "sector": "Auto"},
        {"ticker": "TITAN.NS", "name": "Titan Company", "sector": "Consumer"},
        {"ticker": "WIPRO.NS", "name": "Wipro", "sector": "IT"},
        {"ticker": "TATAMOTORS.NS", "name": "Tata Motors", "sector": "Auto"},
        {"ticker": "SUNPHARMA.NS", "name": "Sun Pharma", "sector": "Pharma"},
        {"ticker": "DRREDDY.NS", "name": "Dr. Reddy's Labs", "sector": "Pharma"},
        {"ticker": "CIPLA.NS", "name": "Cipla", "sector": "Pharma"},
        {"ticker": "HCLTECH.NS", "name": "HCL Technologies", "sector": "IT"},
        {"ticker": "NTPC.NS", "name": "NTPC", "sector": "Power"},
        {"ticker": "ONGC.NS", "name": "ONGC", "sector": "Oil & Gas"},
        {"ticker": "JSWSTEEL.NS", "name": "JSW Steel", "sector": "Metals"},
        {"ticker": "TATASTEEL.NS", "name": "Tata Steel", "sector": "Metals"},
    ]
    if not q:
        return NSE_STOCKS[:10]
    q_lower = q.lower()
    filtered = [s for s in NSE_STOCKS if q_lower in s["name"].lower() or q_lower in s["ticker"].lower()]
    return filtered[:8]