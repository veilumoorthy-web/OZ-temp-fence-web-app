import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCases } from '../CasesContext.jsx'
import { colorForName, initials, statuses, priorities, assignees } from '../data'
import StatusBadge from '../components/StatusBadge.jsx'

const quickReplies = [
  'Thanks for reaching out! How can we help?',
  "I'll prepare a quote for you now.",
  'Can you confirm the delivery address?',
  'Your delivery is confirmed — thank you!',
]

const gmailSuggestions = [
  `Hi,

Thank you for contacting OZ Temp Fencing.

To prepare your quote, please reply with the following information:

1. Site Address:
2. Installation Date:
3. Pickup/Removal Date:
4. Approximate Fence Length (metres):
5. Purpose of the Fence (Construction / Event / Pool Safety / Other):
6. Is Gate or Pedestrian Access Required? (Yes/No)
7. Ground Surface (Grass / Concrete / Dirt / Gravel / Other):
8. Onsite Contact Name:
9. Email Address:
10. Phone Number:

Once we receive these details, we'll prepare your quote and get back to you as soon as possible.

Kind regards,

OZ Temp Fencing Team`,
]

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cases, updateCase, addMessage, loading, error } = useCases()
  const [tab, setTab] = useState('Activity')
  const isEmailChannel = (cases || []).find((x) => x.id === id)?.channel === 'email'
  const [replyMode, setReplyMode] = useState(isEmailChannel ? 'Reply via Gmail' : 'Reply to customer')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState(null)

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  const c = (cases || []).find((x) => x.id === id)

  if (!c) {
    return (
      <div className="case-detail-page">
        <p>Case {id} not found. <Link to="/inbox">Back to inbox</Link></p>
      </div>
    )
  }

  const field = (key, value) => updateCase(c.id, { [key]: value })

  const postReply = async () => {
    const text = draft.trim()
    if (!text) return

    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    // ── Email reply (Reply via Gmail) ─────────────────────────────────────────
    if (replyMode === 'Reply via Gmail') {
      setIsSending(true)
      try {
        const webhookUrl = import.meta.env.VITE_N8N_EMAIL_REPLY_WEBHOOK
        if (!webhookUrl) {
          throw new Error('Email webhook URL is not configured (VITE_N8N_EMAIL_REPLY_WEBHOOK)')
        }

        const payload = {
          caseId: c.id,
          reply: text,
          agent: 'Agent',
          channel: 'email',
        }

        let res
        try {
          res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } catch (networkErr) {
          throw new Error(`Network error: ${networkErr.message}`)
        }

        if (!res.ok) {
          throw new Error(`Server responded with ${res.status} ${res.statusText}`)
        }

        // Success — update UI and clear draft
        addMessage(c.id, { from: 'agent', text, time })
        setDraft('')
        setToast({ type: 'success', message: 'Email reply sent successfully!' })
      } catch (err) {
        console.error('[Email Reply]', err)
        // Draft is intentionally NOT cleared on failure
        setToast({ type: 'error', message: `Failed to send email reply: ${err.message}` })
      } finally {
        setIsSending(false)
        setTimeout(() => setToast(null), 4000)
      }
      return
    }

    // ── WhatsApp / other channel reply (Reply to customer) ───────────────────
    if (replyMode === 'Reply to customer') {
      setIsSending(true)
      try {
        const webhookUrl = import.meta.env.VITE_N8N_REPLY_WEBHOOK
        if (!webhookUrl) {
          throw new Error('Webhook URL not configured')
        }

        const payload = {
          caseId: c.id,
          customerId: c.customer,
          phone: c.phone,
          customerName: c.customer,
          message: text,
          agent: 'Current Agent',
          channel: c.channel || 'whatsapp',
          timestamp: new Date().toISOString(),
        }

        let res
        try {
          res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } catch (networkErr) {
          throw new Error(`Network error: ${networkErr.message}`)
        }

        if (!res.ok) {
          throw new Error('Failed to send')
        }

        addMessage(c.id, { from: 'agent', text, time })
        setDraft('')
        setToast({ type: 'success', message: 'Reply sent successfully!' })
      } catch (err) {
        console.error(err)
        setToast({ type: 'error', message: `Failed to send reply: ${err.message}` })
      } finally {
        setIsSending(false)
        setTimeout(() => setToast(null), 3000)
      }
      return
    }

    // ── Work note ─────────────────────────────────────────────────────────────
    addMessage(c.id, { from: 'note', text, time })
    setDraft('')
  }


  const onSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="case-detail-page">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, padding: 15, background: toast.type === 'success' ? '#0f6b52' : '#e02424', color: '#fff', borderRadius: 4, zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {toast.message}
        </div>
      )}
      <div className="breadcrumbs">
        <Link to="/inbox">Cases</Link> <span>›</span> <span>{c.id}</span>
      </div>

      <div className="case-card">
        <div className={`case-card-accent priority-${c.priority[0]}`} />
        <div className="case-card-top">
          <div>
            <div className="case-title-row">
              <h1>{c.id}</h1>
              <StatusBadge status={c.status} />
              {c.priority.startsWith('1') && <span className="badge badge-critical">1 - Critical</span>}
            </div>
            <p className="muted">{c.shortDescription}</p>
          </div>
          <div className="case-actions">
            <button className="btn-outline" onClick={() => navigate('/inbox')}>
              Back to inbox
            </button>
            <button className="btn-primary" onClick={onSave}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>



        <div className="case-fields">
          <h3 className="section-label">Case details</h3>
          <div className="fields-grid">
            <FieldRO label="Number" value={c.id} />
            <FieldRO label="Channel" value={c.channel} dot />
            <FieldRO label="Customer" value={c.customer} avatar />
            <FieldRO label="Phone" value={c.phone} />
            <FieldSelect label="State" value={c.status} options={statuses} onChange={(v) => field('status', v)} />
            <FieldSelect label="Priority" value={c.priority} options={priorities} onChange={(v) => field('priority', v)} />
            <FieldRO label="Assignment group" value="Field operations" />
            <FieldSelect label="Assigned to" value={c.assignee} options={assignees} onChange={(v) => field('assignee', v)} />
            <FieldRO label="Opened" value={c.opened} />
            <FieldRO label="Customer since" value={c.customerSince} />
          </div>
          <div className="field field-full">
            <label>Short description</label>
            <input
              value={c.shortDescription}
              onChange={(e) => field('shortDescription', e.target.value)}
            />
          </div>
        </div>

        <div className="sub-tabs">
          <button
            className={tab === 'Activity' ? 'sub-tab-active' : ''}
            onClick={() => setTab('Activity')}
          >
            Activity
          </button>
          <button
            className={tab === 'Related orders' ? 'sub-tab-active' : ''}
            onClick={() => setTab('Related orders')}
          >
            Related orders
          </button>
        </div>

        {tab === 'Activity' ? (
          <div className="activity-panel">
            <div className="reply-mode-tabs">
              {c.channel !== 'email' && (
                <button
                  className={replyMode === 'Reply to customer' ? 'reply-tab-active' : ''}
                  onClick={() => setReplyMode('Reply to customer')}
                >
                  Reply to customer
                </button>
              )}
              <button
                className={replyMode === 'Reply via Gmail' ? 'reply-tab-active' : ''}
                onClick={() => setReplyMode('Reply via Gmail')}
              >
                Reply via Gmail
              </button>
              <button
                className={replyMode === 'Work note' ? 'reply-tab-active' : ''}
                onClick={() => setReplyMode('Work note')}
              >
                Work note
              </button>
            </div>
            <div className="reply-input-row reply-input-row--gmail">
              <span className="phone-clip">📎</span>
              <textarea
                className={replyMode === 'Reply via Gmail' ? 'reply-textarea reply-textarea--gmail' : 'reply-textarea'}
                placeholder="Write a message... (Enter for new line, click Post reply to send)"
                value={draft}
                rows={replyMode === 'Reply via Gmail' ? 6 : 2}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && replyMode !== 'Reply via Gmail') postReply()
                }}
              />
              <button className="btn-primary" onClick={postReply} disabled={isSending}>
                {isSending ? 'Sending...' : 'Post reply'}
              </button>
            </div>
            {replyMode === 'Reply via Gmail' ? (
              <div className="quick-replies quick-replies--gmail">
                <span className="quick-replies-label">✉️ Gmail suggestions:</span>
                {gmailSuggestions.map((q, i) => (
                  <button key={i} className="quick-reply-chip quick-reply-chip--gmail" onClick={() => setDraft(q)}>
                    Quote request template
                  </button>
                ))}
              </div>
            ) : (
              <div className="quick-replies">
                {quickReplies.map((q) => (
                  <button key={q} className="quick-reply-chip" onClick={() => setDraft(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="activity-feed">
              {[...c.messages].reverse().map((m, i) => (
                <div key={i} className="activity-item">
                  <span
                    className="avatar avatar-sm"
                    style={{ background: m.from === 'agent' ? '#0f6b52' : colorForName(c.customer) }}
                  >
                    {m.from === 'agent' ? 'You' : initials(c.customer)}
                  </span>
                  <div className="activity-body">
                    <div className="activity-meta">
                      <strong>{m.from === 'agent' ? 'You' : c.customer}</strong>
                      <span className="muted">{m.time}</span>
                    </div>
                    <div className={`activity-text ${m.from === 'note' ? 'activity-note' : ''}`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="related-orders-panel">
            {(!c.relatedOrders || c.relatedOrders.length === 0) ? (
              <p className="muted">No related orders linked to this case yet.</p>
            ) : (
              <div className="orders-table-wrap">
                <p className="orders-count muted">{c.relatedOrders.length} order{c.relatedOrders.length !== 1 ? 's' : ''} found for {c.phone}</p>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Payment Status</th>
                      <th>Order Status</th>
                      <th>Invoice No</th>
                      <th>Shipping Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.relatedOrders.map((order, idx) => (
                      <tr key={order['Order ID'] || idx}>
                        <td><span className="order-id-badge">{order['Order ID']}</span></td>
                        <td>{order['Order Date']}</td>
                        <td className="order-amount">{order['Amount']}</td>
                        <td>{order['Payment Method']}</td>
                        <td>
                          <span className={`order-status-badge pay-${(order['Payment Status'] || '').toLowerCase()}`}>
                            {order['Payment Status']}
                          </span>
                        </td>
                        <td>
                          <span className={`order-status-badge ord-${(order['Order Status'] || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {order['Order Status']}
                          </span>
                        </td>
                        <td>{order['Invoice No']}</td>
                        <td className="order-address">{order['Shipping Address'] === 'Same as Billing' ? order['Billing Address'] : order['Shipping Address']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FieldRO({ label, value, dot, avatar }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="field-ro">
        {dot && <span className="status-dot" />}
        {avatar && (
          <span className="avatar avatar-xs" style={{ background: colorForName(value) }}>
            {initials(value)}
          </span>
        )}
        {value}
      </div>
    </div>
  )
}

function FieldSelect({ label, value, options, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
