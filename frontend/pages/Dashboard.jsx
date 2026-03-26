import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchIndices } from '../services/api'

const MOCK_MOVERS = [
  { name: 'Tata Motors', ticker: 'TATAMOTORS', price: 956, change: 3.8, vol: '4.2x', signal: 'Bulk deal: FII bought' },
  { name: 'HCL Tech', ticker: 'HCLTECH', price: 1748, change: 2.4, vol: '2.1x', signal: 'Results beat, guidance raised' },
  { name: 'Bajaj Finance', ticker: 'BAJFINANCE', price: 7917, change: 1.9, vol: '1.8x', signal: 'Promoter buying' },
  { name: 'Sun Pharma', ticker: 'SUNPHARMA', price: 1680, change: 1.6, vol: '3.1x', signal: 'USFDA clearance' },
  { name: 'Cipla', ticker: 'CIPLA', price: 1542, change: 0.8, vol: '4.8x', signal: 'Unusual volume' },
]

const MOCK_ALERTS = [
  { time: '09:42', type: 'bullish', text: 'TATAMOTORS: FII bulk deal — 2.3cr shares at ₹956' },
  { time: '10:15', type: 'bullish', text: 'BAJFINANCE: Promoter open market buy ₹380cr' },
  { time: '10:31', type: 'neutral', text: 'CIPLA: Volume 4.8x 20-day avg — accumulation pattern' },
  { time: '11:02', type: 'bullish', text: 'SUNPHARMA: USFDA clearance, 3 ANDAs now approvable' },
  { time: '11:48', type: 'bullish', text: 'ICICIBANK: RBI approved ₹4,000cr AT1 bond issuance' },
]

const SECTOR_PERF = [
  { name: 'Banking', change: 1.24, width: 80 },
  { name: 'IT', change: 0.87, width: 62 },
  { name: 'Pharma', change: 1.61, width: 90 },
  { name: 'Auto', change: 2.14, width: 100 },
  { name: 'FMCG', change: -0.32, width: 28 },
  { name: 'Metals', change: -0.91, width: 42 },
]

function IndexCard({ name, value, change, delay }) {
  const pos = change >= 0
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: pos ? 'var(--green)' : 'var(--red)',
        opacity: 0.8,
      }} />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: 4 }}>
        {value ? value.toLocaleString('en-IN') : '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
          color: pos ? 'var(--green)' : 'var(--red)',
        }}>
          {pos ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>today</span>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const [indices, setIndices] = useState([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchIndices()
        setIndices(data)
      } catch {
        setIndices([
          { name: 'Nifty 50', value: 24350, change: 0.42 },
          { name: 'Sensex', value: 80120, change: 0.38 },
          { name: 'Bank Nifty', value: 52100, change: -0.15 },
          { name: 'Nifty IT', value: 38200, change: 0.87 },
        ])
      }
      setLoading(false)
    }
    load()
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div className="page-title">Market Dashboard</div>
          <div className="page-subtitle">Real-time intelligence for Indian equities</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 4 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>NSE LIVE</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
            {time.toLocaleTimeString('en-IN', { hour12: false })} IST
          </div>
        </div>
      </div>

      {/* Indices */}
      <div className="section-label">Indices</div>
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {loading
          ? [0,1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 90 }} />)
          : indices.map((idx, i) => (
              <IndexCard key={idx.name} {...idx} delay={i * 0.07} />
            ))
        }
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Top signals / movers */}
        <div>
          <div className="section-label">Top Signals Today</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Stock', 'Price', 'Change', 'Vol Surge', 'Signal'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_MOVERS.map((m, i) => (
                  <motion.tr
                    key={m.ticker}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ borderBottom: i < MOCK_MOVERS.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.ticker}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{m.price.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: m.change >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                        {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-amber">{m.vol}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{m.signal}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live alerts */}
          <div>
            <div className="section-label">Live Alerts</div>
            <div className="card" style={{ padding: 0 }}>
              {MOCK_ALERTS.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: 'flex', gap: 10, padding: '10px 14px',
                    borderBottom: i < MOCK_ALERTS.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, minWidth: 36 }}>{a.time}</div>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    background: a.type === 'bullish' ? 'var(--green)' : a.type === 'bearish' ? 'var(--red)' : 'var(--blue)',
                  }} />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.text}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sector performance */}
          <div>
            <div className="section-label">Sector Performance</div>
            <div className="card">
              {SECTOR_PERF.map((s, i) => (
                <div key={s.name} style={{ marginBottom: i < SECTOR_PERF.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.change >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                      {s.change >= 0 ? '+' : ''}{s.change}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.width}%` }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                      style={{
                        height: '100%', borderRadius: 2,
                        background: s.change >= 0
                          ? 'linear-gradient(90deg, var(--teal), var(--green))'
                          : 'linear-gradient(90deg, #7f1d1d, var(--red))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ticker tape */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '8px 0', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', animation: 'ticker 28s linear infinite', whiteSpace: 'nowrap' }}>
          {[...MOCK_MOVERS, ...MOCK_MOVERS].map((m, i) => (
            <span key={i} style={{ padding: '0 24px', fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.ticker}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{m.price}</span>
              <span style={{ color: m.change >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                {m.change >= 0 ? '▲' : '▼'}{Math.abs(m.change)}%
              </span>
              <span style={{ color: 'var(--border-bright)' }}>|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}