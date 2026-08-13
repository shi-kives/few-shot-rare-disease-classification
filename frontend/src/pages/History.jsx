import { useAuth } from '../context/AuthContext.jsx'
import { useHistory } from '../hooks/useHistory.js'

const LEVEL_COLOR = { HIGH: 'var(--green)', MODERATE: 'var(--amber)', LOW: 'var(--red)' }

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function History() {
  const { user } = useAuth()
  const { entries, clearHistory } = useHistory(user?.email)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Search history</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14.5 }}>
            Diagnoses run on this device, stored locally for {user?.email}.
          </p>
        </div>
        {entries.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>
            Clear history
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No diagnoses yet</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Run a prediction from the Diagnose tab and it will show up here.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {entries.map((e) => (
            <div className="history-row" key={e.id}>
              <div className="history-thumb">{e.thumbnail && <img src={e.thumbnail} alt={e.fileName} />}</div>
              <div className="history-main">
                <p style={{ fontWeight: 600, fontSize: 14.5 }}>{e.prediction}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mono">
                  {e.fileName} · {formatDate(e.timestamp)}
                </p>
              </div>
              <div className="history-meta">
                <span className="history-confidence mono">{(e.confidence * 100).toFixed(1)}%</span>
                <span className="history-level" style={{ color: LEVEL_COLOR[e.confidenceLevel] || 'var(--text-muted)' }}>
                  {e.confidenceLevel}
                </span>
              </div>
              <div className="history-feedback">
                {e.feedback ? (
                  <span className="feedback-chip">reviewed → {e.feedback}</span>
                ) : (
                  <span className="feedback-chip feedback-chip-muted">no feedback</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .clear-btn {
          font-size: 13px; font-weight: 600; color: var(--red);
          padding: 8px 14px; border-radius: var(--radius-sm); background: var(--red-bg);
        }
        .clear-btn:hover { filter: brightness(0.95); }
        .empty-state {
          background: var(--surface); border: 1px dashed var(--border-strong);
          border-radius: var(--radius-lg); padding: 40px; text-align: center;
        }
        .history-list { display: flex; flex-direction: column; gap: 10px; }
        .history-row {
          display: grid; grid-template-columns: 48px 1fr auto auto; align-items: center; gap: 16px;
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);
          padding: 12px 16px;
        }
        .history-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; background: var(--surface-sunken); }
        .history-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .history-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .history-confidence { font-size: 13px; font-weight: 600; }
        .history-level { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; }
        .feedback-chip { font-size: 11.5px; font-weight: 600; color: var(--teal-700); background: var(--teal-050); padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
        .feedback-chip-muted { color: var(--text-muted); background: var(--surface-sunken); }

        @media (max-width: 640px) {
          .history-row { grid-template-columns: 40px 1fr; }
          .history-meta, .history-feedback { grid-column: 2; justify-self: start; }
        }
      `}</style>
    </div>
  )
}
