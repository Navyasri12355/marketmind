"""Market overview route"""
from fastapi import APIRouter
from agents.market_chat import generate_market_brief

router = APIRouter()

@router.get("/brief")
async def market_brief():
    return await generate_market_brief()

@router.get("/indices")
async def get_indices():
    import yfinance as yf
    indices = {
        "^NSEI": "Nifty 50",
        "^BSESN": "Sensex",
        "^NSEBANK": "Bank Nifty",
        "^CNXIT": "Nifty IT",
    }
    result = []
    for ticker, name in indices.items():
        try:
            t = yf.Ticker(ticker)
            h = t.history(period="2d")
            if len(h) >= 2:
                curr = float(h.iloc[-1]["Close"])
                prev = float(h.iloc[-2]["Close"])
                chg = round((curr - prev) / prev * 100, 2)
                result.append({"name": name, "ticker": ticker, "value": round(curr, 0), "change": chg})
        except Exception:
            pass
    return result