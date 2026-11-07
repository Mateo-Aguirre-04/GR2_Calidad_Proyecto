import { useCallback, useEffect, useState } from 'react'

export function useApiData(url) {
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const recargar = useCallback(() => setRevision((n) => n + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        if (!url) throw new Error('Selecciona un gremio e inicia sesión para continuar.')
        const res = await fetch(url, { credentials: 'include', signal: controller.signal })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'No se pudo consultar el servidor.')
        if (!controller.signal.aborted) { setData(result); setError('') }
      } catch (err) {
        if (!controller.signal.aborted) { setData(null); setError(err.message) }
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }
    load()
    return () => controller.abort()
  }, [url, revision])
  return { data, cargando, error, recargar }
}
