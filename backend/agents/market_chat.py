"""
Market ChatGPT — Next Gen | Groq / Llama 3.3 70B (free tier)
Multi-turn, portfolio-aware, source-cited, streams tokens.
"""
import json
from typing import AsyncIterator
import yfinance as yf
from agents.llm_client import get_client, MODEL_SMART
from agents.opportunity_radar import cached_history

SYSTEM_PROMPT = """You are MarketMind — India's most intelligent AI investment analyst, embedded in ET Markets.

CAPABILITIES:
- Real-time NSE/BSE data analysis and interpretation
- Portfolio-aware answers (you know the user's holdings if provided)
- Multi-step reasoning: think through questions step by step
- Source attribution: always cite what data you're using
- Indian market expert: SEBI regulations, RBI policy, GST impact, Budget implications

PERSONALITY:
- Direct and confident — like a seasoned Dalal Street veteran
- Use plain English, occasional Hindi phrases where natural
- Never generic. Be specific: stocks, sectors, exact price levels
- Always distinguish short-term trades from long-term investing
- Quantify everything: "tech rallied" → "Nifty IT gained 3.2% this week"

RULES:
- Never cop out with "consult a financial advisor" — you ARE the advisor here
- Ground all answers in data, not opinion
- If uncertain, say what data would change your view
- Cite sources: "Per NSE bulk deal data..." / "Based on Q3 earnings call..."
- For complex questions, show your reasoning step by step

FORMAT:
- Use **bold** for stock names and price levels
- Bullet points only for lists of 3+ items
- End substantive answers with "📊 Key level to watch: ₹X" when applicable
- Keep responses focused and under 400 words unless deep analysis is asked"""

STOCK_MAP = {
    "reliance": "RELIANCE.NS", "tcs": "TCS.NS", "infosys": "INFY.NS",
    "infy": "INFY.NS", "hdfc": "HDFCBANK.NS", "hdfcbank": "HDFCBANK.NS",
    "icici": "ICICIBANK.NS", "sbi": "SBIN.NS", "bajaj finance": "BAJFINANCE.NS",
    "bajfinance": "BAJFINANCE.NS", "airtel": "BHARTIARTL.NS", "bhartiartl": "BHARTIARTL.NS",
    "wipro": "WIPRO.NS", "maruti": "MARUTI.NS", "titan": "TITAN.NS",
    "nifty": "^NSEI", "sensex": "^BSESN", "bank nifty": "^NSEBANK",
    "hcl": "HCLTECH.NS", "hcltech": "HCLTECH.NS",
    "sun pharma": "SUNPHARMA.NS", "sunpharma": "SUNPHARMA.NS",
    "cipla": "CIPLA.NS", "drreddy": "DRREDDY.NS", "kotak": "KOTAKBANK.NS",
    "axis": "AXISBANK.NS", "ntpc": "NTPC.NS", "itc": "ITC.NS",
}


def fetch_quick_context(query: str) -> dict:
    q = query.lower()
    tickers = [v for k, v in STOCK_MAP.items() if k in q]
    if "^NSEI" not in tickers:
        tickers.insert(0, "^NSEI")

    context = {}
    for ticker in tickers[:3]:
        try:
            hist = cached_history(ticker, "5d")
            if len(hist) >= 2:
                curr = float(hist.iloc[-1]["Close"])
                prev = float(hist.iloc[-2]["Close"])
                chg  = round((curr - prev) / prev * 100, 2)
                context[ticker] = {"price": round(curr, 2), "change_pct": chg}
        except Exception:
            pass
    return context


async def stream_chat_response(
    messages: list[dict],
    portfolio: dict | None = None,
) -> AsyncIterator[str]:
    latest_query = messages[-1]["content"] if messages else ""
    market_ctx   = fetch_quick_context(latest_query)

    system = SYSTEM_PROMPT

    if market_ctx:
        system += "\n\nLIVE MARKET DATA (use in your response):\n"
        for ticker, d in market_ctx.items():
            arrow = "▲" if d["change_pct"] >= 0 else "▼"
            system += f"- {ticker}: ₹{d['price']} {arrow}{abs(d['change_pct']):.2f}% today\n"

    if portfolio:
        system += "\n\nUSER'S PORTFOLIO (flag relevant holdings):\n"
        for h in portfolio.get("holdings", []):
            system += f"- {h['name']} ({h['ticker']}): {h['qty']} shares @ avg ₹{h['avg_price']}\n"

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    try:
        client = get_client()
        stream = client.chat.completions.create(
            model=MODEL_SMART,
            max_tokens=800,
            temperature=0.5,
            stream=True,
            messages=[{"role": "system", "content": system}] + api_messages,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        yield f"⚠ Groq API error: {e}\n\nSet GROQ_API_KEY in backend/.env (free at console.groq.com)"


async def generate_market_brief() -> dict:
    result = {"indices": []}
    for ticker, name in [("^NSEI", "Nifty 50"), ("^BSESN", "Sensex"), ("^NSEBANK", "Bank Nifty")]:
        try:
            h = cached_history(ticker, "2d")
            if len(h) >= 2:
                curr = float(h.iloc[-1]["Close"])
                prev = float(h.iloc[-2]["Close"])
                result["indices"].append({
                    "name": name, "ticker": ticker,
                    "value": round(curr, 0),
                    "change": round((curr - prev) / prev * 100, 2),
                })
        except Exception:
            pass
    return result