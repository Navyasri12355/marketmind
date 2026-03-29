const BASE = 'http://localhost:8000/api'

export async function fetchMarketBrief() {
  const r = await fetch(`${BASE}/market/brief`)
  return r.json()
}

export async function fetchIndices() {
  const r = await fetch(`${BASE}/market/indices`)
  return r.json()
}

export async function fetchOHLCV(ticker, period = '6mo') {
  const r = await fetch(`${BASE}/charts/ohlcv/${ticker}?period=${period}`)
  return r.json()
}

export async function fetchPatterns(ticker) {
  const r = await fetch(`${BASE}/charts/patterns/${ticker}`)
  return r.json()
}

export async function searchStocks(q) {
  const r = await fetch(`${BASE}/charts/search?q=${encodeURIComponent(q)}`)
  return r.json()
}

export async function analyzePortfolio(holdings) {
  const r = await fetch(`${BASE}/portfolio/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings }),
  })
  return r.json()
}

// SSE streaming helpers
export function streamSignals(onSignal, onStatus, onDone) {
  const es = new EventSource(`${BASE}/signals/scan`)
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'signal') onSignal(msg.data)
    else if (msg.type === 'status') onStatus(msg.message)
    else if (msg.type === 'done') { onDone(msg.count); es.close() }
  }
  es.onerror = () => es.close()
  return () => es.close()
}

export async function* streamChat(messages, portfolio) {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, portfolio }),
  })
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const msg = JSON.parse(line.slice(6))
          if (msg.text) yield msg.text
          if (msg.done) return
        } catch {}
      }
    }
  }
}

export async function* streamChartAnalysis(ticker, period = '6mo') {
  const res = await fetch(`${BASE}/charts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, period }),
  })
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const msg = JSON.parse(line.slice(6))
          if (msg.text) yield msg.text
          if (msg.done) return
        } catch {}
      }
    }
  }
}

export async function fetchTopMovers() {
  const r = await fetch(`${BASE}/market/movers`)
  return r.json()
}