import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { analyzePortfolio } from '../services/api'

const DEFAULT_HOLDINGS = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', qty: 50, avg_price: 2800 },
  { ticker: 'INFY.NS', name: 'Infosys', qty: 100, avg_price: 1580 },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', qty: 80, avg_price: 1650 },
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', qty: 200, avg_price: 820 },
  { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', qty: 60, avg_price: 1320 },
]

const COLORS = ['#f59e0b', '#14b8a6', '#a78bfa', '#60a5fa', '#22c55e', '#f97316']

function StatCard({ label, value, sub, color, delay }) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color }}>{sub}</div>}
    </motion.div>
  )
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState(DEFAULT_HOLDINGS)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newHolding, setNewHolding] = useState({ ticker: '', name: '', qty: '', avg_price: '' })

  const runXRay = async () => {
    setLoading(true)
    setResult(null)
    try {
      const data = await analyzePortfolio(holdings)
      setResult(data)
    } catch (e) {
      // Use mock data if backend not connected
      const mockHoldings = holdings.map(h => ({
        ticker: h.ticker,
        name: h.name,
        qty: h.qty,
        avg_price: h.avg_price,
        current_price: h.avg_price * (1 + (Math.random() - 0.3) * 0.25),
        invested: h.qty * h.avg_price,
        current_value: h.qty * h.avg_price * (1 + (Math.random() - 0.3) * 0.25),
        pnl: 0,
        pnl_pct: 0,
      })).map(h => ({
        ...h,
        current_price: parseFloat(h.current_price.toFixed(2)),
        current_value: parseFloat(h.current_value.toFixed(2)),
        pnl: parseFloat((h.current_value - h.invested).toFixed(2)),
        pnl_pct: parseFloat(((h.current_value - h.invested) / h.invested * 100).toFixed(2)),
      }))
      const totalInvested = mockHoldings.reduce((s, h) => s + h.invested, 0)
      const totalCurrent = mockHoldings.reduce((s, h) => s + h.current_value, 0)
      setResult({
        holdings: mockHoldings,
        summary: {
          total_invested: parseFloat(totalInvested.toFixed(2)),
          total_current: parseFloat(totalCurrent.toFixed(2)),
          total_pnl: parseFloat((totalCurrent - totalInvested).toFixed(2)),
          total_pnl_pct: parseFloat(((totalCurrent - totalInvested) / totalInvested * 100).toFixed(2)),
        }
      })
    }
    setLoading(false)
  }

  const addHolding = () => {
    if (!newHolding.ticker || !newHolding.qty || !newHolding.avg_price) return
    setHoldings(prev => [...prev, {
      ticker: newHolding.ticker.toUpperCase() + (newHolding.ticker.includes('.') ? '' : '.NS'),
      name: newHolding.name || newHolding.ticker.toUpperCase(),
      qty: parseInt(newHolding.qty),
      avg_price: parseFloat(newHolding.avg_price),
    }])
    setNewHolding({ ticker: '', name: '', qty: '', avg_price: '' })
  }

  const removeHolding = (i) => setHoldings(prev => prev.filter((_, idx) => idx !== i))

  const formatINR = (n) => {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
    return `₹${n.toLocaleString('en-IN')}`
  }

  // Allocation pie data
  const pieData = result?.holdings?.map(h => ({
    name: h.name?.split(' ')[0] || h.ticker,
    value: h.current_value,
  })) || []

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="page-title">Portfolio X-Ray</div>
          <div className="page-subtitle">Live P&L · Allocation · AI-powered rebalancing insights</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditMode(!editMode)}>
            {editMode ? '✓ Done' : '⊕ Edit Holdings'}
          </button>
          <button className="btn btn-primary" onClick={runXRay} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Analysing</> : '◎ Run X-Ray'}
          </button>
        </div>
      </div>

      {/* Holdings table / edit */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            HOLDINGS — {holdings.length} positions
          </span>
          {!editMode && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Total invested: {formatINR(holdings.reduce((s, h) => s + h.qty * h.avg_price, 0))}
            </span>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Stock', 'Qty', 'Avg Price', 'Invested', result ? 'Current' : '', result ? 'P&L' : '', editMode ? '' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => {
              const resultRow = result?.holdings?.find(r => r.ticker === h.ticker)
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{h.ticker.replace('.NS', '')}</div>
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{h.qty}</td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{h.avg_price.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatINR(h.qty * h.avg_price)}</td>
                  {resultRow && (
                    <>
                      <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        <div>₹{resultRow.current_price?.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatINR(resultRow.current_value)}</div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: resultRow.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {resultRow.pnl >= 0 ? '+' : ''}{formatINR(resultRow.pnl)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: resultRow.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {resultRow.pnl_pct >= 0 ? '+' : ''}{resultRow.pnl_pct?.toFixed(2)}%
                        </div>
                      </td>
                    </>
                  )}
                  {editMode && (
                    <td style={{ padding: '11px 16px' }}>
                      <button onClick={() => removeHolding(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Add row */}
            {editMode && (
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {[['Ticker', 'ticker', 'e.g. WIPRO'], ['Name', 'name', 'Company name'], ['Qty', 'qty', '100'], ['Avg Price', 'avg_price', '₹1500']].map(([label, field, ph]) => (
                  <td key={field} style={{ padding: '8px 10px' }}>
                    <input
                      className="input"
                      placeholder={ph}
                      value={newHolding[field]}
                      onChange={e => setNewHolding(prev => ({ ...prev, [field]: e.target.value }))}
                      style={{ padding: '6px 10px', fontSize: 12 }}
                    />
                  </td>
                ))}
                <td style={{ padding: '8px 10px' }}>
                  <button className="btn btn-teal" style={{ fontSize: 12, padding: '6px 12px' }} onClick={addHolding}>+ Add</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[0,1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 90 }} />)}
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Total Invested" value={formatINR(result.summary.total_invested)} color="var(--blue)" delay={0} />
            <StatCard label="Current Value" value={formatINR(result.summary.total_current)} color="var(--teal)" delay={0.06} />
            <StatCard
              label="Total P&L"
              value={`${result.summary.total_pnl >= 0 ? '+' : ''}${formatINR(result.summary.total_pnl)}`}
              sub={`${result.summary.total_pnl_pct >= 0 ? '+' : ''}${result.summary.total_pnl_pct?.toFixed(2)}% overall`}
              color={result.summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'}
              delay={0.12}
            />
            <StatCard
              label="Best Performer"
              value={result.holdings.reduce((best, h) => h.pnl_pct > (best?.pnl_pct || -Infinity) ? h : best, null)?.name?.split(' ')[0] || '—'}
              sub={`+${result.holdings.reduce((best, h) => h.pnl_pct > (best?.pnl_pct || -Infinity) ? h : best, null)?.pnl_pct?.toFixed(1)}% return`}
              color="var(--green)"
              delay={0.18}
            />
          </div>

          {/* Allocation pie + bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
            {/* Pie chart */}
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

            {/* P&L bars */}
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
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ delay: i * 0.05, duration: 0.5 }}
                          style={{ height: '100%', borderRadius: 3, background: h.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div style={{
          textAlign: 'center', padding: '60px 40px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>◫</div>
          <div style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 500, marginBottom: 8 }}>Ready to X-Ray your portfolio</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Add your holdings above, then click "Run X-Ray" for live P&L, allocation analysis and insights.
          </div>
          <button className="btn btn-primary" onClick={runXRay}>◎ Run X-Ray Now</button>
        </div>
      )}
    </div>
  )
}