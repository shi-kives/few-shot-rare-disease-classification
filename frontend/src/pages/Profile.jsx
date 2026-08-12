import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { BASE_URL } from '../api/client.js'
import { useHistory } from '../hooks/useHistory.js'

function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function Profile() {
  const { user, logout } = useAuth()
  const { entries, clearHistory } = useHistory(user?.email)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Profile</h1>

      <div className="profile-card">
        <div className="profile-avatar">{initialsOf(user.name)}</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 17, textTransform: 'capitalize' }}>{user.name}</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{user.email}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }} className="mono">
            session started {new Date(user.loggedInAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div id="settings" className="settings-card">
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>Settings</h2>

        <div className="settings-row">
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Backend URL</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Set via <code>VITE_API_BASE_URL</code> at build time.
            </p>
          </div>
          <span className="settings-value mono">{BASE_URL}</span>
        </div>

        <div className="settings-row">
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Local diagnosis history</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {entries.length} saved entr{entries.length === 1 ? 'y' : 'ies'} on this device.
            </p>
          </div>
          <button className="settings-danger-btn" onClick={clearHistory} disabled={entries.length === 0}>
            Clear
          </button>
        </div>

        <div className="settings-row">
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Session</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              Sign out of this temporary session on this device.
            </p>
          </div>
          <button className="settings-danger-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>

      <style>{`
        .profile-card {
          display: flex; align-items: center; gap: 18px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
          padding: 24px; margin-bottom: 20px;
        }
        .profile-avatar {
          width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
          background: var(--teal-700); color: var(--text-on-teal);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 18px;
        }
        .settings-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 24px;
        }
        .settings-row {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 16px 0; border-top: 1px solid var(--border);
        }
        .settings-row:first-of-type { border-top: none; padding-top: 0; }
        .settings-value { font-size: 13px; background: var(--surface-sunken); padding: 6px 10px; border-radius: 6px; }
        .settings-danger-btn {
          font-size: 13px; font-weight: 600; color: var(--red); background: var(--red-bg);
          padding: 8px 14px; border-radius: var(--radius-sm); white-space: nowrap;
        }
        .settings-danger-btn:hover:not(:disabled) { filter: brightness(0.95); }
        .settings-danger-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        code { font-family: var(--font-mono); font-size: 12px; }
      `}</style>
    </div>
  )
}
