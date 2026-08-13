import { useEffect, useState } from 'react'
import { checkHealth } from '../api/client.js'

export function useBackendStatus(pollMs = 15000) {
  const [status, setStatus] = useState({ online: null, detail: null })

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const data = await checkHealth()
        if (!cancelled) setStatus({ online: true, detail: data })
      } catch {
        if (!cancelled) setStatus({ online: false, detail: null })
      }
    }

    poll()
    const id = setInterval(poll, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  return status
}
