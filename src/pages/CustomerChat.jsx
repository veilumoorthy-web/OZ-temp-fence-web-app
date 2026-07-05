import { useState, useRef, useEffect } from 'react'
import { useCases } from '../CasesContext.jsx'
import { initials } from '../data'

export default function CustomerChat() {
  const { cases, addMessage, loading, error } = useCases()
  const [draft, setDraft] = useState('')
  const [activeCaseId, setActiveCaseId] = useState(null)
  const scrollRef = useRef(null)

  const activeCase = cases?.find(c => c.id === activeCaseId)

  useEffect(() => {
    if (activeCase?.messages) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [activeCase?.messages?.length])

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>
  if (!cases || cases.length === 0) return <div style={{ padding: 20 }}>No cases found. Please check your Google Sheet.</div>

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    addMessage(activeCase.id, { from: 'customer', text, time })
    setDraft('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') send()
  }

  if (!activeCase) {
    return (
      <div className="chat-page" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', color: '#1a1a1a', marginBottom: '12px', fontWeight: '700' }}>Customer Conversations</h2>
          <p style={{ color: '#666', fontSize: '18px' }}>
            Select a customer below to view their complete chat history and reply in real-time.
          </p>
        </div>
        
        <div style={{ maxWidth: 600, width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cases.map(c => (
            <div 
              key={c.id} 
              onClick={() => setActiveCaseId(c.id)}
              style={{ 
                background: '#fff', 
                borderRadius: '16px', 
                padding: '20px 24px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                cursor: 'pointer', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                transition: 'all 0.2s ease',
                border: '1px solid #eaeaea'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 107, 82, 0.15)';
                e.currentTarget.style.borderColor = '#0f6b52';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#eaeaea';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="avatar" style={{ background: '#0f6b52', color: '#fff', width: '56px', height: '56px', fontSize: '20px' }}>
                  {initials(c.customer || c.phone)}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '18px', color: '#222' }}>{c.customer || c.phone}</span>
                  <span style={{ color: '#666', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#4CAF50' }}></span>
                    Online via WhatsApp
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: '#0f6b52', fontWeight: '600', fontSize: '14px', background: '#e8f3ef', padding: '6px 12px', borderRadius: '24px' }}>
                  {c.id}
                </span>
                <span style={{ color: '#888', fontSize: '13px' }}>{c.messages?.length || 0} messages</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <p className="chat-page-note">
        This is the customer's phone. Messages you send here appear as a live case on the admin
        dashboard.
      </p>

      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-header">
          <span className="phone-back" onClick={() => setActiveCaseId(null)} style={{ cursor: 'pointer', padding: '0 10px' }}>‹</span>
          <span className="phone-avatar" style={{ background: '#ddd', color: '#333' }}>{initials(activeCase.customer)}</span>
          <div className="phone-header-text">
            <div className="phone-title">{activeCase.customer || activeCase.phone}</div>
            <div className="phone-subtitle">online</div>
          </div>
          <div className="phone-icons">
            <span title="Video call">🎥</span>
            <span title="Call">📞</span>
          </div>
        </div>

        <div className="phone-body" ref={scrollRef}>
          <div className="phone-encryption-note">
            Messages are secured. Oz Temp Fence typically replies within 15 minutes.
          </div>
          {activeCase.messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.from === 'customer' ? 'right' : 'left'}`}>
              <div className={`bubble ${m.from === 'customer' ? 'bubble-customer' : 'bubble-agent'}`}>
                <div>{m.text}</div>
                <div className="bubble-time">
                  {m.time}
                  {m.from === 'customer' && <span className="ticks"> ✓✓</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="phone-input-row">
          <span className="phone-clip">📎</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message"
          />
          <button className="phone-send" onClick={send} aria-label="Send">
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
