// Dummy/sample data for the prototype. In a real app this would come from
// a backend (e.g. n8n + Meta WhatsApp Cloud API + Postgres/Supabase).

export const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const avatarColors = [
  '#0f6b52', '#d1477a', '#2f6fd6', '#7a3fd1', '#c9861a', '#5a5a5a',
]

export const colorForName = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export const statuses = [
  'New Case',
  'Assigned',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
]

export const priorities = ['1 - Critical', '2 - High', '3 - Medium', '4 - Low']

export const assignees = ['Unassigned', 'Moorthy', 'Prema', 'Ramya', 'Kaushal', 'Rajesh']

export const initialCases = [
  {
    id: 'OTF-1042',
    customer: 'Rajesh Kumar',
    phone: '+61 412 887 340',
    lastMessage: 'You: Great. For 120m over 6 weeks we can do our standard 2.1m panels...',
    lastMessageTime: '9:21 am',
    assignee: 'Moorthy',
    status: 'In Progress',
    priority: '2 - High',
    channel: 'WhatsApp Business',
    opened: '9:12 am',
    customerSince: 'Jul 2026',
    shortDescription: 'Temporary fencing for construction site in Dandenong, 120m for 6 weeks.',
    unread: 0,
    messages: [
      { from: 'customer', text: 'Hi, I need temporary fencing for a construction site in Dandenong.', time: '9:12 am' },
      { from: 'agent', text: 'Hi Rajesh! Thanks for reaching out to Oz Temp Fence. How many metres do you need, and for how long?', time: '9:15 am' },
      { from: 'customer', text: 'Around 120 metres, for about 6 weeks.', time: '9:18 am' },
      { from: 'agent', text: "Great. For 120m over 6 weeks we can do our standard 2.1m panels with feet and clamps. I'll prepare a quote — can I get the delivery address?", time: '9:21 am' },
    ],
  },
  {
    id: 'OTF-1041',
    customer: 'Sarah Chen',
    phone: '+61 438 210 559',
    lastMessage: "It's fairly urgent — the event is Saturday.",
    lastMessageTime: '10:03 am',
    assignee: 'Unassigned',
    status: 'New Case',
    priority: '1 - Critical',
    channel: 'WhatsApp Business',
    opened: '10:02 am',
    customerSince: 'Jul 2026',
    shortDescription: 'Do you deliver to Geelong? Need fencing for an event this weekend.',
    unread: 2,
    messages: [
      { from: 'customer', text: 'Do you deliver to Geelong? Need fencing for an event this weekend.', time: '10:02 am' },
      { from: 'customer', text: "It's fairly urgent — the event is Saturday.", time: '10:03 am' },
    ],
  },
  {
    id: 'OTF-1040',
    customer: 'David Thompson',
    phone: '+61 401 663 218',
    lastMessage: 'You: We can deliver Thursday morning. Can you confirm...',
    lastMessageTime: 'Yesterday',
    assignee: 'Prema',
    status: 'Waiting for Customer',
    priority: '3 - Medium',
    channel: 'WhatsApp Business',
    opened: 'Yesterday',
    customerSince: 'Jun 2026',
    shortDescription: 'Delivery confirmation pending for site fencing order.',
    unread: 0,
    messages: [
      { from: 'customer', text: 'We need the fencing delivered by end of week.', time: 'Yesterday' },
      { from: 'agent', text: 'We can deliver Thursday morning. Can you confirm the site access hours?', time: 'Yesterday' },
    ],
  },
  {
    id: 'OTF-1039',
    customer: 'Aisha Patel',
    phone: '+61 423 990 172',
    lastMessage: 'Got it, thanks!',
    lastMessageTime: 'Mon',
    assignee: 'Ramya',
    status: 'Resolved',
    priority: '4 - Low',
    channel: 'WhatsApp Business',
    opened: 'Mon',
    customerSince: 'May 2026',
    shortDescription: 'Query about panel dimensions, resolved.',
    unread: 0,
    messages: [
      { from: 'customer', text: 'What are the panel dimensions?', time: 'Mon' },
      { from: 'agent', text: 'Our standard panels are 2.1m x 2.4m.', time: 'Mon' },
      { from: 'customer', text: 'Got it, thanks!', time: 'Mon' },
    ],
  },
  {
    id: 'OTF-1038',
    customer: "Liam O'Brien",
    phone: '+61 455 302 887',
    lastMessage: 'You: Thanks Liam, pleasure doing business. Reach out any time!',
    lastMessageTime: 'Last week',
    assignee: 'Kaushal',
    status: 'Closed',
    priority: '3 - Medium',
    channel: 'WhatsApp Business',
    opened: 'Last week',
    customerSince: 'Mar 2026',
    shortDescription: 'Completed order for hire fencing, closed out.',
    unread: 0,
    messages: [
      { from: 'customer', text: 'Thanks for the quick delivery!', time: 'Last week' },
      { from: 'agent', text: 'Thanks Liam, pleasure doing business. Reach out any time!', time: 'Last week' },
    ],
  },
]

export const analyticsData = {
  totalInquiries: 5,
  totalInquiriesDelta: '+2 this week',
  pendingReplies: 2,
  completedOrders: 2,
  avgResponseTime: '9m 12s',
  avgResponseDelta: '↓ 18% vs last week',
  leadConversion: 40,
  weekly: [
    { day: 'Mon', value: 4 },
    { day: 'Tue', value: 6 },
    { day: 'Wed', value: 3 },
    { day: 'Thu', value: 8 },
    { day: 'Fri', value: 5 },
    { day: 'Sat', value: 2 },
    { day: 'Sun', value: 1 },
  ],
}
