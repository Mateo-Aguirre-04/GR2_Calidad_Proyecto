import { useEffect, useState } from 'react'

const hace = (dias) => new Date(Date.now() - dias * 86_400_000).toISOString()

const TOMATE = {
  nombre: 'Tomate de Árbol',
  diasCrecimiento: 60,
  imagenes: ['', '', '', ''],
}
const MAIZ = { nombre: 'Maíz Chulpi', diasCrecimiento: 90, imagenes: ['', '', '', ''] }

const HUERTO_PRUEBA = {
  tipo: 'campo',
  ubicacion: { lat: -1.2417, lng: -78.6295 }, // Sector Ficoa, Ambato (Tungurahua)
  cultivos: [
    { id: 1, planta: TOMATE, x: 8,  y: 36, sembradoEn: hace(5),  cosechado: false },
    { id: 2, planta: TOMATE, x: 14, y: 36, sembradoEn: hace(25), cosechado: false },
    { id: 3, planta: TOMATE, x: 20, y: 36, sembradoEn: hace(45), cosechado: false },
    { id: 4, planta: TOMATE, x: 26, y: 36, sembradoEn: hace(70), cosechado: false },
    { id: 5, planta: TOMATE, x: 32, y: 36, sembradoEn: hace(70), cosechado: true },
    { id: 6, planta: MAIZ,   x: 50, y: 85, sembradoEn: hace(10), cosechado: false },
    { id: 7, planta: MAIZ,   x: 58, y: 85, sembradoEn: hace(50), cosechado: false },
  ],
}

export function useHuerto(huertoId = 1) {
  const [huerto, setHuerto] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargar() {
      try {
        const res = await fetch(`/api/huertos/${huertoId}`, { signal: controlador.signal })
        if (!res.ok) throw new Error('Error al consultar huerto')
        const datos = await res.json()
        setHuerto(datos)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[useHuerto] No se pudo conectar a la API, usando huerto de reserva:', err.message)
          setHuerto(HUERTO_PRUEBA)
        }
      } finally {
        setCargando(false)
      }
    }

    cargar()
    return () => controlador.abort()
  }, [huertoId])

  return { huerto, cargando }
}
