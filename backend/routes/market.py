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