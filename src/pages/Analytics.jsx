import { useMemo } from 'react'
import { useCases } from '../CasesContext.jsx'
import { analyticsData, statuses } from '../data'

const statusColors = {
  'New Case': '#2f6fd6',
  'Assigned': '#c9c9c9',
  'In Progress': '#c9601a',
  'Waiting for Customer': '#1fa89a',
  'Resolved': '#0f6b52',
  'Closed': '#7a8894',
}

export default function Analytics() {
  const { cases, loading, error } = useCases()

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(statuses.map((s) => [s, 0]))
    ;(cases || []).forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1
    })
    return counts
  }, [cases])

  const maxWeekly = Math.max(...analyticsData.weekly.map((d) => d.value))
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts))

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  return (
    <div className="analytics-page">
      <h1>Analytics</h1>
      <p className="muted">Live overview of WhatsApp inquiries and case throughput</p>

      <div className="stat-cards">
        <StatCard label="Total inquiries" value={analyticsData.totalInquiries} delta={analyticsData.totalInquiriesDelta} deltaGood />
        <StatCard label="Pending replies" value={analyticsData.pendingReplies} delta="needs attention" deltaWarn />
        <StatCard label="Completed orders" value={analyticsData.completedOrders} delta="Resolved + Closed" />
        <StatCard label="Avg response time" value={analyticsData.avgResponseTime} delta={analyticsData.avgResponseDelta} deltaGood />
        <StatCard label="Lead conversion" value={`${analyticsData.leadConversion}%`} delta="inquiry → order" />
      </div>

      <div className="analytics-panels">
        <div className="panel">
          <h3>Inquiries this week</h3>
          <p className="muted panel-sub">New WhatsApp conversations per day</p>
          <div className="bar-chart">
            {analyticsData.weekly.map((d) => (
              <div className="bar-col" key={d.day}>
                <div className="bar-value">{d.value}</div>
                <div
                  className="bar"
                  style={{ height: `${(d.value / maxWeekly) * 160}px` }}
                />
                <div className="bar-label">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Cases by status</h3>
          <p className="muted panel-sub">Current distribution</p>
          <div className="status-bars">
            {statuses.map((s) => (
              <div className="status-bar-row" key={s}>
                <div className="status-bar-top">
                  <span>{s}</span>
                  <strong>{statusCounts[s]}</strong>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${(statusCounts[s] / maxStatusCount) * 100}%`,
                      background: statusColors[s],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, delta, deltaGood, deltaWarn }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-delta ${deltaGood ? 'delta-good' : ''} ${deltaWarn ? 'delta-warn' : ''}`}>
        {delta}
      </div>
    </div>
  )
}
