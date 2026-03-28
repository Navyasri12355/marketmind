import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { streamChat } from '../services/api'

const QUICK_PROMPTS = [
  'Which sectors are showing strength today?',
  'Explain the impact of rising US Fed rates on Nifty',
  'What are the top 3 buy setups in banking stocks?',
  'How does FII vs DII activity affect mid-caps?',
  'Analyse Reliance Industries for next quarter',
  'Best way to hedge a long Nifty position?',
]

const DEMO_PORTFOLIO = {
  holdings: [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', qty: 50, avg_price: 2800 },
    { ticker: 'INFY.NS', name: 'Infosys', qty: 100, avg_price: 1580 },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', qty: 80, avg_price: 1650 },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors', qty: 200, avg_price: 820 },
  ]
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--amber-glow)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: 'var(--amber)', flexShrink: 0, marginRight: 10, marginTop: 2,
        }}>M</div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--amber-glow)' : 'var(--bg-card)',
        border: `1px solid ${isUser ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
        fontSize: 13,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{
            display: 'inline-block', width: 2, height: 14,
            background: 'var(--amber)', marginLeft: 2,
            animation: 'blink 1s step-end infinite',
          }} />
        )}
      </div>
    </motion.div>
  )
}

export default function MarketChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Namaste! I'm MarketMind — your AI analyst for Indian equities.\n\nI have access to live NSE/BSE data, your portfolio context, and decades of market patterns. Ask me anything — from sector rotation to specific stock setups, budget impact analysis, or portfolio risk.\n\nWhat's on your mind?`,
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [portfolioMode, setPortfolioMode] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || streaming) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setStreaming(true)

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      let fullText = ''
      for await (const chunk of streamChat(apiMessages, portfolioMode ? DEMO_PORTFOLIO : null)) {
        fullText += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: fullText, streaming: true }
          return updated
        })
      }
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: fullText, streaming: false }
        return updated
      })
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '⚠ Backend not connected. Start the FastAPI server:\n\n```\ncd backend && python -m uvicorn main:app --reload\n```\n\nThen ask me anything about the market!',
          streaming: false,
        }
        return updated
      })
    }
    setStreaming(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. What would you like to analyse?',
    }])
  }

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <div className="page-title">Market ChatGPT — Next Gen</div>
          <div className="page-subtitle">Multi-step analysis · Portfolio-aware · Source-cited</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Portfolio toggle */}
          <button
            className={`btn ${portfolioMode ? 'btn-teal' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '7px 12px' }}
            onClick={() => setPortfolioMode(!portfolioMode)}
          >
            {portfolioMode ? '◈' : '○'} Portfolio Context
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={clearChat}>
            ↺ Clear
          </button>
        </div>
      </div>

      {/* Portfolio context bar */}
      <AnimatePresence>
        {portfolioMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'var(--teal-glow)', border: '1px solid rgba(20,184,166,0.25)',
              borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14,
              fontSize: 12, color: 'var(--teal)', flexShrink: 0,
            }}
          >
            ◈ Portfolio context active — {DEMO_PORTFOLIO.holdings.length} holdings loaded: {DEMO_PORTFOLIO.holdings.map(h => h.name).join(', ')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, flexShrink: 0 }}>
        {QUICK_PROMPTS.map((q, i) => (
          <button
            key={i}
            onClick={() => send(q)}
            disabled={streaming}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 400, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: 'auto', marginBottom: 16,
        padding: '4px 0',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
        minHeight: 0,
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '12px 14px',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          className="input"
          placeholder="Ask about stocks, sectors, technicals, fundamentals, macro..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={streaming}
          rows={1}
          style={{
            resize: 'none', border: 'none', background: 'transparent',
            padding: '2px 0', fontSize: 13,
            maxHeight: 120, lineHeight: 1.6,
          }}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '8px 14px', flexShrink: 0, fontSize: 13 }}
          onClick={() => send()}
          disabled={streaming || !input.trim()}
        >
          {streaming ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '↑ Send'}
        </button>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}