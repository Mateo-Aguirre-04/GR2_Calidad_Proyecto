import { useEffect, useState } from 'react'
import { authenticatedFetch } from '../authSession'
import { loadPresenceConfig } from '../presenceConfig'

function leerGuardado(clave) {
  try { return JSON.parse(localStorage.getItem(clave)) } catch { return null }
}

function adaptarMiembro(u) {
  return {
    ...u,
    nivel: u.rolGremio === 'Líder de Gremio' ? 'Fundador' : (u.nivelGremio ?? u.rolGremio ?? 'Miembro'),
    enLinea: u.enLinea === true,
    puntos: Number(u.puntos ?? 0),
  }
}

export function useGremio() {
  const [gremio, setGremio] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const controlador = new AbortController()
    const id = leerGuardado('gremio_activo')?.id ?? leerGuardado('usuario_actual')?.gremioId
    let timer
    let refreshIntervalMs = 60 * 60 * 1000
    function programar() {
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') cargar()
        else programar()
      }, refreshIntervalMs)
    }
    async function cargar() {
      try {
        if (!id) throw new Error('Selecciona un gremio para ver sus miembros.')
        const res = await authenticatedFetch(`/api/gremios/${id}`, { signal: controlador.signal })
        if (res.status === 401) return
        const datos = await res.json()
        if (!res.ok) throw new Error(datos.error || 'No se pudo consultar el gremio.')
        if (controlador.signal.aborted) return
        setGremio((prev) => ({
          ...prev,
          ...datos,
          miembros: (datos.miembros ?? []).map(adaptarMiembro),
        }))
        setError('')
      } catch (err) {
        if (!controlador.signal.aborted) setError(err.message)
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false)
          programar()
        }
      }
    }
    loadPresenceConfig().then((config) => {
      refreshIntervalMs = config.refreshIntervalMs
      if (!controlador.signal.aborted) cargar()
    }).catch(() => { if (!controlador.signal.aborted) cargar() })
    return () => { controlador.abort(); clearTimeout(timer) }
  }, [intento])

  async function guardarPerfil(cambios) {
    if (!gremio?.id) throw new Error('No se pudo identificar el gremio.')
    const response = await authenticatedFetch(`/api/gremios/${gremio.id}/perfil`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios),
    })
    const result = await response.json()
    if (!response.ok) {
      if (response.status === 403) setGremio((prev) => prev ? { ...prev, puedeEditar: false } : prev)
      throw new Error(result.error || 'No se pudo guardar el perfil del gremio.')
    }
    setGremio((prev) => prev ? { ...prev, ...result } : prev)
  }

  return { gremio, cargando, error, reintentar: () => setIntento((n) => n + 1), guardarPerfil }
}
