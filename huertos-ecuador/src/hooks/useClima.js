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

// Códigos WMO de Open-Meteo -> clave interna (la clave es también el nombre del PNG)
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

export function useClima(ubicacion) {
  const [clima, setClima] = useState({ clave: 'soleado', ...ESTADOS.soleado })

  useEffect(() => {
    if (!ubicacion) return
    const controlador = new AbortController()
    const { lat, lng } = ubicacion

    async function cargar() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code`
        const res = await fetch(url, { signal: controlador.signal })
        if (!res.ok) throw new Error('clima')
        const datos = await res.json()
        const clave = codigoAClave(datos.current.weather_code)
        setClima({ clave, ...ESTADOS[clave] })
      } catch (e) {
        // si falla, se queda el último valor: el clima no debe romper el juego
      }
    }

    cargar()
    const id = setInterval(cargar, 15 * 60_000) // refresca cada 15 min
    return () => { controlador.abort(); clearInterval(id) }
  }, [ubicacion])

  return clima
}