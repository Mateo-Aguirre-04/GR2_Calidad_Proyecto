const DIA_MS = 86_400_000

// Duración total de la animación de cosecha: 1.5 s + desfase máximo de 280 ms (Parcela.module.css).
export const DURACION_COSECHA_MS = 1800

// Fases de crecimiento de la planta (de planta.fases, sin la muerta). Por defecto 5.
export function totalFases(planta) {
  return planta?.fases?.length || planta?.imagenes?.length || 5
}

// Fases que se ven en el terreno: todas menos la última (con 5 fases -> 1 a 4).
// La última (fase 5, Cosecha) solo aparece en la animación al cosechar.
export function fasesTerreno(planta) {
  return Math.max(1, totalFases(planta) - 1)
}

function progresoCultivo({ sembradoEn, planta }, ahora) {
  const dias = (ahora - new Date(sembradoEn).getTime()) / DIA_MS
  const progreso = dias / (planta?.diasCrecimiento || 60)
  return Number.isFinite(progreso) ? progreso : 0
}

// Índice de fase (0 = fase 1). En el terreno llega como máximo a la fase 4 (índice 3),
// que se alcanza al cumplirse los días del ciclo; las fases 1 a 3 se reparten el tiempo.
// Debe coincidir con backend/src/data/fases.js (el backend valida la cosecha).
export function calcularFase(cultivo, ahora) {
  if (cultivo.cosechado) return totalFases(cultivo.planta) - 1
  const terreno = fasesTerreno(cultivo.planta)
  const progreso = progresoCultivo(cultivo, ahora)
  if (progreso >= 1) return terreno - 1
  return Math.min(terreno - 1, Math.max(0, Math.floor(progreso * (terreno - 1))))
}

// Solo se cosecha en la fase 4 (cuando se cumplen los días del ciclo).
export function listaParaCosechar(cultivo, ahora) {
  return !cultivo.muerto && !cultivo.cosechado && progresoCultivo(cultivo, ahora) >= 1
}

// Fecha (ms) en la que la planta llega a la fase 4 y se puede cosechar.
export function fechaCosecha({ sembradoEn, planta }) {
  return new Date(sembradoEn).getTime() + (planta?.diasCrecimiento || 60) * DIA_MS
}

// Imagen de la fase actual en el terreno; si la planta no tiene fases usa su imagen general,
// y si tampoco tiene imagen (p. ej. plantas sin fases en la BD) un brote genérico.
export function imagenCultivo(cultivo, ahora) {
  const { planta } = cultivo
  if (cultivo.muerto) return planta?.imagenMuerta || IMAGEN_RESPALDO
  return planta?.imagenes?.[calcularFase(cultivo, ahora)] || planta?.imagen || IMAGEN_RESPALDO
}

// Imagen de la fase 5 (Cosecha), la que sale en la animación.
export function imagenCosecha(planta) {
  return planta?.imagenes?.[totalFases(planta) - 1] || planta?.imagen || IMAGEN_RESPALDO
}

export const IMAGEN_RESPALDO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='88' font-size='88' text-anchor='middle'>🌱</text></svg>",
)}`

// Para <img onError>: si la URL de la imagen no carga (404), muestra el brote genérico.
export function usarRespaldo(evento) {
  const img = evento.currentTarget
  if (img.dataset.respaldo) return
  img.dataset.respaldo = '1'
  img.src = IMAGEN_RESPALDO
}