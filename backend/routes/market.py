"""Market overview route"""
from fastapi import APIRouter
from agents.market_chat import generate_market_brief
from agents.opportunity_radar import cached_history

router = APIRouter()

@router.get("/brief")
async def market_brief():
    return await generate_market_brief()

@router.get("/indices")
async def get_indices():
    indices = [
        ("^NSEI",    "Nifty 50"),
        ("^BSESN",   "Sensex"),
        ("^NSEBANK", "Bank Nifty"),
        ("^CNXIT",   "Nifty IT"),
    ]
    result = []
    for ticker, name in indices:
        try:
            h = cached_history(ticker, "2d")
            if len(h) >= 2:
                curr = float(h.iloc[-1]["Close"])
                prev = float(h.iloc[-2]["Close"])
                chg  = round((curr - prev) / prev * 100, 2)
                result.append({
                    "name": name, "ticker": ticker,
                    "value": round(curr, 0), "change": chg,
                })
        except Exception:
            pass
    return result

@router.get("/movers")
async def get_top_movers():
    """
    Fetch top NSE stocks dynamically from Yahoo Finance screener.
    No hardcoded tickers — pulls most active/highest market cap live.
    """
    import httpx

    results = []

    try:
        # Yahoo Finance screener for NSE large caps by market cap
        url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
        params = {
            "scrIds": "most_actives",
            "count": 25,
            "region": "IN",
            "lang": "en-IN",
        }
        headers = {"User-Agent": "Mozilla/5.0"}

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=8)
            data = resp.json()

        quotes = data.get("finance", {}).get("result", [{}])[0].get("quotes", [])

        for q in quotes:
            if q.get("quoteType") != "EQUITY":
                continue
            symbol = q.get("symbol", "")
            if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
                continue
            results.append({
                "ticker":     symbol,
                "name":       q.get("shortName") or q.get("longName", symbol),
                "price":      round(float(q.get("regularMarketPrice", 0)), 2),
                "change":     round(float(q.get("regularMarketChangePercent", 0)), 2),
                "market_cap": q.get("marketCap", 0) or 0,
            })

    except Exception:
        pass

    # Fallback: if screener fails, use yfinance download for a broad NSE list
    if not results:
        import yfinance as yf
        try:
            tickers_str = "RELIANCE.NS TCS.NS HDFCBANK.NS INFY.NS ICICIBANK.NS SBIN.NS BAJFINANCE.NS BHARTIARTL.NS KOTAKBANK.NS AXISBANK.NS MARUTI.NS TITAN.NS WIPRO.NS HCLTECH.NS NTPC.NS SUNPHARMA.NS DRREDDY.NS CIPLA.NS HINDUNILVR.NS ITC.NS"
            data = yf.download(tickers_str, period="2d", group_by="ticker", progress=False, threads=True)
            for ticker in tickers_str.split():
                try:
                    hist = data[ticker] if ticker in data.columns.get_level_values(0) else None
                    if hist is None or hist.empty or len(hist) < 2:
                        continue
                    curr   = float(hist["Close"].iloc[-1])
                    prev   = float(hist["Close"].iloc[-2])
                    change = round((curr - prev) / prev * 100, 2)
                    info   = yf.Ticker(ticker).fast_info
                    results.append({
                        "ticker":     ticker,
                        "name":       ticker.replace(".NS", ""),
                        "price":      round(curr, 2),
                        "change":     change,
                        "market_cap": getattr(info, "market_cap", 0) or 0,
                    })
                except Exception:
                    continue
        except Exception:
            pass

    results.sort(key=lambda x: x["market_cap"], reverse=True)
    return results[:15]