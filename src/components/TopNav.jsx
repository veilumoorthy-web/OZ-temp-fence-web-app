import { NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <header className="topnav">
      <div className="topnav-brand">
        <span className="brand-logo">O</span>
        <span className="brand-name">Oz Temp Fence</span>
        <span className="brand-sub">Case management</span>
      </div>
      <nav className="topnav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Customer chat
        </NavLink>
        <NavLink to="/inbox" className={({ isActive }) => (isActive ? 'active' : '')}>
          Case inbox
        </NavLink>
        <NavLink to="/gmail-inbox" className={({ isActive }) => (isActive ? 'active' : '')}>
          Gmail inbox
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
          Analytics
        </NavLink>
      </nav>
    </header>
  )
}
