import { useMemo } from 'react'
import { useApiData } from './useApiData'
import { authenticatedFetch } from '../authSession'
export function useRecordatorios(ahora, usuarioId) {
  const { data, recargar, error } = useApiData(usuarioId ? `/api/recordatorios/${usuarioId}` : null)
  const pendientes = useMemo(() => {
    const grupos = {}
    for (const r of data ?? []) {
      if (!r.completado && new Date(r.venceEn).getTime() <= ahora) (grupos[r.tipo] ??= []).push(r)
    }
    return grupos
  }, [data, ahora])
  async function completar(id) {
    const res = await authenticatedFetch(`/api/recordatorios/${id}/completar`, { method: 'POST' })
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo completar la tarea.')
    recargar()
  }
  return { pendientes, completar, error }
}
