import { Routes, Route } from 'react-router-dom'
import TopNav from './components/TopNav.jsx'
import CustomerChat from './pages/CustomerChat.jsx'
import CaseInbox from './pages/CaseInbox.jsx'
import CaseDetail from './pages/CaseDetail.jsx'
import GmailInbox from './pages/GmailInbox.jsx'
import Analytics from './pages/Analytics.jsx'

export default function App() {
  return (
    <div className="app">
      <TopNav />
      <main>
        <Routes>
          <Route path="/" element={<CustomerChat />} />
          <Route path="/inbox" element={<CaseInbox />} />
          <Route path="/gmail-inbox" element={<GmailInbox />} />
          <Route path="/case/:id" element={<CaseDetail />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  const onCaseDetail = window.location.pathname.startsWith('/case/')
  const onAnalytics = window.location.pathname.startsWith('/analytics')
  if (!onCaseDetail && !onAnalytics) return null
  return (
    <footer className="app-footer">
      <div>
        <strong>Architecture</strong>
        <span className="sep">·</span>
        <span>Meta WhatsApp Cloud API</span>
        <span className="sep">·</span>
        <span>self-hosted n8n</span>
        <span className="sep">·</span>
        <span>PostgreSQL / Supabase</span>
        <span className="sep">·</span>
        <span>React frontend</span>
      </div>
      <div className="footer-right">Incoming messages auto-create trackable cases · prototype</div>
    </footer>
  )
}
