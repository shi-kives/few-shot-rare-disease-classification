import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address to continue.')
      return
    }
    setError('')
    setSubmitting(true)
    setTimeout(() => {
      login(email)
      navigate('/diagnose', { replace: true })
    }, 350)
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <div className="login-logo">Dx</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Diagnosis Assistant</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Prototype-based clinical image review</p>
          </div>
        </div>

        <div className="login-card">
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Enter your email for temporary access. No password needed while single sign-on is being set up.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="clinician@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />
            {error && (
              <p role="alert" style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>
                {error}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.5 }}>
            This is a temporary access mode: entering any email creates a local session on this device.
            It does not verify identity and should be replaced with real authentication before handling
            patient data.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          For clinical decision support only. Not a substitute for professional medical judgment.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(1200px 600px at 15% -10%, var(--teal-050), transparent 60%),
            radial-gradient(900px 500px at 110% 10%, var(--teal-100), transparent 55%),
            var(--bg);
          padding: 24px;
        }
        .login-panel { width: 100%; max-width: 420px; }
        .login-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .login-logo {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--teal-800); color: var(--text-on-teal);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 15px;
        }
        .login-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 32px;
        }
        .login-input {
          width: 100%;
          margin-top: 6px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-strong);
          background: var(--surface-sunken);
          font-size: 15px;
          color: var(--text-primary);
          transition: border-color 120ms ease, background 120ms ease;
        }
        .login-input:focus {
          outline: none;
          border-color: var(--teal-500);
          background: var(--surface);
        }
        .login-submit {
          width: 100%;
          margin-top: 20px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          background: var(--teal-600);
          color: var(--text-on-teal);
          font-weight: 600;
          font-size: 15px;
          transition: background 120ms ease, transform 120ms ease;
        }
        .login-submit:hover:not(:disabled) { background: var(--teal-700); }
        .login-submit:active:not(:disabled) { transform: translateY(1px); }
        .login-submit:disabled { opacity: 0.7; cursor: progress; }
      `}</style>
    </div>
  )
}
