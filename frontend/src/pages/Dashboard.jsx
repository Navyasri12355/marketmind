import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { fetchIndices, fetchTopMovers } from '../services/api'

function IndexCard({ name, value, change, delay }) {
  const pos = change >= 0
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: pos ? 'var(--green)' : 'var(--red)', opacity: 0.8 }} />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: 4 }}>
        {value ? value.toLocaleString('en-IN') : '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: pos ? 'var(--green)' : 'var(--red)' }}>
          {pos ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>today</span>
      </div>
    </motion.div>
  )
}

function TickerTape({ movers }) {
  // Duplicate for seamless loop
  const items = [...movers, ...movers]
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 0', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap' }}>
        {items.map((m, i) => {
          const pos = m.change >= 0
          return (
            <span key={i} style={{ padding: '0 22px', fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {m.ticker.replace('.NS', '').replace('.BO', '')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                ₹{m.price?.toLocaleString('en-IN')}
              </span>
              <span style={{ color: pos ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {pos ? '▲' : '▼'}{Math.abs(m.change).toFixed(2)}%
              </span>
              <span style={{ color: 'var(--border-bright)', opacity: 0.5 }}>|</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MoverRow({ m, i, total }) {
  const pos = m.change >= 0
  const formatCap = (v) => {
    if (!v) return '—'
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}L Cr`
    if (v >= 1e9)  return `₹${(v / 1e9).toFixed(1)}K Cr`
    if (v >= 1e7)  return `₹${(v / 1e7).toFixed(0)} Cr`
    return `₹${v.toLocaleString('en-IN')}`
  }
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      style={{ borderBottom: i < total - 1 ? '1px solid var(--border)' : 'none' }}
    >
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 18 }}>{i + 1}</span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.ticker.replace('.NS','')}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        ₹{m.price?.toLocaleString('en-IN')}
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: pos ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
          {pos ? '▲' : '▼'} {Math.abs(m.change).toFixed(2)}%
        </span>
      </td>
      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
        {formatCap(m.market_cap)}
      </td>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ height: 4, width: 80, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.abs(m.change) / 5 * 100, 100)}%` }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.5 }}
            style={{ height: '100%', borderRadius: 2, background: pos ? 'var(--green)' : 'var(--red)' }}
          />
        </div>
      </td>
    </motion.tr>
  )
}

export default function Dashboard() {
  const [indices, setIndices] = useState([])
  const [movers, setMovers]   = useState([])
  const [loadIdx, setLoadIdx] = useState(true)
  const [loadMov, setLoadMov] = useState(true)
  const [time, setTime]       = useState(new Date())

  useEffect(() => {
    fetchIndices()
      .then(d => setIndices(d || []))
      .catch(() => setIndices([]))
      .finally(() => setLoadIdx(false))

    fetchTopMovers()
      .then(d => setMovers(d || []))
      .catch(() => setMovers([]))
      .finally(() => setLoadMov(false))

    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const breadthUp   = movers.filter(m => m.change >= 0).length
  const breadthDown = movers.filter(m => m.change < 0).length
  const breadthPct  = movers.length > 0 ? Math.round(breadthUp / movers.length * 100) : null

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
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {loadIdx
          ? [0,1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 90 }} />)
          : indices.length > 0
            ? indices.map((idx, i) => <IndexCard key={idx.name} {...idx} delay={i * 0.07} />)
            : <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                Could not fetch index data — Yahoo Finance may be rate-limiting. Try again shortly.
              </div>
        }
      </div>

      {/* Ticker tape */}
      {movers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <TickerTape movers={movers} />
        </div>
      )}
      {loadMov && movers.length === 0 && (
        <div className="shimmer" style={{ height: 36, borderRadius: 'var(--radius)', marginBottom: 24 }} />
      )}

      {/* Breadth + movers table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, alignItems: 'start' }}>

        {/* Top stocks by market cap */}
        <div>
          <div className="section-label">Top Stocks by Market Cap</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadMov ? (
              <div style={{ padding: 20 }}>
                {[0,1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 36, marginBottom: 8 }} />)}
              </div>
            ) : movers.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#  Stock', 'Price', 'Change', 'Mkt Cap', 'Momentum'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movers.map((m, i) => (
                    <MoverRow key={m.ticker} m={m} i={i} total={movers.length} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                Could not load stock data. Try refreshing.
              </div>
            )}
          </div>
        </div>

        {/* Market breadth sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="section-label">Market Breadth</div>
            <div className="card">
              {breadthPct !== null ? (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Advancing vs declining (top {movers.length} stocks)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--green)' }}>▲ {breadthUp} up</span>
                    <span style={{ fontSize: 12, color: 'var(--red)' }}>▼ {breadthDown} down</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--red)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${breadthPct}%` }}
                      transition={{ delay: 0.5, duration: 0.7 }}
                      style={{ height: '100%', background: 'var(--green)', borderRadius: 4 }}
                    />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: breadthPct >= 50 ? 'var(--green)' : 'var(--red)' }}>
                    {breadthPct}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {breadthPct >= 65 ? 'Broad rally' : breadthPct >= 50 ? 'Mild positive' : breadthPct >= 35 ? 'Mild negative' : 'Broad selloff'}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
              )}
            </div>
          </div>

          {/* Best & worst performer */}
          {movers.length > 0 && (() => {
            const best  = [...movers].sort((a, b) => b.change - a.change)[0]
            const worst = [...movers].sort((a, b) => a.change - b.change)[0]
            return (
              <>
                <div>
                  <div className="section-label">Best Today</div>
                  <div className="card">
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{best.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{best.ticker.replace('.NS','')}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>
                      ▲ {best.change.toFixed(2)}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>₹{best.price?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div>
                  <div className="section-label">Worst Today</div>
                  <div className="card">
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{worst.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{worst.ticker.replace('.NS','')}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>
                      ▼ {Math.abs(worst.change).toFixed(2)}%
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>₹{worst.price?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}