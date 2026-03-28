#!/bin/bash
# MarketMind — Start script
# Usage: ./run.sh

set -e

GREEN='\033[0;32m'
AMBER='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${AMBER}╔══════════════════════════════════════╗${NC}"
echo -e "${AMBER}║  MarketMind — AI for Indian Investor ║${NC}"
echo -e "${AMBER}║  ET AI Hackathon 2026 — PS6          ║${NC}"
echo -e "${AMBER}╚══════════════════════════════════════╝${NC}"
echo ""

# Check for .env
if [ ! -f "backend/.env" ]; then
  echo -e "${AMBER}⚠  No backend/.env found. Creating template...${NC}"
  echo "GROQ_API_KEY=your_groq_api_key_here" > backend/.env
  echo ""
  echo -e "${AMBER}► Edit backend/.env and add your Groq API key (free at console.groq.com), then re-run.${NC}"
  echo ""
  exit 1
fi

# Install backend deps in venv
echo -e "${CYAN}► Setting up Python virtual environment...${NC}"
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
cd ..

# Install frontend deps
echo -e "${CYAN}► Installing frontend dependencies...${NC}"
cd frontend
npm install --silent
cd ..

# Start backend in background (venv already active)
echo -e "${GREEN}► Starting FastAPI backend on http://localhost:8000${NC}"
cd backend
export $(cat .env | xargs) 2>/dev/null || true
venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Start frontend
echo -e "${GREEN}► Starting React frontend on http://localhost:5173${NC}"
echo ""
echo -e "${GREEN}✓ MarketMind is running!${NC}"
echo -e "  Frontend : ${CYAN}http://localhost:5173${NC}"
echo -e "  API Docs : ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

cd frontend
npm run dev

# Cleanup
kill $BACKEND_PID 2>/dev/null || true