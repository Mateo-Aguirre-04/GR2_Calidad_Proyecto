import { useCallback, useEffect, useState } from 'react'
import * as api from '../services/checklist'

// Las claves de las acciones deben mantenerse en la interfaz mientras se reintentan.
export function useChecklist(huertoId) {
  const [revision, setRevision] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const recargar = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!huertoId) return
    const refresh = () => { if (!document.hidden) recargar() }
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [huertoId, recargar])
  useEffect(() => {
    if (!huertoId) return
    const controller = new AbortController()
    async function load() {
      try {
        const panel = await api.sincronizarChecklist(huertoId, { signal: controller.signal })
        if (!controller.signal.aborted) setSnapshot({ huertoId, revision, panel, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot({ huertoId, revision, panel: null, error: error.message })
      }
    }
    load()
    return () => controller.abort()
  }, [huertoId, revision])

  const run = useCallback(async operation => {
    if (!huertoId) throw new Error('Selecciona un huerto.')
    const result = await operation()
    recargar()
    return result
  }, [huertoId, recargar])
  const current = snapshot?.huertoId === huertoId ? snapshot : null
  return {
    panel: current?.panel || null,
    tareas: current?.panel?.tareas || [],
    cultivos: current?.panel?.cultivos || [],
    recordatorios: current?.panel?.recordatorios || [],
    cargando: !!huertoId && (!current||current.revision!==revision),
    error: huertoId ? current?.error || '' : 'Selecciona un huerto.',
    recargar,
    inscribirse: tareaId => run(() => api.inscribirseEnTarea(huertoId, tareaId)),
    completar: (tareaId, confirmaciones) => run(() => api.completarTarea(huertoId, tareaId, confirmaciones)),
    registrarRiegos: (zonaId, clave) => run(() => api.registrarRiegos(huertoId, zonaId, clave)),
    crearZona: (zona, parcela) => run(() => api.crearZona(huertoId, zona, parcela)),
    iniciarCiclo: (zonaId, clave) => run(() => api.iniciarCicloZona(huertoId, zonaId, clave)),
    programar: datos => run(() => api.programarActividad(huertoId, datos)),
    sembrar: datos => run(() => api.sembrarConChecklist(huertoId, datos)),
    configurarCultivo: datos => run(() => api.configurarCultivo(huertoId, datos)),
    finalizarCultivo: datos => run(() => api.finalizarCultivo(huertoId, datos)),
    iniciarSecado: (loteId, modalidad, aLaSombra) => run(() => api.iniciarSecado(huertoId, loteId, modalidad, aLaSombra)),
  }
}
