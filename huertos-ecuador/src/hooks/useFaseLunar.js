const FASES = [
  { clave: 'nueva',            etiqueta: 'Luna nueva',        emoji: '🌑' },
  { clave: 'creciente',        etiqueta: 'Creciente',         emoji: '🌒' },
  { clave: 'cuarto-creciente', etiqueta: 'Cuarto creciente',  emoji: '🌓' },
  { clave: 'gibosa-creciente', etiqueta: 'Gibosa creciente',  emoji: '🌔' },
  { clave: 'llena',            etiqueta: 'Luna llena',        emoji: '🌕' },
  { clave: 'gibosa-menguante', etiqueta: 'Gibosa menguante',  emoji: '🌖' },
  { clave: 'cuarto-menguante', etiqueta: 'Cuarto menguante',  emoji: '🌗' },
  { clave: 'menguante',        etiqueta: 'Menguante',         emoji: '🌘' },
]

const CICLO_DIAS = 29.530588853
const LUNA_NUEVA_REF = Date.UTC(2000, 0, 6, 18, 14) // una luna nueva conocida

// Versión de prueba: calcula la fase sin red.
// Cuando elijas la API de luna, reemplaza el contenido por un fetch que
// devuelva uno de estos objetos de FASES.
export function useFaseLunar() {
  const edad = (((Date.now() - LUNA_NUEVA_REF) / 86_400_000) % CICLO_DIAS + CICLO_DIAS) % CICLO_DIAS
  const indice = Math.round((edad / CICLO_DIAS) * 8) % 8
  return FASES[indice]
}