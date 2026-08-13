import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'da_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())
  const [ready, setReady] = useState(true)

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }, [user])

  // Temporary access: any well-formed email "logs in". No password —
  // this stands in for real auth until the backend exposes an auth route.
  function login(email) {
    const trimmed = email.trim().toLowerCase()
    const session = {
      email: trimmed,
      name: trimmed.split('@')[0].replace(/[._-]+/g, ' '),
      loggedInAt: new Date().toISOString(),
    }
    setUser(session)
    return session
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
