import { useEffect, useMemo, useState } from 'react'

const en = (horas) => new Date(Date.now() + horas * 3_600_000).toISOString()

const RECORDATORIOS_PRUEBA = [
  { id: 1, tipo: 'riego',   texto: 'Regar los tomates en Ficoa', venceEn: en(-2),  completado: false },
  { id: 2, tipo: 'riego',   texto: 'Regar el maíz',              venceEn: en(-1),  completado: false },
  { id: 3, tipo: 'cosecha', texto: 'Cosechar tomates maduros',   venceEn: en(-5),  completado: false },
  { id: 4, tipo: 'siembra', texto: 'Sembrar menta',              venceEn: en(48),  completado: false },
]

export function useRecordatorios(ahora, usuarioId = 2) {
  const [recordatorios, setRecordatorios] = useState(RECORDATORIOS_PRUEBA)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargar() {
      try {
        const res = await fetch(`/api/recordatorios/${usuarioId}`, { signal: controlador.signal })
        if (!res.ok) throw new Error('Error al consultar recordatorios')
        const datos = await res.json()
        setRecordatorios(datos)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[useRecordatorios] No se pudo conectar a la API, usando recordatorios de reserva:', err.message)
        }
      }
    }

    cargar()
    return () => controlador.abort()
  }, [usuarioId])

  // Pendientes agrupados por tipo: { riego: [...], cosecha: [...] }
  const pendientes = useMemo(() => {
    const grupos = {}
    for (const r of recordatorios) {
      if (r.completado || new Date(r.venceEn).getTime() > ahora) continue
      ;(grupos[r.tipo] ??= []).push(r)
    }
    return grupos
  }, [recordatorios, ahora])

  async function completar(id) {
    setRecordatorios((prev) => prev.map((r) => (r.id === id ? { ...r, completado: true } : r)))
    try {
      await fetch(`/api/recordatorios/${id}/completar`, { method: 'POST' })
    } catch (err) {
      console.warn('[useRecordatorios] No se pudo sincronizar la tarea completada en la API:', err.message)
    }
  }

  return { pendientes, completar }
}
