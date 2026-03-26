import { motion } from 'framer-motion'

const NAV = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'radar', icon: '⌖', label: 'Opportunity Radar' },
  { id: 'charts', icon: '⧉', label: 'Chart Intelligence' },
  { id: 'chat', icon: '◎', label: 'Market ChatGPT' },
  { id: 'portfolio', icon: '◫', label: 'Portfolio X-Ray' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 28, height: 28,
            background: 'var(--amber)',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#0a0c0f', fontWeight: 700,
          }}>M</span>
          MarketMind
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 36 }}>
          AI for Indian Investors
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '16px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 10px', marginBottom: 8 }}>
          MODULES
        </div>
        {NAV.map((item) => {
          const isActive = activePage === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--amber-glow)' : 'transparent',
                color: isActive ? 'var(--amber)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 500 : 400,
                textAlign: 'left',
                transition: 'all 0.15s',
                borderLeft: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                marginBottom: 2,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', opacity: isActive ? 1 : 0.7 }}>
                {item.icon}
              </span>
              {item.label}
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>NSE Live</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          ET AI Hackathon 2026<br />
          PS6 — AI for Indian Investor
        </div>
      </div>
    </aside>
  )
}