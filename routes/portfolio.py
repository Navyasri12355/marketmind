"""Portfolio route"""
from fastapi import APIRouter
from pydantic import BaseModel
import yfinance as yf
import json

router = APIRouter()

class Portfolio(BaseModel):
    holdings: list[dict]

@router.post("/analyze")
async def analyze_portfolio(portfolio: Portfolio):
    results = []
    total_invested = 0
    total_current = 0

    for holding in portfolio.holdings:
        ticker = holding.get("ticker", "")
        qty = holding.get("qty", 0)
        avg_price = holding.get("avg_price", 0)

        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period="5d")
            if hist.empty:
                continue
            current_price = float(hist.iloc[-1]["Close"])
            invested = qty * avg_price
            current_value = qty * current_price
            pnl = current_value - invested
            pnl_pct = (pnl / invested * 100) if invested > 0 else 0

            total_invested += invested
            total_current += current_value

            results.append({
                "ticker": ticker,
                "name": holding.get("name", ticker),
                "qty": qty,
                "avg_price": avg_price,
                "current_price": round(current_price, 2),
                "invested": round(invested, 2),
                "current_value": round(current_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
            })
        except Exception:
            pass

    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

    return {
        "holdings": results,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current": round(total_current, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_pct": round(total_pnl_pct, 2),
        }
    }