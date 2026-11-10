// Fases de crecimiento de planta.fases (sin la fase "muerta"), ordenadas por número.
export function fasesCrecimiento(fases) {
  if (!Array.isArray(fases)) return []
  return fases
    .filter((f) => f && !f.muerta)
    .sort((a, b) => Number(a.fase) - Number(b.fase))
}
