import { useEffect, useMemo } from 'react'
import { useApiData } from './useApiData'
import { authenticatedFetch } from '../authSession'
const RECORDATORIOS_VACIOS = []
export function useRecordatorios(usuarioId) {
  const { data, recargar, error, cargando } = useApiData(usuarioId ? '/api/recordatorios' : null)
  useEffect(() => {
    if (!usuarioId) return undefined
    const interval = setInterval(recargar, 15 * 60_000)
    return () => clearInterval(interval)
  }, [usuarioId, recargar])
  const lista = data?.recordatorios ?? RECORDATORIOS_VACIOS
  const pendientes = useMemo(() => {
    const grupos = {}
    for (const r of lista) (grupos[r.tipo] ??= []).push(r)
    return grupos
  }, [lista])
  async function completar(recordatorio) {
    const res = await authenticatedFetch(`/api/huertos/${recordatorio.huertoId}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: recordatorio.accion, plantaId: recordatorio.plantaId, fechaSiembra: recordatorio.fechaSiembra }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo registrar la actividad.')
    recargar()
  }
  return { lista, pendientes, completar, error, cargando, fuentes: data?.fuentes ?? {}, recargar }
}
