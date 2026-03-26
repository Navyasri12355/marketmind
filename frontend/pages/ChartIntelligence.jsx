import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Line, Bar, ResponsiveContainer, Area
} from 'recharts'
import { fetchOHLCV, fetchPatterns, searchStocks, streamChartAnalysis } from '../services/api'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

const POPULAR = [
  { ticker: 'RELIANCE.NS', name: 'Reliance' },
  { ticker: 'TCS.NS', name: 'TCS' },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { ticker: 'INFY.NS', name: 'Infosys' },
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const isGreen = d.close >= d.open
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
        {[['O', d.open], ['H', d.high], ['L', d.low], ['C', d.close]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: k === 'C' ? (isGreen ? 'var(--green)' : 'var(--red)') : 'var(--text-primary)' }}>
              ₹{v?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
      {d.volume && (
        <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>
          Vol: {(d.volume / 1e5).toFixed(1)}L
        </div>
      )}
    </div>
  )
}

function PatternCard({ pattern, index }) {
  const typeColor = pattern.type === 'bullish' ? 'var(--green)' : pattern.type === 'bearish' ? 'var(--red)' : 'var(--blue)'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{
        background: 'var(--bg-elevated)', border: `1px solid ${typeColor}30`,
        borderRadius: 'var(--radius)', padding: '14px',
        borderLeft: `3px solid ${typeColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{pattern.pattern}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: typeColor }}>
            {pattern.confidence}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>conf</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{pattern.description}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[['Entry', pattern.entry, 'var(--blue)'], ['Target', pattern.target, 'var(--green)'], ['Stop', pattern.stop_loss, 'var(--red)']].map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
        📊 {pattern.back_test}
      </div>
    </motion.div>
  )
}

export default function ChartIntelligence() {
  const [ticker, setTicker] = useState('RELIANCE.NS')
  const [period, setPeriod] = useState('3mo')
  const [chartData, setChartData] = useState([])
  const [patterns, setPatterns] = useState([])
  const [stockInfo, setStockInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showSMA20, setShowSMA20] = useState(true)
  const [showSMA50, setShowSMA50] = useState(true)
  const [showBB, setShowBB] = useState(false)
  const searchRef = useRef(null)

  const loadData = useCallback(async (t, p) => {
    setLoading(true)
    setAnalysis('')
    try {
      const [ohlcvRes, patternRes] = await Promise.all([
        fetchOHLCV(t, p),
        fetchPatterns(t),
      ])
      // Transform for recharts - show last 60 points max
      const raw = ohlcvRes.data || []
      const sliced = raw.slice(-60)
      setChartData(sliced.map(d => ({
        ...d,
        dateShort: d.date?.slice(5), // MM-DD
      })))
      setPatterns(patternRes.patterns || [])
      setStockInfo(patternRes.stock || null)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData(ticker, period) }, [ticker, period, loadData])

  const runAnalysis = async () => {
    setAnalysing(true)
    setAnalysis('')
    try {
      for await (const chunk of streamChartAnalysis(ticker, period)) {
        setAnalysis(prev => prev + chunk)
      }
    } catch (e) {
      setAnalysis('Backend not connected — run the FastAPI server to get live analysis.')
    }
    setAnalysing(false)
  }

  const handleSearch = async (q) => {
    setSearchQ(q)
    if (q.length < 1) { setSearchResults([]); return }
    const results = await searchStocks(q)
    setSearchResults(results)
    setShowSearch(true)
  }

  const selectStock = (stock) => {
    setTicker(stock.ticker)
    setSearchQ('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Compute price range for Y axis
  const priceRange = chartData.length > 0 ? {
    min: Math.floor(Math.min(...chartData.map(d => d.low || d.close)) * 0.995),
    max: Math.ceil(Math.max(...chartData.map(d => d.high || d.close)) * 1.005),
  } : { min: 'auto', max: 'auto' }

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1]?.close : null
  const firstPrice = chartData.length > 0 ? chartData[0]?.close : null
  const priceChange = (currentPrice && firstPrice) ? ((currentPrice - firstPrice) / firstPrice * 100).toFixed(2) : null

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="page-title">Chart Intelligence</div>
          <div className="page-subtitle">Pattern detection across NSE — with back-tested success rates</div>
        </div>
      </div>

      {/* Stock selector + controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 280px' }} ref={searchRef}>
          <input
            className="input"
            placeholder="Search stock (e.g. Reliance, INFY...)"
            value={searchQ}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchQ && setShowSearch(true)}
            style={{ paddingLeft: 36 }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', marginTop: 4, overflow: 'hidden',
            }}>
              {searchResults.map(s => (
                <div key={s.ticker} onClick={() => selectStock(s)} style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.ticker.replace('.NS', '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular stocks */}
        <div style={{ display: 'flex', gap: 6 }}>
          {POPULAR.map(s => (
            <button
              key={s.ticker}
              className={`btn ${ticker === s.ticker ? 'btn-teal' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTicker(s.ticker)}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`btn ${period === p.value ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock info bar */}
      {stockInfo && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '12px 16px',
          display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
              {stockInfo.name || ticker.replace('.NS', '')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stockInfo.sector} · {stockInfo.industry}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600 }}>
            ₹{currentPrice?.toLocaleString('en-IN')}
          </div>
          {priceChange && (
            <span style={{ color: parseFloat(priceChange) >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>
              {parseFloat(priceChange) >= 0 ? '▲' : '▼'} {Math.abs(priceChange)}%
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginLeft: 4 }}>({period})</span>
            </span>
          )}
          {[['52W High', stockInfo.high_52w], ['52W Low', stockInfo.low_52w]].map(([label, val]) => val && (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{val?.toLocaleString('en-IN')}</div>
            </div>
          ))}
          {/* Overlay toggles */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {[['SMA20', showSMA20, setShowSMA20, '#14b8a6'], ['SMA50', showSMA50, setShowSMA50, '#a78bfa'], ['BB', showBB, setShowBB, '#f59e0b']].map(([label, on, set, color]) => (
              <button
                key={label}
                onClick={() => set(!on)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${on ? color + '60' : 'var(--border)'}`,
                  background: on ? `${color}18` : 'transparent',
                  color: on ? color : 'var(--text-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 8px 8px' }}>
        {loading ? (
          <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading market data...</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="dateShort" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[priceRange.min, priceRange.max]} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              {/* Candlestick approximation using bars */}
              <Bar dataKey="close" fill="transparent" />
              {/* Price area */}
              <Area type="monotone" dataKey="close" stroke="#f59e0b" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
              {showSMA20 && <Line type="monotone" dataKey="sma_20" stroke="#14b8a6" strokeWidth={1.2} dot={false} strokeDasharray="4 2" />}
              {showSMA50 && <Line type="monotone" dataKey="sma_50" stroke="#a78bfa" strokeWidth={1.2} dot={false} strokeDasharray="4 2" />}
              {showBB && <Line type="monotone" dataKey="bb_upper" stroke="#f59e0b" strokeWidth={0.8} dot={false} strokeDasharray="2 4" opacity={0.6} />}
              {showBB && <Line type="monotone" dataKey="bb_lower" stroke="#f59e0b" strokeWidth={0.8} dot={false} strokeDasharray="2 4" opacity={0.6} />}
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom grid: patterns + analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Patterns */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0 }}>Detected Patterns ({patterns.length})</div>
          </div>
          {patterns.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              No significant patterns detected for current period
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {patterns.map((p, i) => <PatternCard key={i} pattern={p} index={i} />)}
          </div>
        </div>

        {/* AI Analysis */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0 }}>AI Technical Analysis</div>
            <button className="btn btn-teal" style={{ fontSize: 12, padding: '6px 12px' }} onClick={runAnalysis} disabled={analysing}>
              {analysing ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Analysing</> : '◎ Analyse'}
            </button>
          </div>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px',
            minHeight: 240,
          }}>
            {!analysis && !analysing && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>
                Click "Analyse" to get a local AI technical read on {ticker.replace('.NS', '')}
              </div>
            )}
            {analysing && !analysis && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div className="spinner" /> Reading charts...
              </div>
            )}
            {analysis && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {analysis}
                {analysing && <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--amber)', marginLeft: 2, animation: 'blink 1s step-end infinite' }} />}
              </div>
            )}
          </div>
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      </div>
    </div>
  )
}