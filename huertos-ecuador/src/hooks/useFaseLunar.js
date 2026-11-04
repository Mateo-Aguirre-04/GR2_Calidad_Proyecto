import { useMemo } from 'react'
import {
  MoonPhase,
  Illumination,
  Body,
  SearchMoonQuarter,
  NextMoonQuarter,
} from 'astronomy-engine'

const FASES = [
  { clave: 'nueva',            etiqueta: 'Luna nueva',        emoji: '🌑', consejo: 'Reposo de savia. Momento para podas y abonos de fondo.' },
  { clave: 'creciente',        etiqueta: 'Creciente',         emoji: '🌒', consejo: 'Savia sube a hojas. Fomenta el crecimiento vegetativo.' },
  { clave: 'cuarto-creciente', etiqueta: 'Cuarto creciente',  emoji: '🌓', consejo: 'Fase propicia para sembrar hortalizas de fruto y flor.' },
  { clave: 'gibosa-creciente', etiqueta: 'Gibosa creciente',  emoji: '🌔', consejo: 'Mayor absorción hídrica. Ideal para nutrición foliar.' },
  { clave: 'llena',            etiqueta: 'Luna llena',        emoji: '🌕', consejo: 'Máxima luminosidad. Excelente para cosechas y trasplantes.' },
  { clave: 'gibosa-menguante', etiqueta: 'Gibosa menguante',  emoji: '🌖', consejo: 'Savia desciende a raíces. Buen momento para deshierbar.' },
  { clave: 'cuarto-menguante', etiqueta: 'Cuarto menguante',  emoji: '🌗', consejo: 'Fase ideal para sembrar tubérculos y raíces (papas, zanahorias).' },
  { clave: 'menguante',        etiqueta: 'Menguante',         emoji: '🌘', consejo: 'Baja actividad vegetativa. Control de plagas y limpieza.' },
]

const CUARTOS = {
  0: 'Luna nueva',
  1: 'Cuarto creciente',
  2: 'Luna llena',
  3: 'Cuarto menguante',
}

/**
 * Hook para obtener la fase lunar exacta, porcentaje de iluminación y próximos eventos astronómicos
 * utilizando la biblioteca oficial Astronomy Engine.
 */
export function useFaseLunar(fecha = new Date()) {
  return useMemo(() => {
    try {
      const ahora = fecha instanceof Date ? fecha : new Date(fecha)

      // 1. Fase lunar astronómica exacta (0° a 360°)
      const grados = MoonPhase(ahora)
      const indice = Math.floor(((grados + 22.5) % 360) / 45)
      const faseBase = FASES[indice] || FASES[0]

      // 2. Iluminación astronómica (0 a 100%)
      const ilum = Illumination(Body.Moon, ahora)
      const porcentajeIluminacion = Math.round(ilum.phase_fraction * 100)

      // 3. Próximos eventos lunares (cuartos de luna calculados por Astronomy Engine)
      const qActual = SearchMoonQuarter(ahora)
      const proximo = qActual.time.date > ahora ? qActual : NextMoonQuarter(qActual)
      const nombreEvento = CUARTOS[proximo.quarter] || 'Evento lunar'
      const fechaEvento = proximo.time.date.toLocaleDateString('es-EC', {
        day: 'numeric',
        month: 'short',
      })

      const proximoTexto = `${nombreEvento} (${fechaEvento})`
      const descripcion = `${faseBase.etiqueta} (${porcentajeIluminacion}% iluminada). Próximo evento: ${proximoTexto}. ${faseBase.consejo}`

      return {
        ...faseBase,
        grados: Math.round(grados),
        iluminacion: porcentajeIluminacion,
        proximoEvento: {
          nombre: nombreEvento,
          fecha: fechaEvento,
          fechaIso: proximo.time.date.toISOString(),
        },
        descripcion,
      }
    } catch (err) {
      console.warn('[useFaseLunar] Error calculando con Astronomy Engine:', err)
      return {
        ...FASES[0],
        grados: 0,
        iluminacion: 0,
        proximoEvento: null,
        descripcion: 'Fase lunar: Luna nueva',
      }
    }
  }, [fecha])
}
