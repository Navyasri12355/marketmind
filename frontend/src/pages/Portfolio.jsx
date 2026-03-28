import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { analyzePortfolio } from '../services/api'

const COLORS = ['#f59e0b', '#14b8a6', '#a78bfa', '#60a5fa', '#22c55e', '#f97316']

function StatCard({ label, value, sub, color, delay }) {
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color }}>{sub}</div>}
    </motion.div>
  )
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState([])
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [newHolding, setNewHolding] = useState({ ticker: '', name: '', qty: '', avg_price: '' })
  const [error, setError]       = useState('')

  const runXRay = async () => {
    if (holdings.length === 0) { setError('Add at least one holding first.'); return }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const data = await analyzePortfolio(holdings)
      setResult(data)
    } catch (e) {
      setError('Could not fetch live prices. Check your connection and try again.')
    }
    setLoading(false)
  }

  const addHolding = () => {
    if (!newHolding.ticker || !newHolding.qty || !newHolding.avg_price) {
      setError('Fill in ticker, quantity and average price.')
      return
    }
    setError('')
    const ticker = newHolding.ticker.toUpperCase()
    const finalTicker = ticker.includes('.') ? ticker : `${ticker}.NS`
    setHoldings(prev => [...prev, {
      ticker: finalTicker,
      name: newHolding.name || ticker,
      qty: parseInt(newHolding.qty),
      avg_price: parseFloat(newHolding.avg_price),
    }])
    setNewHolding({ ticker: '', name: '', qty: '', avg_price: '' })
    setResult(null)
  }

  const removeHolding = (i) => {
    setHoldings(prev => prev.filter((_, idx) => idx !== i))
    setResult(null)
  }

  const formatINR = (n) => {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
    return `₹${n.toLocaleString('en-IN')}`
  }

  const pieData = result?.holdings?.map(h => ({
    name: h.name?.split(' ')[0] || h.ticker,
    value: h.current_value,
  })) || []

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="page-title">Portfolio X-Ray</div>
          <div className="page-subtitle">Live P&L · Allocation · AI-powered rebalancing insights</div>
        </div>
        <button className="btn btn-primary" onClick={runXRay} disabled={loading || holdings.length === 0}>
          {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Fetching prices</> : '◎ Run X-Ray'}
        </button>
      </div>

      {/* Add holding row */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div className="section-label">Add holding</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px 110px auto', gap: 8, alignItems: 'flex-end' }}>
          {[
            ['Ticker', 'ticker', 'e.g. INFY'],
            ['Company name', 'name', 'e.g. Infosys (optional)'],
            ['Qty', 'qty', '100'],
            ['Avg price ₹', 'avg_price', '1500'],
          ].map(([label, field, ph]) => (
            <div key={field}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <input
                className="input"
                placeholder={ph}
                value={newHolding[field]}
                onChange={e => setNewHolding(prev => ({ ...prev, [field]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addHolding()}
                style={{ padding: '7px 10px', fontSize: 12 }}
              />
            </div>
          ))}
          <button className="btn btn-teal" style={{ fontSize: 12, padding: '7px 14px' }} onClick={addHolding}>+ Add</button>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
      </div>

      {/* Holdings table */}
      {holdings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {holdings.length} position{holdings.length > 1 ? 's' : ''} · Total invested: {formatINR(holdings.reduce((s, h) => s + h.qty * h.avg_price, 0))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Stock', 'Qty', 'Avg Price', 'Invested', result ? 'Current' : null, result ? 'P&L' : null, ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const r = result?.holdings?.find(x => x.ticker === h.ticker)
                return (
                  <tr key={i} style={{ borderBottom: i < holdings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{h.ticker.replace('.NS','').replace('.BO','')}</div>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{h.qty}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{h.avg_price.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatINR(h.qty * h.avg_price)}</td>
                    {r && <>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{r.current_price?.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatINR(r.current_value)}</div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: r.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {r.pnl >= 0 ? '+' : ''}{formatINR(r.pnl)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: r.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {r.pnl_pct >= 0 ? '+' : ''}{r.pnl_pct?.toFixed(2)}%
                        </div>
                      </td>
                    </>}
                    <td style={{ padding: '11px 16px' }}>
                      <button onClick={() => removeHolding(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[0,1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 90 }} />)}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Total Invested"  value={formatINR(result.summary.total_invested)} color="var(--blue)" delay={0} />
            <StatCard label="Current Value"   value={formatINR(result.summary.total_current)}  color="var(--teal)" delay={0.06} />
            <StatCard label="Total P&L"
              value={`${result.summary.total_pnl >= 0 ? '+' : ''}${formatINR(result.summary.total_pnl)}`}
              sub={`${result.summary.total_pnl_pct >= 0 ? '+' : ''}${result.summary.total_pnl_pct?.toFixed(2)}% overall`}
              color={result.summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'} delay={0.12} />
            <StatCard label="Best Performer"
              value={result.holdings.reduce((b, h) => h.pnl_pct > (b?.pnl_pct || -Infinity) ? h : b, null)?.name?.split(' ')[0] || '—'}
              sub={`+${result.holdings.reduce((b, h) => h.pnl_pct > (b?.pnl_pct || -Infinity) ? h : b, null)?.pnl_pct?.toFixed(1)}%`}
              color="var(--green)" delay={0.18} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
            <div className="card">
              <div className="section-label">Allocation</div>
              <PieChart width={260} height={200}>
                <Pie data={pieData} cx={130} cy={100} innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                      {((d.value / result.summary.total_current) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-label">Position Performance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...result.holdings].sort((a, b) => b.pnl_pct - a.pnl_pct).map((h, i) => {
                  const max = Math.max(...result.holdings.map(x => Math.abs(x.pnl_pct)))
                  const width = Math.abs(h.pnl_pct) / max * 100
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.name?.split(' ')[0]}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: h.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                          {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct?.toFixed(2)}%
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                          style={{ height: '100%', borderRadius: 3, background: h.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && holdings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>◫</div>
          <div style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 500, marginBottom: 8 }}>Add your holdings above</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Enter a ticker (e.g. INFY), quantity, and average buy price — then click Run X-Ray for live P&L.
          </div>
        </div>
      )}
    </div>
  )
}