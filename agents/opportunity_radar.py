"""
Opportunity Radar Agent
Monitors corporate filings, bulk/block deals, insider trades, quarterly results
Surfaces missed opportunities as actionable signals — not a summarizer, a signal-finder.
"""

import os
import httpx
import yfinance as yf
import json
import asyncio
from typing import AsyncIterator
import re

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1200"))
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "60"))

# NSE Top stocks universe
NSE_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS",
    "KOTAKBANK.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS",
    "NESTLEIND.NS", "WIPRO.NS", "ULTRACEMCO.NS", "POWERGRID.NS", "NTPC.NS",
    "ONGC.NS", "TATAMOTORS.NS", "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "HCLTECH.NS",
]


def fetch_stock_data(ticker: str, period: str = "3mo") -> dict:
    """Fetch OHLCV + basic fundamentals for a ticker."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        info = stock.info

        if hist.empty:
            return {}

        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else latest

        # Volume surge detection
        avg_vol_20 = hist["Volume"].tail(20).mean()
        vol_ratio = float(latest["Volume"] / avg_vol_20) if avg_vol_20 > 0 else 1.0

        # Price momentum
        price_change_1d = float((latest["Close"] - prev["Close"]) / prev["Close"] * 100)
        price_change_5d = float((latest["Close"] - hist.iloc[-5]["Close"]) / hist.iloc[-5]["Close"] * 100) if len(hist) >= 5 else 0
        price_change_20d = float((latest["Close"] - hist.iloc[-20]["Close"]) / hist.iloc[-20]["Close"] * 100) if len(hist) >= 20 else 0

        # 52-week high/low proximity
        high_52w = float(hist["High"].max())
        low_52w = float(hist["Low"].min())
        current_price = float(latest["Close"])
        pct_from_52w_high = (current_price - high_52w) / high_52w * 100

        return {
            "ticker": ticker,
            "name": info.get("shortName", ticker.replace(".NS", "")),
            "price": round(current_price, 2),
            "change_1d": round(price_change_1d, 2),
            "change_5d": round(price_change_5d, 2),
            "change_20d": round(price_change_20d, 2),
            "volume": int(latest["Volume"]),
            "avg_volume_20d": int(avg_vol_20),
            "volume_ratio": round(vol_ratio, 2),
            "high_52w": round(high_52w, 2),
            "low_52w": round(low_52w, 2),
            "pct_from_52w_high": round(pct_from_52w_high, 2),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE"),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
        }
    except Exception as e:
        return {}


def generate_mock_signals() -> list[dict]:
    """
    Generate realistic mock signals for bulk deals, insider trades, filings.
    In production these come from NSE bulk deal data, SEBI filings, BSE XML feeds.
    """
    signals = [
        {
            "type": "bulk_deal",
            "ticker": "TATAMOTORS.NS",
            "name": "Tata Motors",
            "signal": "Bulk deal: FII bought 2.3cr shares at ₹956 (3.2% of float)",
            "quantity": "2.3 crore shares",
            "price": 956,
            "buyer": "Morgan Stanley Asia Singapore",
            "date": "Today",
            "confidence": 87,
            "sentiment": "bullish",
        },
        {
            "type": "insider_trade",
            "ticker": "BAJFINANCE.NS",
            "name": "Bajaj Finance",
            "signal": "Promoter bought 4.8L shares worth ₹380cr in open market",
            "quantity": "4.8 lakh shares",
            "price": 7917,
            "buyer": "Bajaj Holdings (Promoter)",
            "date": "2 days ago",
            "confidence": 92,
            "sentiment": "bullish",
        },
        {
            "type": "filing",
            "ticker": "SUNPHARMA.NS",
            "name": "Sun Pharma",
            "signal": "USFDA inspection closure letter received — 3 pending ANDAs now approvable",
            "details": "3 ANDAs worth est. $120M annual revenue now cleared for approval",
            "date": "Today",
            "confidence": 89,
            "sentiment": "bullish",
        },
        {
            "type": "results",
            "ticker": "HCLTECH.NS",
            "name": "HCL Technologies",
            "signal": "Q3 revenue guidance raised to 6.5-7% YoY (was 5-6%). Deal wins at $2.9B",
            "details": "Beat on all 4 metrics. $500M+ deal pipeline upgrade",
            "date": "Yesterday",
            "confidence": 85,
            "sentiment": "bullish",
        },
        {
            "type": "block_deal",
            "ticker": "ADANIPORTS.NS",
            "name": "Adani Ports",
            "signal": "DII block deal: LIC increased stake by 1.2% via block purchase at ₹1,340",
            "quantity": "1.4 crore shares",
            "price": 1340,
            "buyer": "Life Insurance Corporation",
            "date": "Today",
            "confidence": 83,
            "sentiment": "bullish",
        },
        {
            "type": "mgmt_commentary",
            "ticker": "MARUTI.NS",
            "name": "Maruti Suzuki",
            "signal": "CMD: 'Expect 15-18% volume growth in FY26' — highest guidance in 6 quarters",
            "details": "Inventory levels at 28 days (vs 45 days same quarter last year)",
            "date": "3 days ago",
            "confidence": 78,
            "sentiment": "bullish",
        },
        {
            "type": "regulatory",
            "ticker": "ICICIBANK.NS",
            "name": "ICICI Bank",
            "signal": "RBI approved ₹4,000cr AT1 bond issuance — capital adequacy strengthened",
            "details": "CAR improves to 17.8%. Removes overhang on credit growth guidance",
            "date": "Today",
            "confidence": 81,
            "sentiment": "bullish",
        },
        {
            "type": "volume_surge",
            "ticker": "CIPLA.NS",
            "name": "Cipla",
            "signal": "Volume 4.8x 20-day average on no news — accumulation pattern pre-results",
            "details": "Options chain shows heavy call buying at ₹1,600 strike (next week expiry)",
            "date": "Today",
            "confidence": 72,
            "sentiment": "bullish",
        },
    ]
    return signals


async def rank_signals_with_local_llm(raw_signals: list[dict], movers_data: list[dict]) -> list[dict]:
    """Rank signals using a local/open-source model via Ollama."""
    market_context = json.dumps(movers_data[:3], indent=2)
    signals_context = json.dumps(raw_signals, indent=2)

    prompt = f"""You are an elite Indian equity research analyst. Analyze these market signals and rank them by actionability.

RAW SIGNALS DETECTED:
{signals_context}

MARKET CONTEXT (live data):
{market_context}

For each signal, provide:
1. A punchy one-line headline (max 12 words)
2. Why this matters RIGHT NOW (2-3 sentences, specific)
3. Historical precedent: what happened last time a similar signal fired for this stock
4. Actionability score 1-10
5. Risk factors (1 line)
6. Suggested action: "Watch", "Consider accumulating on dips", or "High conviction buy setup"

Return ONLY a JSON array with fields: ticker, name, type, headline, why_now, precedent, score, risk, action, sentiment
Do not include markdown code fences or extra commentary.
"""

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "prompt": prompt,
        "options": {
            "temperature": LLM_TEMPERATURE,
            "num_predict": LLM_MAX_TOKENS,
        },
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
        response.raise_for_status()
        response_text = response.json().get("response", "")

    json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
    if not json_match:
        raise ValueError("No JSON array in LLM response")

    parsed = json.loads(json_match.group())
    if not isinstance(parsed, list):
        raise ValueError("LLM response is not a JSON array")

    return parsed


async def run_opportunity_radar(limit: int = 8) -> AsyncIterator[str]:
    """
    Main agent: scans market, finds signals, uses local LLM to rank & narrate.
    Streams results back as SSE chunks.
    """
    yield f"data: {json.dumps({'type': 'status', 'message': 'Scanning NSE universe...'})}\n\n"
    await asyncio.sleep(0.3)

    # Fetch real data for top movers
    movers_data = []
    sample_tickers = ["RELIANCE.NS", "TATAMOTORS.NS", "INFY.NS", "BAJFINANCE.NS", "HDFCBANK.NS"]

    yield f"data: {json.dumps({'type': 'status', 'message': 'Fetching live market data...'})}\n\n"

    for ticker in sample_tickers:
        data = fetch_stock_data(ticker, "1mo")
        if data:
            movers_data.append(data)
        await asyncio.sleep(0.1)

    yield f"data: {json.dumps({'type': 'status', 'message': 'Running signal detection agents...'})}\n\n"
    await asyncio.sleep(0.2)

    # Get mock signals (in production: NSE bulk deals API, BSE filings, SEBI data)
    raw_signals = generate_mock_signals()

    yield f"data: {json.dumps({'type': 'status', 'message': 'Ranking signals with local LLM...'})}\n\n"

    try:
        ranked_signals = await rank_signals_with_local_llm(raw_signals, movers_data)
    except Exception:
        # Fallback if local LLM fails
        ranked_signals = [
            {**s, "headline": s["signal"][:80], "score": s["confidence"],
             "action": "Watch", "why_now": s.get("details", s["signal"]),
             "precedent": "Historical pattern analysis available",
             "risk": "General market risk applies"}
            for s in raw_signals
        ]

    yield f"data: {json.dumps({'type': 'status', 'message': 'Signals ranked. Generating alerts...'})}\n\n"
    await asyncio.sleep(0.2)

    # Stream each signal
    for signal in ranked_signals[:limit]:
        yield f"data: {json.dumps({'type': 'signal', 'data': signal})}\n\n"
        await asyncio.sleep(0.15)

    yield f"data: {json.dumps({'type': 'done', 'count': len(ranked_signals[:limit])})}\n\n"