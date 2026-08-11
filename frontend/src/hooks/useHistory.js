import { useCallback, useEffect, useState } from 'react'

function keyFor(email) {
  return `da_history_${email || 'anon'}`
}

export function useHistory(email) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(email))
      setEntries(raw ? JSON.parse(raw) : [])
    } catch {
      setEntries([])
    }
  }, [email])

  const addEntry = useCallback(
    (entry) => {
      setEntries((prev) => {
        const next = [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry }, ...prev].slice(0, 100)
        localStorage.setItem(keyFor(email), JSON.stringify(next))
        return next
      })
    },
    [email]
  )

  const updateEntry = useCallback(
    (id, patch) => {
      setEntries((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
        localStorage.setItem(keyFor(email), JSON.stringify(next))
        return next
      })
    },
    [email]
  )

  const clearHistory = useCallback(() => {
    localStorage.removeItem(keyFor(email))
    setEntries([])
  }, [email])

  return { entries, addEntry, updateEntry, clearHistory }
}
