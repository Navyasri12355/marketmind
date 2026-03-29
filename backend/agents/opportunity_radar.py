"""
Opportunity Radar Agent — Groq / Llama 3.3 70B (free tier)
- Universe fetched live from Yahoo Finance screener
- Batch-downloads all history in ONE yf.download() call (avoids per-stock rate limits)
- Price/change data taken directly from screener response (already live)
- Lower thresholds — signals fire on real-world everyday market conditions
"""
import json
import asyncio
import time
from typing import AsyncIterator
import httpx
import yfinance as yf
import pandas as pd
import numpy as np
from agents.llm_client import get_client, MODEL_SMART

# ── Cache ─────────────────────────────────────────────────────────────────────
_cache = {}
CACHE_TTL = 60

def cached_history(ticker: str, period: str) -> pd.DataFrame:
    key = f"{ticker}_{period}"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    data = yf.Ticker(ticker).history(period=period)
    if data.empty and ticker.endswith(".NS"):
        data = yf.Ticker(ticker.replace(".NS", ".BO")).history(period=period)
    _cache[key] = (data, time.time())
    return data


# ── Dynamic universe from Yahoo screener ─────────────────────────────────────

async def fetch_nse_universe() -> list[dict]:
    """
    Pull NSE stocks from Yahoo screener — most_actives, day_gainers, day_losers.
    Returns dicts already containing live price + change from the screener response,
    so we don't need an extra API call just for today's price.
    """
    all_quotes = {}
    screener_ids = ["most_actives", "day_gainers", "day_losers"]

    async with httpx.AsyncClient() as client:
        for scrId in screener_ids:
            try:
                resp = await client.get(
                    "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved",
                    params={"scrIds": scrId, "count": 25, "region": "IN", "lang": "en-IN"},
                    headers={"User-Agent": "Mozilla/5.0"},
                    timeout=6,
                )
                quotes = resp.json().get("finance", {}).get("result", [{}])[0].get("quotes", [])
                for q in quotes:
                    sym = q.get("symbol", "")
                    if not sym or sym in all_quotes:
                        continue
                    if not (sym.endswith(".NS") or sym.endswith(".BO")):
                        continue
                    if q.get("quoteType") != "EQUITY":
                        continue
                    all_quotes[sym] = {
                        "ticker":     sym,
                        "name":       q.get("shortName") or q.get("longName") or sym.split(".")[0],
                        "price":      float(q.get("regularMarketPrice", 0) or 0),
                        "change_1d":  float(q.get("regularMarketChangePercent", 0) or 0),
                        "volume":     int(q.get("regularMarketVolume", 0) or 0),
                        "avg_volume": int(q.get("averageDailyVolume3Month", 0) or 0),
                        "market_cap": int(q.get("marketCap", 0) or 0),
                        "day_high":   float(q.get("regularMarketDayHigh", 0) or 0),
                        "day_low":    float(q.get("regularMarketDayLow", 0) or 0),
                        "52w_high":   float(q.get("fiftyTwoWeekHigh", 0) or 0),
                        "52w_low":    float(q.get("fiftyTwoWeekLow", 0) or 0),
                    }
            except Exception:
                continue

    return list(all_quotes.values())


def batch_fetch_technicals(tickers: list[str]) -> dict[str, dict]:
    """
    Download 3 months of OHLCV for all tickers in ONE yf.download() call.
    Returns {ticker: {rsi, sma20, sma50, sma20_prev, sma50_prev,
                       vol_ratio, change_5d, high_52w, low_52w}}
    """
    if not tickers:
        return {}

    try:
        raw = yf.download(
            tickers, period="3mo",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
            threads=True,
        )
    except Exception:
        return {}

    result = {}
    # yf.download returns MultiIndex columns when >1 ticker
    single = len(tickers) == 1

    for ticker in tickers:
        try:
            if single:
                df = raw.copy()
            else:
                if ticker not in raw.columns.get_level_values(0):
                    continue
                df = raw[ticker].copy()

            df = df.dropna(subset=["Close"])
            if len(df) < 20:
                continue

            close  = df["Close"]
            volume = df["Volume"].fillna(0)

            sma20  = close.rolling(20).mean()
            sma50  = close.rolling(50).mean()

            delta  = close.diff()
            gain   = delta.clip(lower=0).rolling(14).mean()
            loss   = (-delta.clip(upper=0)).rolling(14).mean()
            rsi_s  = 100 - (100 / (1 + gain / loss.replace(0, 1e-10)))

            avg_vol = volume.rolling(20).mean().replace(0, np.nan)
            vol_ratio = float(volume.iloc[-1] / avg_vol.iloc[-1]) if not pd.isna(avg_vol.iloc[-1]) else 1.0

            change_5d = float(
                (close.iloc[-1] - close.iloc[-5]) / close.iloc[-5] * 100
            ) if len(df) >= 5 else 0.0

            result[ticker] = {
                "price":     round(float(close.iloc[-1]), 2),
                "change_1d": round(float((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100), 2) if len(df) >= 2 else 0.0,
                "rsi":       round(float(rsi_s.iloc[-1]),  1) if not pd.isna(rsi_s.iloc[-1])   else 50.0,
                "sma20":     round(float(sma20.iloc[-1]),  2) if not pd.isna(sma20.iloc[-1])   else 0.0,
                "sma50":     round(float(sma50.iloc[-1]),  2) if not pd.isna(sma50.iloc[-1])   else 0.0,
                "sma20_prev":round(float(sma20.iloc[-2]),  2) if len(df)>=21 and not pd.isna(sma20.iloc[-2]) else 0.0,
                "sma50_prev":round(float(sma50.iloc[-2]),  2) if len(df)>=51 and not pd.isna(sma50.iloc[-2]) else 0.0,
                "vol_ratio": round(vol_ratio, 2),
                "change_5d": round(change_5d, 2),
            }
        except Exception:
            continue

    return result


def enrich_with_history(stock: dict) -> dict | None:
    """Single-ticker fallback used by charts route."""
    ticker = stock["ticker"]
    try:
        hist = cached_history(ticker, "3mo")
        if hist.empty or len(hist) < 20:
            return None
        close  = hist["Close"]
        volume = hist["Volume"].fillna(0)
        avg_vol = volume.rolling(20).mean()
        vol_ratio = float(volume.iloc[-1] / avg_vol.iloc[-1]) if avg_vol.iloc[-1] > 0 else 1.0
        sma20 = float(close.rolling(20).mean().iloc[-1])
        sma50 = float(close.rolling(50).mean().iloc[-1]) if len(hist) >= 50 else sma20
        delta = close.diff()
        gain  = delta.clip(lower=0).rolling(14).mean()
        loss  = (-delta.clip(upper=0)).rolling(14).mean()
        rsi   = float(100 - (100 / (1 + gain.iloc[-1] / max(float(loss.iloc[-1]), 1e-10))))
        high_52w = float(hist["High"].max())
        low_52w  = float(hist["Low"].min())
        current  = float(close.iloc[-1])
        change_5d = float((current - close.iloc[-5]) / close.iloc[-5] * 100) if len(hist) >= 5 else 0
        return {
            **stock,
            "price":         round(current, 2),
            "volume_ratio":  round(vol_ratio, 2),
            "sma20":         round(sma20, 2),
            "sma50":         round(sma50, 2),
            "rsi":           round(rsi, 1),
            "high_52w":      round(high_52w, 2),
            "low_52w":       round(low_52w, 2),
            "pct_from_52w_high": round((current - high_52w) / high_52w * 100, 2),
            "change_5d":     round(change_5d, 2),
            "sma20_prev":    round(float(close.rolling(20).mean().iloc[-2]), 2) if len(hist) >= 21 else sma20,
            "sma50_prev":    round(float(close.rolling(50).mean().iloc[-2]), 2) if len(hist) >= 51 else sma50,
        }
    except Exception:
        return None


# ── Signal detection ──────────────────────────────────────────────────────────

def detect_signals(stock: dict) -> list[dict]:
    """
    Detect all applicable signals for a stock.
    Uses live screener data for price/change/volume,
    and batch-fetched technicals for RSI/SMA/vol_ratio.
    Thresholds are intentionally loose — we want coverage, not perfection.
    """
    signals  = []
    ticker   = stock["ticker"]
    name     = stock["name"]
    price    = stock.get("price", 0)
    change   = stock.get("change_1d", 0)
    change5d = stock.get("change_5d", 0)

    # Volume ratio: prefer technical fetch, fall back to screener volumes
    vol_ratio = stock.get("vol_ratio", 1.0)
    if vol_ratio <= 0 and stock.get("avg_volume", 0) > 0:
        vol_ratio = stock.get("volume", 0) / stock.get("avg_volume", 1)

    rsi      = stock.get("rsi",       50.0)
    sma20    = stock.get("sma20",    price)
    sma50    = stock.get("sma50",    price)
    sma20p   = stock.get("sma20_prev", sma20)
    sma50p   = stock.get("sma50_prev", sma50)
    high_52w = stock.get("52w_high",  stock.get("high_52w", price))
    low_52w  = stock.get("52w_low",   stock.get("low_52w",  price))
    pct_52w  = ((price - high_52w) / high_52w * 100) if high_52w > 0 else 0

    # 1. Volume surge (quiet accumulation)
    if vol_ratio >= 1.8 and abs(change) < 2.5:
        signals.append({
            "type": "volume_surge", "ticker": ticker, "name": name,
            "signal": f"Volume {vol_ratio:.1f}x average with contained price move — quiet accumulation",
            "details": f"₹{price} relatively flat while {vol_ratio:.1f}x normal volume flows in.",
            "confidence": min(52 + int(vol_ratio * 8), 88), "sentiment": "bullish", "date": "Today",
        })

    # 2. Strong breakout with volume
    if change >= 1.5 and vol_ratio >= 1.3:
        signals.append({
            "type": "breakout", "ticker": ticker, "name": name,
            "signal": f"Breakout: +{change:.1f}% on {vol_ratio:.1f}x volume",
            "details": f"₹{price}, {abs(pct_52w):.1f}% from 52W high. Strong buying.",
            "confidence": min(55 + int(change * 6), 88), "sentiment": "bullish", "date": "Today",
        })

    # 3. Near 52-week high
    if -3 <= pct_52w <= 0.5 and change >= 0.3:
        signals.append({
            "type": "52w_high", "ticker": ticker, "name": name,
            "signal": f"Near 52-week high ₹{high_52w:.0f} — breakout watch",
            "details": f"₹{price}, only {abs(pct_52w):.1f}% from annual peak. RSI: {rsi:.0f}",
            "confidence": 70, "sentiment": "bullish", "date": "Today",
        })

    # 4. Golden cross
    if sma20 > 0 and sma50 > 0 and sma20 > sma50 and sma20p <= sma50p:
        signals.append({
            "type": "golden_cross", "ticker": ticker, "name": name,
            "signal": f"Golden cross: SMA20 (₹{sma20:.0f}) crossed above SMA50 (₹{sma50:.0f})",
            "details": f"Trend reversal signal at ₹{price}. Momentum turning positive.",
            "confidence": 72, "sentiment": "bullish", "date": "Today",
        })

    # 5. Death cross
    if sma20 > 0 and sma50 > 0 and sma20 < sma50 and sma20p >= sma50p:
        signals.append({
            "type": "death_cross", "ticker": ticker, "name": name,
            "signal": f"Death cross: SMA20 (₹{sma20:.0f}) crossed below SMA50 (₹{sma50:.0f})",
            "details": f"Bearish trend signal at ₹{price}. Risk of further downside.",
            "confidence": 70, "sentiment": "bearish", "date": "Today",
        })

    # 6. Oversold bounce
    if rsi < 40 and change > -0.5:
        signals.append({
            "type": "oversold", "ticker": ticker, "name": name,
            "signal": f"Oversold RSI {rsi:.0f} with stabilising price",
            "details": f"₹{price} at RSI {rsi:.0f}. Watch for reversal candle.",
            "confidence": 63, "sentiment": "bullish", "date": "Today",
        })

    # 7. Overbought
    if rsi > 70:
        signals.append({
            "type": "overbought", "ticker": ticker, "name": name,
            "signal": f"Overbought: RSI {rsi:.0f} — reversal risk",
            "details": f"₹{price} extended at RSI {rsi:.0f}. Trim risk.",
            "confidence": 61, "sentiment": "bearish", "date": "Today",
        })

    # 8. Sharp selloff
    if change <= -2.0 and vol_ratio >= 1.3:
        signals.append({
            "type": "selloff", "ticker": ticker, "name": name,
            "signal": f"Sharp selloff: {change:.1f}% on {vol_ratio:.1f}x volume",
            "details": f"₹{price} selling hard with elevated volume. Capitulation or breakdown?",
            "confidence": min(55 + int(abs(change) * 5), 82), "sentiment": "bearish", "date": "Today",
        })

    # 9. Near 52-week low
    pct_from_low = ((price - low_52w) / low_52w * 100) if low_52w > 0 else 100
    if pct_from_low <= 5 and change <= 0:
        signals.append({
            "type": "52w_low", "ticker": ticker, "name": name,
            "signal": f"Near 52-week low ₹{low_52w:.0f} — support test",
            "details": f"₹{price}, only {pct_from_low:.1f}% above annual low. High-risk area.",
            "confidence": 64, "sentiment": "bearish", "date": "Today",
        })

    # 10. Multi-day momentum
    if change5d >= 4.0 and change >= 0.3:
        signals.append({
            "type": "momentum", "ticker": ticker, "name": name,
            "signal": f"5-day momentum: +{change5d:.1f}% this week",
            "details": f"₹{price} up {change5d:.1f}% over 5 days with today positive.",
            "confidence": 65, "sentiment": "bullish", "date": "Today",
        })

    # 11. Multi-day downtrend
    if change5d <= -4.0 and change <= 0.3:
        signals.append({
            "type": "downtrend", "ticker": ticker, "name": name,
            "signal": f"5-day downtrend: {change5d:.1f}% this week",
            "details": f"₹{price} down {abs(change5d):.1f}% over 5 days. Trend continuation risk.",
            "confidence": 63, "sentiment": "bearish", "date": "Today",
        })

    # 12. Price above SMA20 (general bullish structure) — catch-all for active stocks
    if sma20 > 0 and price > sma20 * 1.005 and change >= 0.5:
        signals.append({
            "type": "bullish_structure", "ticker": ticker, "name": name,
            "signal": f"Price (₹{price}) above SMA20 (₹{sma20:.0f}) with positive momentum",
            "details": f"Clean uptrend structure. Up {change:.1f}% today.",
            "confidence": 60, "sentiment": "bullish", "date": "Today",
        })

    return signals


# ── Main agent ────────────────────────────────────────────────────────────────

async def run_opportunity_radar(limit: int = 8) -> AsyncIterator[str]:
    yield f"data: {json.dumps({'type':'status','message':'Fetching live NSE universe from Yahoo screener...'})}\n\n"

    universe = await fetch_nse_universe()

    if not universe:
        yield f"data: {json.dumps({'type':'status','message':'Screener unavailable — using fallback list...'})}\n\n"
        fallback_tickers = [
            "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
            "SBIN.NS","BAJFINANCE.NS","WIPRO.NS","HCLTECH.NS","SUNPHARMA.NS",
            "MARUTI.NS","TITAN.NS","AXISBANK.NS","KOTAKBANK.NS","NTPC.NS",
        ]
        universe = [{"ticker": t, "name": t.replace(".NS",""), "price": 0,
                     "change_1d": 0, "volume": 0, "avg_volume": 0,
                     "market_cap": 0, "52w_high": 0, "52w_low": 0} for t in fallback_tickers]

    tickers = [s["ticker"] for s in universe]
    yield f"data: {json.dumps({'type':'status','message':f'Got {len(tickers)} stocks — batch downloading technicals...'})}\n\n"

    # Single batch download for all technicals
    technicals = await asyncio.get_event_loop().run_in_executor(
        None, batch_fetch_technicals, tickers
    )

    yield f"data: {json.dumps({'type':'status','message':f'Technicals ready for {len(technicals)} stocks — detecting signals...'})}\n\n"

    # Merge screener data with technicals
    enriched = []
    for stock in universe:
        t = stock["ticker"]
        merged = {**stock, **(technicals.get(t, {}))}
        # Only include if we have at least a price
        if merged.get("price", 0) > 0:
            enriched.append(merged)

    # Detect all signals
    all_signals = []
    for stock in enriched:
        sigs = detect_signals(stock)
        all_signals.extend(sigs)

    yield f"data: {json.dumps({'type':'status','message':f'{len(all_signals)} signals found — ranking with Llama 3.3 70B...'})}\n\n"

    if not all_signals:
        yield f"data: {json.dumps({'type':'status','message':'No signals detected — market may be very quiet today.'})}\n\n"
        yield f"data: {json.dumps({'type':'done','count':0})}\n\n"
        return
    
    actual_limit = min(limit, len(all_signals))

    # Rank with LLM
    prompt = f"""You are an elite Indian equity analyst. Rank and enrich these live NSE signals.

SIGNALS ({len(all_signals)} total, pick the {actual_limit} most actionable):
{json.dumps(all_signals, indent=2)}

For each of the top {actual_limit}, return a JSON object:
- ticker, name, type, date, confidence, sentiment (copy from input)
- headline: punchy one-liner max 12 words
- why_now: 2-3 sentences, specific ₹ price levels, why actionable today
- precedent: what typically follows this pattern on NSE (use market knowledge)
- score: integer 1-100
- risk: one specific risk factor for this stock/signal
- action: EXACTLY one of "Watch" | "Consider accumulating on dips" | "High conviction buy setup" | "Consider reducing exposure" | "High conviction sell/avoid"

Ensure a mix — don't return all bullish. Return ONLY a valid JSON array, no markdown."""

    ranked = all_signals[:actual_limit]
    try:
        client = get_client()
        resp = client.chat.completions.create(
            model=MODEL_SMART,
            max_tokens=3000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        ranked = json.loads(text.strip())
    except Exception:
        ranked = [
            {**s,
             "headline":  s["signal"][:80],
             "score":     s["confidence"],
             "action":    "Watch" if s["sentiment"] == "bullish" else "Consider reducing exposure",
             "why_now":   s.get("details", s["signal"]),
             "precedent": "Similar patterns on NSE precede 5–10% moves within 2–4 weeks.",
             "risk":      "General market risk — verify before acting."}
            for s in all_signals[:actual_limit]
        ]

    yield f"data: {json.dumps({'type':'status','message':'Streaming signals...'})}\n\n"
    for signal in ranked[:actual_limit]:
        yield f"data: {json.dumps({'type':'signal','data':signal})}\n\n"
        await asyncio.sleep(0.1)
    yield f"data: {json.dumps({'type':'done','count':len(ranked[:actual_limit])})}\n\n"