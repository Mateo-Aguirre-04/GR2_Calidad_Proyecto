import { useEffect } from 'react'
import { authenticatedFetch } from '../authSession'
import { loadPresenceConfig } from '../presenceConfig'

export function usePresencia() {
  useEffect(() => {
    let timer, stopped = false, busy = false, nextUpdateAt = 0
    let intervalMs = 60 * 60 * 1000
    function programar() {
      clearTimeout(timer)
      if (!stopped) timer = setTimeout(actualizar, Math.max(1000, nextUpdateAt - Date.now()) || intervalMs)
    }
    async function actualizar() {
      if (stopped || busy) return
      if (document.visibilityState !== 'visible' || !localStorage.getItem('usuario_actual')) {
        clearTimeout(timer)
        timer = setTimeout(actualizar, intervalMs)
        return
      }
      if (Date.now() < nextUpdateAt) { programar(); return }
      busy = true
      try {
        const response = await authenticatedFetch('/api/auth/presence', { method: 'POST' })
        if (response.ok) nextUpdateAt = (await response.json()).nextUpdateAt || Date.now() + intervalMs
        else nextUpdateAt = Date.now() + intervalMs
      } catch {
        nextUpdateAt = Date.now() + intervalMs
      } finally {
        busy = false
        programar()
      }
    }
    loadPresenceConfig().then((config) => { intervalMs = config.updateIntervalMs; if (!stopped) actualizar() })
      .catch(() => { nextUpdateAt = Date.now() + intervalMs; programar() })
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [])
}
