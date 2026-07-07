import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCases } from '../CasesContext.jsx'
import { colorForName, initials, statuses } from '../data'
import StatusBadge from '../components/StatusBadge.jsx'

const ITEMS_PER_PAGE = 10

const filters = ['All', ...statuses]

export default function CaseInbox() {
  const { cases, loading, error } = useCases()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const safeCases = cases || []
  const unreadCount = safeCases.filter((c) => c.unread > 0).length

  const filtered = useMemo(() => {
    const list = safeCases
      .filter((c) => {
        const matchesFilter = filter === 'All' || c.status === filter
        const q = query.trim().toLowerCase()
        const matchesQuery =
          !q ||
          c.customer?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q)
        return matchesFilter && matchesQuery
      })
    // Sort by most recent first — based on lastMessageTime
    return [...list].sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime() || parseInt((a.id || '').replace(/\D/g, ''), 10) || 0
      const timeB = new Date(b.lastMessageTime).getTime() || parseInt((b.id || '').replace(/\D/g, ''), 10) || 0
      return timeB - timeA
    })
  }, [safeCases, filter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filter/search changes
  const handleFilter = (f) => { setFilter(f); setPage(1) }
  const handleQuery = (q) => { setQuery(q); setPage(1) }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  return (
    <div className="inbox-page">
      <div className="inbox-header">
        <div>
          <h1>Case inbox</h1>
          <p className="muted">
            {filtered.length} of {safeCases.length} cases · {unreadCount} with unread
          </p>
        </div>
        <div className="search-box">
          <span className="search-icon"></span>
          <input
            placeholder="Search name, phone or case ID"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="filter-pills">
        {filters.map((f) => (
          <button
            key={f}
            className={`pill${filter === f ? ' pill-active' : ''}`}
            onClick={() => handleFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="inbox-table">
        <div className="inbox-row inbox-row-head">
          <span>CUSTOMER</span>
          <span>LAST MESSAGE</span>
          <span>ASSIGNEE</span>
          <span>STATUS</span>
        </div>
        {paginated.map((c) => (
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
        {paginated.length === 0 && <div className="inbox-empty">No cases match your search.</div>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-num${currentPage === p ? ' page-num-active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages} · {filtered.length} cases
          </span>
        </div>
      )}
    </div>
  )
}
