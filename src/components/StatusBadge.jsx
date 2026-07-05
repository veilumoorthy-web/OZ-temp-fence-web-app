const statusClass = {
  'New Case': 'badge-new',
  'Assigned': 'badge-assigned',
  'In Progress': 'badge-progress',
  'Waiting for Customer': 'badge-waiting',
  'Resolved': 'badge-resolved',
  'Closed': 'badge-closed',
}

export default function StatusBadge({ status }) {
  return <span className={`badge ${statusClass[status] || ''}`}>{status}</span>
}
