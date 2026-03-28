import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchIndices } from '../services/api'

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
        background: pos ? 'var(--green)' : 'var(--red)', opacity: 0.8,
      }} />
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

export default function Dashboard() {
  const [indices, setIndices]   = useState([])
  const [movers, setMovers]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [time, setTime]         = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchIndices()
        setIndices(data)
      } catch {
        setIndices([])
      }
      setLoading(false)
    }
    load()
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // derive movers from index data for the table
  useEffect(() => {
    if (indices.length > 0) {
      setMovers(indices.map(idx => ({
        name: idx.name,
        ticker: idx.ticker?.replace('^', '').replace('.NS', ''),
        price: idx.value,
        change: idx.change,
      })))
    }
  }, [indices])

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
          : indices.length > 0
            ? indices.map((idx, i) => <IndexCard key={idx.name} {...idx} delay={i * 0.07} />)
            : <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                Could not fetch index data — Yahoo Finance may be rate-limiting. Try again in a moment.
              </div>
        }
      </div>

      {/* Movers table from live index data */}
      {movers.length > 0 && (
        <>
          <div className="section-label">Live Indices</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Index', 'Value', 'Change'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movers.map((m, i) => (
                  <motion.tr
                    key={m.ticker}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ borderBottom: i < movers.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.ticker}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                      {m.price?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: m.change >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                        {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change).toFixed(2)}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Prompt to use other features */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { icon: '⌖', title: 'Opportunity Radar', desc: 'Scan live NSE data for volume surges, breakouts, and momentum signals', page: 'radar' },
          { icon: '⧉', title: 'Chart Intelligence', desc: 'Technical pattern detection with back-tested success rates', page: 'charts' },
          { icon: '◎', title: 'Market ChatGPT', desc: 'Ask anything about the market — portfolio-aware, source-cited', page: 'chat' },
          { icon: '◫', title: 'Portfolio X-Ray', desc: 'Real-time P&L across your holdings with allocation breakdown', page: 'portfolio' },
        ].map((card, i) => (
          <motion.div
            key={card.page}
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            style={{ cursor: 'default' }}
          >
            <div style={{ fontSize: 20, marginBottom: 10, color: 'var(--amber)' }}>{card.icon}</div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{card.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}