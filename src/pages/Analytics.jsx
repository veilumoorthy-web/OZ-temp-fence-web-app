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

  const totalInquiries = cases?.length || 0
  const pendingReplies = (cases || []).filter(c => c.unread > 0).length || 0
  const completedOrders = (cases || []).filter(c => ['Resolved', 'Closed'].includes(c.status)).length || 0

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const counts = { 
      Sun: { customers: 0, orders: 0 }, 
      Mon: { customers: 0, orders: 0 }, 
      Tue: { customers: 0, orders: 0 }, 
      Wed: { customers: 0, orders: 0 }, 
      Thu: { customers: 0, orders: 0 }, 
      Fri: { customers: 0, orders: 0 }, 
      Sat: { customers: 0, orders: 0 } 
    }
    ;(cases || []).forEach(c => {
      let d = new Date(c.opened)
      if (isNaN(d.getTime())) d = new Date(c.lastMessageTime)
      const day = !isNaN(d.getTime()) ? days[d.getDay()] : days[new Date().getDay()]
      
      counts[day].customers++
      // Consider it an order if there are related orders or status is Resolved/Closed
      if ((c.relatedOrders && c.relatedOrders.length > 0) || ['Resolved', 'Closed'].includes(c.status)) {
        counts[day].orders++
      }
    })
    return [
      { day: 'Mon', customers: counts['Mon'].customers, orders: counts['Mon'].orders },
      { day: 'Tue', customers: counts['Tue'].customers, orders: counts['Tue'].orders },
      { day: 'Wed', customers: counts['Wed'].customers, orders: counts['Wed'].orders },
      { day: 'Thu', customers: counts['Thu'].customers, orders: counts['Thu'].orders },
      { day: 'Fri', customers: counts['Fri'].customers, orders: counts['Fri'].orders },
      { day: 'Sat', customers: counts['Sat'].customers, orders: counts['Sat'].orders },
      { day: 'Sun', customers: counts['Sun'].customers, orders: counts['Sun'].orders },
    ]
  }, [cases])

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(statuses.map((s) => [s, 0]))
    ;(cases || []).forEach((c) => {
      let st = c.status
      if (st === 'New') st = 'New Case' // map 'New' to 'New Case' for the chart
      if (counts[st] !== undefined) {
        counts[st]++
      }
    })
    return counts
  }, [cases])

  const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.customers))
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts))

  const insights = useMemo(() => {
    if (!cases || cases.length === 0) return null;
    
    let busiestDay = weeklyData[0];
    weeklyData.forEach(d => {
      if (d.customers > busiestDay.customers) busiestDay = d;
    });

    const criticalCount = cases.filter(c => c.priority?.includes('1')).length;

    const channels = {};
    cases.forEach(c => {
      const ch = c.channel || 'Unknown';
      channels[ch] = (channels[ch] || 0) + 1;
    });
    const mostCommonChannel = Object.entries(channels).sort((a,b) => b[1] - a[1])[0][0];

    return {
      busiestDay: busiestDay.day,
      criticalCount,
      mostCommonChannel
    };
  }, [cases, weeklyData]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  return (
    <div className="analytics-page">
      <h1>Analytics</h1>
      <p className="muted">Live overview of WhatsApp inquiries and case throughput</p>

      <div className="stat-cards">
        <StatCard label="Total inquiries" value={totalInquiries} delta={analyticsData.totalInquiriesDelta} deltaGood />
        <StatCard label="Pending replies" value={pendingReplies} delta="needs attention" deltaWarn />
        <StatCard label="Completed orders" value={completedOrders} delta="Resolved + Closed" />
        <StatCard label="Avg response time" value={analyticsData.avgResponseTime} delta={analyticsData.avgResponseDelta} deltaGood />
        <StatCard label="Lead conversion" value={`${analyticsData.leadConversion}%`} delta="inquiry → order" />
      </div>

      <div className="analytics-panels">
        <div className="panel">
          <h3>Inquiries this week</h3>
          <p className="muted panel-sub">New WhatsApp conversations per day</p>
          <div className="bar-chart">
            {weeklyData.map((d) => (
              <div className="bar-col" key={d.day}>
                <div className="bar-value">{d.customers}</div>
                <div
                  className="bar"
                  style={{ height: `${(d.customers / maxWeekly) * 160}px` }}
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
      <div className="analytics-panels" style={{ marginTop: '20px' }}>
        <div className="panel">
          <h3>Conversion trend</h3>
          <p className="muted panel-sub">New customers vs orders this week</p>
          <LineGraph data={weeklyData} />
        </div>
        <div className="panel">
          <h3>Analysis Insights</h3>
          <p className="muted panel-sub">Key takeaways from current data</p>
          {insights ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #0f6b52' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: '#374151' }}>Busiest Day</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{insights.busiestDay}</span>
              </div>
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #d1477a' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: '#374151' }}>Critical Cases</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{insights.criticalCount}</span>
              </div>
              <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #2f6fd6' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: '#374151' }}>Top Channel</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', textTransform: 'capitalize' }}>{insights.mostCommonChannel}</span>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: '20px' }}>No data available to generate insights.</p>
          )}
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

function LineGraph({ data }) {
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.customers, d.orders)))
  
  const w = 800
  const h = 200
  const padX = 40
  
  const getX = (index) => padX + (index / (data.length - 1)) * (w - 2 * padX)
  const getY = (val) => h - (val / maxVal) * (h - 20)

  const custPoints = data.map((d, i) => `${getX(i)},${getY(d.customers)}`).join(' ')
  const orderPoints = data.map((d, i) => `${getX(i)},${getY(d.orders)}`).join(' ')

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '20px 0 10px 0' }}>
      <svg viewBox={`0 0 ${w} ${h + 40}`} style={{ width: '100%', height: 'auto', minWidth: '500px', display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(ratio => (
          <line key={ratio} x1={0} y1={(h - 20) * ratio + 20} x2={w} y2={(h - 20) * ratio + 20} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        
        {/* Customers Line */}
        <polyline points={custPoints} fill="none" stroke="#2f6fd6" strokeWidth="3" />
        {data.map((d, i) => (
          <circle key={'c'+i} cx={getX(i)} cy={getY(d.customers)} r="5" fill="#2f6fd6" />
        ))}
        
        {/* Orders Line */}
        <polyline points={orderPoints} fill="none" stroke="#0f6b52" strokeWidth="3" />
        {data.map((d, i) => (
          <circle key={'o'+i} cx={getX(i)} cy={getY(d.orders)} r="5" fill="#0f6b52" />
        ))}
        
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={d.day} x={getX(i)} y={h + 30} fontSize="14" fill="#6b7280" textAnchor="middle">
            {d.day}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '10px', fontSize: '14px', color: '#4b5563' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#2f6fd6', borderRadius: '50%' }}></div> New Customers
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#0f6b52', borderRadius: '50%' }}></div> Orders
        </div>
      </div>
    </div>
  )
}
