import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { streamSignals } from '../services/api'

const TYPE_META = {
  bulk_deal:      { icon: '⬡', color: '#14b8a6', label: 'Bulk Deal' },
  block_deal:     { icon: '⬡', color: '#60a5fa', label: 'Block Deal' },
  insider_trade:  { icon: '◈', color: '#f59e0b', label: 'Insider Trade' },
  filing:         { icon: '◎', color: '#a78bfa', label: 'Filing' },
  results:        { icon: '▣', color: '#22c55e', label: 'Results' },
  volume_surge:   { icon: '⬆', color: '#f97316', label: 'Volume Surge' },
  mgmt_commentary:{ icon: '◉', color: '#e879f9', label: 'Management' },
  regulatory:     { icon: '⊛', color: '#38bdf8', label: 'Regulatory' },
}

const ACTION_STYLE = {
  'Watch': { bg: 'rgba(96,165,250,0.1)', color: '#93c5fd', border: 'rgba(96,165,250,0.25)' },
  'Consider accumulating on dips': { bg: 'rgba(20,184,166,0.1)', color: '#2dd4bf', border: 'rgba(20,184,166,0.25)' },
  'High conviction buy setup': { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
}

function SignalCard({ signal, index }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[signal.type] || TYPE_META.filing
  const score = signal.score || signal.confidence || 70
  const actionStyle = ACTION_STYLE[signal.action] || ACTION_STYLE['Watch']

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top accent bar */}
      <div style={{ height: 2, background: meta.color, opacity: 0.7 }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${meta.color}20`,
              border: `1px solid ${meta.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: meta.color,
            }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                {signal.name || signal.ticker?.replace('.NS', '')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {signal.ticker?.replace('.NS', '')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', align: 'center', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
              background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`,
            }}>
              {meta.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: score >= 85 ? 'var(--green)' : score >= 70 ? 'var(--amber)' : 'var(--text-secondary)' }}>
                {score}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
          {signal.headline || signal.signal}
        </div>

        {/* Confidence bar */}
        <div className="confidence-bar" style={{ marginBottom: 12 }}>
          <div className="confidence-fill" style={{ width: `${score}%` }} />
        </div>

        {/* Action badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 500,
            background: actionStyle.bg, color: actionStyle.color, border: `1px solid ${actionStyle.border}`,
          }}>
            {signal.action || 'Watch'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {signal.date || 'Today'} · {expanded ? 'collapse ▲' : 'details ▼'}
          </span>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                {signal.why_now && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>WHY NOW</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{signal.why_now}</div>
                  </div>
                )}
                {signal.precedent && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>HISTORICAL PRECEDENT</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{signal.precedent}</div>
                  </div>
                )}
                {signal.risk && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: 12, color: '#f87171',
                  }}>
                    ⚠ Risk: {signal.risk}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function OpportunityRadar() {
  const [signals, setSignals] = useState([])
  const [status, setStatus] = useState('')
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)
  const stopRef = useRef(null)

  const runScan = () => {
    setSignals([])
    setDone(false)
    setScanning(true)
    setStatus('Initializing scan...')

    const stop = streamSignals(
      (signal) => setSignals(prev => [...prev, signal]),
      (msg) => setStatus(msg),
      (count) => { setScanning(false); setDone(true); setStatus(`${count} signals detected`) }
    )
    stopRef.current = stop
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div className="page-title">Opportunity Radar</div>
          <div className="page-subtitle">Signal-finder, not a summarizer — bulk deals, insider trades, filings, volume surges</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {scanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div className="spinner" />
              {status}
            </div>
          )}
          {done && !scanning && (
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ {status}</span>
          )}
          <button className="btn btn-primary" onClick={runScan} disabled={scanning}>
            {scanning ? 'Scanning...' : '⌖ Run Signal Scan'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {signals.length === 0 && !scanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center', padding: '80px 40px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>⌖</div>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            Radar is idle
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            Click "Run Signal Scan" to scan NSE for bulk deals, insider trades, earnings surprises, regulatory events and volume anomalies.
          </div>
          <button className="btn btn-primary" onClick={runScan}>
            ⌖ Start Scanning
          </button>
        </motion.div>
      )}

      {/* Scanning status bar */}
      {scanning && signals.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} className="shimmer" style={{ height: 130 }} />
          ))}
        </div>
      )}

      {/* Signal grid */}
      {signals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {signals.map((signal, i) => (
            <SignalCard key={i} signal={signal} index={i} />
          ))}
          {scanning && <div className="shimmer" style={{ height: 160 }} />}
        </div>
      )}

      {/* Legend */}
      {signals.length > 0 && (
        <div style={{ marginTop: 28, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
              {meta.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}