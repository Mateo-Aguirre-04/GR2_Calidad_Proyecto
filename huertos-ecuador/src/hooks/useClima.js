import { useEffect, useState } from 'react'

const ESTADOS = {
  soleado:  { etiqueta: 'Soleado',  emoji: '☀️' },
  parcial:  { etiqueta: 'Parcial',  emoji: '⛅' },
  nublado:  { etiqueta: 'Nublado',  emoji: '☁️' },
  niebla:   { etiqueta: 'Niebla',   emoji: '🌫️' },
  lluvia:   { etiqueta: 'Lluvia',   emoji: '🌧️' },
  nieve:    { etiqueta: 'Nieve',    emoji: '❄️' },
  tormenta: { etiqueta: 'Tormenta', emoji: '⛈️' },
}

// Códigos WMO de Open-Meteo -> clave interna (también el nombre del PNG / emoji)
function codigoAClave(codigo) {
  if (codigo === 0) return 'soleado'
  if (codigo <= 2) return 'parcial'
  if (codigo === 3) return 'nublado'
  if (codigo === 45 || codigo === 48) return 'niebla'
  if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'lluvia'
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'nieve'
  if (codigo >= 95) return 'tormenta'
  return 'nublado'
}

function generarConsejo(temp, hum, lluvia, probLluvia) {
  if (lluvia > 0.5) return 'Lluvia activa: riego natural suficiente, evitar regar hoy.'
  if (probLluvia >= 70) return `Alta probabilidad de lluvia (${probLluvia}%): postergar riego.`
  if (temp >= 24) return 'Temperatura alta: regar temprano por la mañana o al atardecer.'
  if (temp <= 8) return 'Temperatura baja: proteger cultivos sensibles del frío.'
  if (hum >= 85) return 'Humedad alta: buen ambiente para germinar, vigilar hongos.'
  return 'Condiciones óptimas para tareas de cultivo y mantenimiento.'
}

/**
 * Hook para consultar temperatura, lluvia, humedad y pronóstico en tiempo real
 * a través de la API oficial Open-Meteo según la ubicación geográfica del huerto.
 */
export function useClima(ubicacion) {
  const [clima, setClima] = useState({
    clave: 'soleado',
    ...ESTADOS.soleado,
    temperatura: null,
    humedad: null,
    lluvia: null,
    pronostico: null,
    descripcion: 'Consultando datos meteorológicos...',
    cargando: true,
  })

  useEffect(() => {
    if (!ubicacion?.lat || !ubicacion?.lng) return
    const controlador = new AbortController()
    const { lat, lng } = ubicacion

    async function cargar() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code,temperature_2m,relative_humidity_2m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`
        const res = await fetch(url, { signal: controlador.signal })
        if (!res.ok) throw new Error('Error al consultar Open-Meteo')
        const datos = await res.json()

        const current = datos.current || {}
        const daily = datos.daily || {}

        const clave = codigoAClave(current.weather_code)
        const estado = ESTADOS[clave] || ESTADOS.nublado

        const temp = typeof current.temperature_2m === 'number' ? Math.round(current.temperature_2m * 10) / 10 : 18
        const hum = typeof current.relative_humidity_2m === 'number' ? Math.round(current.relative_humidity_2m) : 65
        const precip = typeof current.precipitation === 'number' ? Math.round(current.precipitation * 10) / 10 : 0

        const tMax = daily.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : temp + 4
        const tMin = daily.temperature_2m_min?.[0] ? Math.round(daily.temperature_2m_min[0]) : temp - 4
        const probLluvia = daily.precipitation_probability_max?.[0] ?? 0
        const lluviaSum = daily.precipitation_sum?.[0] ?? precip

        const pronostico = {
          tMax,
          tMin,
          probLluvia,
          lluviaTotal: lluviaSum,
          dias: (daily.time || []).slice(0, 3).map((dia, i) => ({
            fecha: dia,
            tMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
            tMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
            probLluvia: daily.precipitation_probability_max?.[i] ?? 0,
          })),
        }

        const lugar = ubicacion?.direccion?.split(',')?.[0]?.trim() || ubicacion?.nombre || 'Huerto'
        const consejo = generarConsejo(temp, hum, precip, probLluvia)
        const descripcion = `Clima en ${lugar} (${estado.etiqueta}): ${temp}°C · Humedad: ${hum}% · Lluvia: ${precip}mm. Pronóstico: mín ${tMin}° / máx ${tMax}°C (${probLluvia}% lluvia). ${consejo}`

        setClima({
          clave,
          ...estado,
          temperatura: temp,
          humedad: hum,
          lluvia: precip,
          pronostico,
          descripcion,
          cargando: false,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[useClima] Fallback en clima:', err.message)
          setClima((prev) => ({ ...prev, cargando: false }))
        }
      }
    }

    cargar()
    const id = setInterval(cargar, 15 * 60_000) // refresca cada 15 min
    return () => {
      controlador.abort()
      clearInterval(id)
    }
  }, [ubicacion?.lat, ubicacion?.lng])

  return clima
}
