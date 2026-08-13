import { NavLink } from 'react-router-dom'
import UserMenu from './UserMenu.jsx'
import { useBackendStatus } from '../hooks/useBackendStatus.js'

export default function Navbar() {
  const { online } = useBackendStatus()

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo">Dx</div>
          <span className="navbar-title">Diagnosis Assistant</span>
        </div>

        <nav className="navbar-links">
          <NavLink to="/diagnose" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            Diagnose
          </NavLink>
          <NavLink to="/add-class" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
            Add class
          </NavLink>
        </nav>

        <div className="navbar-right">
          <span className={`status-pill ${online ? 'status-online' : online === false ? 'status-offline' : 'status-pending'}`}>
            <span className="status-dot" />
            {online === null ? 'CHECKING…' : online ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
          </span>
          <UserMenu />
        </div>
      </div>

      <style>{`
        .navbar {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .navbar-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .navbar-brand { display: flex; align-items: center; gap: 10px; }
        .navbar-logo {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--teal-800); color: var(--text-on-teal);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 12px;
        }
        .navbar-title { font-family: var(--font-display); font-weight: 600; font-size: 16px; }
        .navbar-links { display: flex; gap: 24px; flex: 1; }
        .navbar-link {
          font-size: 14px; font-weight: 500; color: var(--text-secondary);
          padding: 6px 2px; border-bottom: 2px solid transparent;
        }
        .navbar-link:hover { color: var(--text-primary); }
        .navbar-link.active { color: var(--teal-700); border-bottom-color: var(--teal-600); }
        .navbar-right { display: flex; align-items: center; gap: 14px; }
        .status-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
          padding: 6px 10px; border-radius: 999px;
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-online { background: var(--green-bg); color: var(--green); }
        .status-online .status-dot { background: var(--green); }
        .status-offline { background: var(--red-bg); color: var(--red); }
        .status-offline .status-dot { background: var(--red); }
        .status-pending { background: var(--surface-sunken); color: var(--text-muted); }
        .status-pending .status-dot { background: var(--text-muted); }
      `}</style>
    </header>
  )
}
