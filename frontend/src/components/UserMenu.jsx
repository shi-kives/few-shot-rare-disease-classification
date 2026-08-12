import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
}

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function go(path) {
    setOpen(false)
    navigate(path)
  }

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initialsOf(user.name)}
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-header">
            <div className="user-menu-avatar">{initialsOf(user.name)}</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{user.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>

          <div className="user-menu-divider" />

          <button className="user-menu-item" role="menuitem" onClick={() => go('/profile')}>
            <span>Profile</span>
          </button>
          <button className="user-menu-item" role="menuitem" onClick={() => go('/history')}>
            <span>Search history</span>
          </button>
          <button className="user-menu-item" role="menuitem" onClick={() => go('/profile#settings')}>
            <span>Settings</span>
          </button>

          <div className="user-menu-divider" />

          <button className="user-menu-item user-menu-item-danger" role="menuitem" onClick={handleLogout}>
            <span>Sign out</span>
          </button>
        </div>
      )}

      <style>{`
        .user-menu { position: relative; }
        .user-menu-trigger {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--teal-700); color: var(--text-on-teal);
          font-family: var(--font-display); font-weight: 600; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid transparent;
          transition: border-color 120ms ease;
        }
        .user-menu-trigger:hover { border-color: var(--teal-100); }
        .user-menu-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 260px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-pop);
          padding: 8px;
          z-index: 40;
          animation: menu-in 120ms ease;
        }
        @keyframes menu-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .user-menu-header { display: flex; align-items: center; gap: 10px; padding: 8px; }
        .user-menu-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: var(--teal-100); color: var(--teal-800);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 600; font-size: 12px;
        }
        .user-menu-divider { height: 1px; background: var(--border); margin: 6px 4px; }
        .user-menu-item {
          width: 100%; text-align: left; padding: 9px 10px;
          border-radius: var(--radius-sm); font-size: 14px; color: var(--text-primary);
          display: flex; align-items: center; justify-content: space-between;
        }
        .user-menu-item:hover { background: var(--surface-sunken); }
        .user-menu-item-danger { color: var(--red); }
        .user-menu-item-danger:hover { background: var(--red-bg); }
      `}</style>
    </div>
  )
}
