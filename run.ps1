# MarketMind — Start script (PowerShell)
# Usage: ./run.ps1

$GREEN  = "Green"
$AMBER  = "Yellow"
$CYAN   = "Cyan"
$NC     = "NoColor"

Write-Host ""
Write-Host "${AMBER}╔══════════════════════════════════════╗${NC}"
Write-Host "${AMBER}║  MarketMind — AI for Indian Investor ║${NC}"
Write-Host "${AMBER}║  ET AI Hackathon 2026 — PS6          ║${NC}"
Write-Host "${AMBER}╚══════════════════════════════════════╝${NC}"
Write-Host ""

# Check for .env
if (-Not (Test-Path "backend\.env")) {
    Write-Host "${AMBER}⚠  No backend\.env found. Creating template...${NC}"
    Set-Content "backend\.env" "GROQ_API_KEY=your_groq_api_key_here"
    Write-Host ""
    Write-Host "${AMBER}► Edit backend\.env and add your Groq API key, then re-run.${NC}"
    Write-Host ""
    exit 1
}

# Load env vars from backend\.env
Get-Content "backend\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

# Set up Python venv
Write-Host "${CYAN}► Setting up Python virtual environment...${NC}"
Set-Location backend
if (-Not (Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
Set-Location ..

# Install frontend deps
Write-Host "${CYAN}► Installing frontend dependencies...${NC}"
Set-Location frontend
npm install --silent
Set-Location ..

# Start backend in background
Write-Host "${GREEN}► Starting FastAPI backend on http://localhost:8000${NC}"
$backend = Start-Process -FilePath "backend\venv\Scripts\uvicorn.exe" `
    -ArgumentList "main:app", "--reload", "--port", "8000" `
    -WorkingDirectory "backend" `
    -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# Start frontend
Write-Host "${GREEN}► Starting React frontend on http://localhost:5173${NC}"
Write-Host ""
Write-Host "${GREEN}✓ MarketMind is running!${NC}"
Write-Host "  Frontend : ${CYAN}http://localhost:5173${NC}"
Write-Host "  API Docs : ${CYAN}http://localhost:8000/docs${NC}"
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers."
Write-Host ""

Set-Location frontend
try {
    npm run dev
} finally {
    # Cleanup backend on exit
    if ($backend -and -Not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force
    }
}