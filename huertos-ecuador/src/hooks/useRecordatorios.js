import { useMemo, useState } from 'react'

const en = (horas) => new Date(Date.now() + horas * 3_600_000).toISOString()

// tipo: 'riego' | 'siembra' | 'cosecha'. venceEn: desde cuándo está pendiente.
const RECORDATORIOS_PRUEBA = [
  { id: 1, tipo: 'riego',   texto: 'Regar los tomates',        venceEn: en(-2),  completado: false },
  { id: 2, tipo: 'riego',   texto: 'Regar el maíz',            venceEn: en(-1),  completado: false },
  { id: 3, tipo: 'cosecha', texto: 'Cosechar tomates maduros', venceEn: en(-5),  completado: false },
  { id: 4, tipo: 'siembra', texto: 'Sembrar menta',            venceEn: en(48),  completado: false }, // aún no vence
]

export function useRecordatorios(ahora) {
  const [recordatorios, setRecordatorios] = useState(RECORDATORIOS_PRUEBA) // luego: fetch a la API

  // Pendientes agrupados por tipo: { riego: [...], cosecha: [...] }
  const pendientes = useMemo(() => {
    const grupos = {}
    for (const r of recordatorios) {
      if (r.completado || new Date(r.venceEn).getTime() > ahora) continue
      ;(grupos[r.tipo] ??= []).push(r)
    }
    return grupos
  }, [recordatorios, ahora])

  function completar(id) {
    setRecordatorios((prev) => prev.map((r) => (r.id === id ? { ...r, completado: true } : r)))
  }

  return { pendientes, completar }
}