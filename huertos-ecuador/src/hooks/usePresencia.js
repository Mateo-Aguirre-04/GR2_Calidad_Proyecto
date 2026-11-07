import { useEffect } from 'react'

export function usePresencia() {
  useEffect(() => {
    async function actualizar() {
      if (document.visibilityState !== 'visible' || !localStorage.getItem('usuario_actual')) return
      try {
        await fetch('/api/auth/presence', { method: 'POST', credentials: 'include' })
      } catch {
        // El siguiente latido vuelve a intentar; la presencia caduca en el servidor.
      }
    }
    actualizar()
    const timer = setInterval(actualizar, 60_000)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [])
}
