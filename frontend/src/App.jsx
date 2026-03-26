import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import OpportunityRadar from './pages/OpportunityRadar'
import ChartIntelligence from './pages/ChartIntelligence'
import MarketChat from './pages/MarketChat'
import Portfolio from './pages/Portfolio'
import './index.css'

const PAGES = {
  dashboard: Dashboard,
  radar: OpportunityRadar,
  charts: ChartIntelligence,
  chat: MarketChat,
  portfolio: Portfolio,
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const Page = PAGES[activePage] || Dashboard

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ height: '100%' }}
          >
            <Page />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}