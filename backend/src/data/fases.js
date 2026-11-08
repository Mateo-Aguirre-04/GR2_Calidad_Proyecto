const DIA_MS = 86_400_000

// Fases de crecimiento de planta.fases (sin la fase "muerta"), ordenadas por número.
export function fasesCrecimiento(fases) {
  if (!Array.isArray(fases)) return []
  return fases
    .filter((f) => f && !f.muerta)
    .sort((a, b) => Number(a.fase) - Number(b.fase))
}

function progreso(sembradoEn, diasCrecimiento, ahora) {
  const dias = (ahora - new Date(sembradoEn).getTime()) / DIA_MS
  const valor = dias / (diasCrecimiento > 0 ? diasCrecimiento : 60)
  return Number.isFinite(valor) ? valor : 0
}

// Índice de fase en el terreno (0 = fase 1). Con 5 fases el terreno llega como máximo a la
// fase 4 (índice 3) al cumplirse los días del ciclo; la fase 5 (Cosecha) solo sale al cosechar.
// Debe coincidir con calcularFase en huertos-ecuador/src/data/fasesPlanta.js.
export function indiceFase(sembradoEn, diasCrecimiento, totalFases = 5, ahora = Date.now()) {
  const terreno = Math.max(1, (Math.trunc(totalFases) || 5) - 1)
  const p = progreso(sembradoEn, diasCrecimiento, ahora)
  if (p >= 1) return terreno - 1
  return Math.min(terreno - 1, Math.max(0, Math.floor(p * (terreno - 1))))
}

// Solo se cosecha en la fase 4: cuando se cumplen los días del ciclo.
export function listaParaCosechar(sembradoEn, diasCrecimiento, _totalFases = 5, ahora = Date.now()) {
  return progreso(sembradoEn, diasCrecimiento, ahora) >= 1
}