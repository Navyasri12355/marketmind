# MarketMind - AI Market Assistant for Investors

>Signal-finder, not a summarizer - bulk deals, insider trades, chart patterns, and AI-powered market analysis built for India's 14 crore+ demat account holders.

## Quick Start

1. Install Python dependencies.

```bash
pip install -r requirements.txt
```

2. Copy environment template.

```bash
copy .env.example .env
```

3. Start Ollama and pull a free model (example).

```bash
ollama pull llama3
```

4. Start backend API.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

5. Start frontend (from frontend folder).

```bash
cd frontend
npm install
npm run dev
```

Endpoints:

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Architecture

```text
Browser (React + Vite)
    |
    | HTTP + SSE
    v
FastAPI app (main.py)
    |
    +-- /api/market/*       -> routes/market.py
    +-- /api/charts/*       -> routes/charts.py
    +-- /api/signals/*      -> routes/signals.py
    +-- /api/chat/*         -> routes/chat.py
    +-- /api/portfolio/*    -> routes/portfolio.py
    |
    +-- agents/opportunity_radar.py    (signal generation + local LLM ranking)
    +-- agents/chart_intelligence.py   (indicators/patterns + local LLM analysis)
    +-- agents/market_chat.py          (portfolio-aware local LLM chat)
    |
    +-- yfinance (free market data)
    +-- Ollama   (free local model inference)
```

### Streaming Design

- Opportunity Radar uses SSE from /api/signals/scan
- Market Chat uses SSE from /api/chat/stream
- Chart analysis uses SSE from /api/charts/analyze

This gives progressive responses in the UI instead of waiting for full model output.

### AI Layer (Free-only)

- Provider: Ollama local server
- Config: .env using OLLAMA_BASE_URL and OLLAMA_MODEL
- Fallback behavior: if local model is unavailable, routes return safe fallback text/data

## Current Project Structure

```text
et_genai_hack/
|- main.py
|- requirements.txt
|- .env.example
|- README.md
|- agents/
|  |- __init__.py
|  |- chart_intelligence.py
|  |- market_chat.py
|  |- opportunity_radar.py
|- routes/
|  |- __init__.py
|  |- charts.py
|  |- chat.py
|  |- market.py
|  |- portfolio.py
|  |- signals.py
|- frontend/
     |- api.js
     |- pages/
     |  |- Dashboard.jsx
     |  |- OpportunityRadar.jsx
     |  |- ChartIntelligence.jsx
     |  |- MarketChat.jsx
     |  |- Portfolio.jsx
     |- src/
            |- App.jsx
            |- index.css
            |- components/
                 |- Sidebar.jsx
```

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- Market data: yfinance
- Data processing: pandas, numpy, ta
- AI inference: Ollama (local)
- Streaming: Server-Sent Events (SSE)

## Notes

- Ensure Ollama is running before using chat, chart analysis, or signal ranking.
- You can switch models by changing OLLAMA_MODEL in .env.
- Default backend URL used by frontend API client is http://localhost:8000/api.
