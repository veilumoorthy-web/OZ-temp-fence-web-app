import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCases } from '../CasesContext.jsx'
import { colorForName, initials, statuses } from '../data'
import StatusBadge from '../components/StatusBadge.jsx'

const filters = ['All', ...statuses]

export default function CaseInbox() {
  const { cases, loading, error } = useCases()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const safeCases = cases || []
  const unreadCount = safeCases.filter((c) => c.unread > 0).length

  const filtered = useMemo(() => {
    return safeCases.filter((c) => {
      const matchesFilter = filter === 'All' || c.status === filter
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        c.customer?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [safeCases, filter, query])

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  return (
    <div className="inbox-page">
      <div className="inbox-header">
        <div>
          <h1>Case inbox</h1>
          <p className="muted">
            {cases.length} of {cases.length} cases · {unreadCount} with unread
          </p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search name, phone or case ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>



      <div className="inbox-table">
        <div className="inbox-row inbox-row-head">
          <span>CUSTOMER</span>
          <span>LAST MESSAGE</span>
          <span>ASSIGNEE</span>
          <span>STATUS</span>
        </div>
        {filtered.map((c) => (
          <div
            key={c.id}
            className="inbox-row inbox-row-body"
            onClick={() => navigate(`/case/${c.id}`)}
          >
            <span className="customer-cell">
              <span className="avatar" style={{ background: colorForName(c.customer) }}>
                {initials(c.customer)}
                {c.unread > 0 && <span className="unread-dot">{c.unread}</span>}
              </span>
              <span>
                <div className="customer-name">{c.customer}</div>
                <div className="customer-sub">
                  {c.id} · {c.phone}
                </div>
              </span>
            </span>
            <span className="last-message-cell">
              <div className="last-message-text">{c.lastMessage}</div>
              <div className="last-message-time">{c.lastMessageTime}</div>
            </span>
            <span>{c.assignee}</span>
            <span>
              <StatusBadge status={c.status} />
            </span>
          </div>
        ))}
        {filtered.length === 0 && <div className="inbox-empty">No cases match your search.</div>}
      </div>
    </div>
  )
}
