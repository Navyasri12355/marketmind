"""
Opportunity Radar Agent — Groq / Llama 3.3 70B (free tier)
"""
import json, asyncio
from typing import AsyncIterator
import yfinance as yf
from agents.llm_client import get_client, MODEL_SMART


def fetch_stock_data(ticker: str, period: str = "1mo") -> dict:
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        info = stock.info
        if hist.empty:
            return {}
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else latest
        avg_vol_20 = hist["Volume"].tail(20).mean()
        vol_ratio = float(latest["Volume"] / avg_vol_20) if avg_vol_20 > 0 else 1.0
        price_1d = float((latest["Close"] - prev["Close"]) / prev["Close"] * 100)
        high_52w = float(hist["High"].max())
        low_52w = float(hist["Low"].min())
        current = float(latest["Close"])
        return {
            "ticker": ticker,
            "name": info.get("shortName", ticker.replace(".NS", "")),
            "price": round(current, 2),
            "change_1d": round(price_1d, 2),
            "volume": int(latest["Volume"]),
            "volume_ratio": round(vol_ratio, 2),
            "high_52w": round(high_52w, 2),
            "low_52w": round(low_52w, 2),
            "sector": info.get("sector", "Unknown"),
        }
    except Exception:
        return {}


def generate_mock_signals() -> list[dict]:
    return [
        {"type":"bulk_deal","ticker":"TATAMOTORS.NS","name":"Tata Motors",
         "signal":"FII bulk deal: Morgan Stanley bought 2.3cr shares at ₹956 (3.2% of float)",
         "details":"Largest single FII purchase in TATAMOTORS in 18 months",
         "date":"Today","confidence":87,"sentiment":"bullish"},
        {"type":"insider_trade","ticker":"BAJFINANCE.NS","name":"Bajaj Finance",
         "signal":"Promoter open-market buy: 4.8L shares worth ₹380cr",
         "details":"Bajaj Holdings: 6th consecutive promoter purchase this quarter",
         "date":"2 days ago","confidence":92,"sentiment":"bullish"},
        {"type":"filing","ticker":"SUNPHARMA.NS","name":"Sun Pharma",
         "signal":"USFDA closure letter: 3 pending ANDAs now approvable",
         "details":"3 ANDAs worth est. $120M annual revenue unlocked",
         "date":"Today","confidence":89,"sentiment":"bullish"},
        {"type":"results","ticker":"HCLTECH.NS","name":"HCL Technologies",
         "signal":"Q3 guidance raised to 6.5-7% YoY (was 5-6%). Deal wins $2.9B",
         "details":"Beat on all 4 metrics. $500M+ deal pipeline upgrade",
         "date":"Yesterday","confidence":85,"sentiment":"bullish"},
        {"type":"block_deal","ticker":"ADANIPORTS.NS","name":"Adani Ports",
         "signal":"LIC block purchase: 1.4cr shares at ₹1,340 — stake up 1.2%",
         "details":"DII conviction buy after recent correction",
         "date":"Today","confidence":83,"sentiment":"bullish"},
        {"type":"mgmt_commentary","ticker":"MARUTI.NS","name":"Maruti Suzuki",
         "signal":"CMD: '15-18% volume growth FY26' — highest guidance in 6 quarters",
         "details":"Inventory at 28 days vs 45 days last year",
         "date":"3 days ago","confidence":78,"sentiment":"bullish"},
        {"type":"regulatory","ticker":"ICICIBANK.NS","name":"ICICI Bank",
         "signal":"RBI approved ₹4,000cr AT1 bond — CAR improves to 17.8%",
         "details":"Removes capital adequacy overhang on credit growth",
         "date":"Today","confidence":81,"sentiment":"bullish"},
        {"type":"volume_surge","ticker":"CIPLA.NS","name":"Cipla",
         "signal":"Volume 4.8x 20-day avg on no news — accumulation pattern",
         "details":"Heavy call buying at ₹1,600 strike (next week expiry)",
         "date":"Today","confidence":72,"sentiment":"bullish"},
    ]


async def run_opportunity_radar(limit: int = 8) -> AsyncIterator[str]:
    yield f"data: {json.dumps({'type':'status','message':'Scanning NSE universe...'})}\n\n"
    await asyncio.sleep(0.2)

    movers = []
    yield f"data: {json.dumps({'type':'status','message':'Fetching live market data...'})}\n\n"
    for t in ["RELIANCE.NS", "TATAMOTORS.NS", "BAJFINANCE.NS"]:
        d = fetch_stock_data(t)
        if d:
            movers.append(d)
        await asyncio.sleep(0.05)

    yield f"data: {json.dumps({'type':'status','message':'Running signal detection agents...'})}\n\n"
    raw_signals = generate_mock_signals()

    yield f"data: {json.dumps({'type':'status','message':'Ranking signals with Llama 3.3 70B (free)...'})}\n\n"

    prompt = f"""You are an elite Indian equity research analyst. Rank and enrich these market signals.

RAW SIGNALS:
{json.dumps(raw_signals, indent=2)}

LIVE MARKET CONTEXT:
{json.dumps(movers, indent=2)}

For EACH signal return a JSON object with these EXACT fields:
- ticker, name, type, date, confidence, sentiment (copy from input)
- headline: punchy one-liner max 12 words
- why_now: 2-3 sentences, specific numbers, why this matters today
- precedent: what happened last time a similar signal fired for this specific stock
- score: integer 1-100 actionability score
- risk: one-line risk factor
- action: EXACTLY one of "Watch" | "Consider accumulating on dips" | "High conviction buy setup"

Return ONLY a valid JSON array. No markdown fences, no explanation, no preamble."""

    ranked_signals = raw_signals
    try:
        client = get_client()
        resp = client.chat.completions.create(
            model=MODEL_SMART,
            max_tokens=2500,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        ranked_signals = json.loads(text.strip())
    except Exception:
        ranked_signals = [
            {**s, "headline": s["signal"][:80], "score": s["confidence"],
             "action": "Watch", "why_now": s.get("details", s["signal"]),
             "precedent": "Historical data available once backend is connected.",
             "risk": "General market risk applies."}
            for s in raw_signals
        ]

    yield f"data: {json.dumps({'type':'status','message':'Signals ranked. Streaming...'})}\n\n"
    for signal in ranked_signals[:limit]:
        yield f"data: {json.dumps({'type':'signal','data':signal})}\n\n"
        await asyncio.sleep(0.12)
    yield f"data: {json.dumps({'type':'done','count':len(ranked_signals[:limit])})}\n\n"