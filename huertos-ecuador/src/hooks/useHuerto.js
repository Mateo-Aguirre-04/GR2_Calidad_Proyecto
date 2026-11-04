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
  ubicacion: { lat: -0.1807, lng: -78.4678 }, // Quito por defecto
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

/**
 * Hook para cargar los datos del huerto activo, sincronizando la ubicación
 * geográfica real seleccionada (por ejemplo: Pelileo, Ambato, Quito)
 */
export function useHuerto(huertoIdProp) {
  const [huerto, setHuerto] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Function to load huerto data
  const cargar = async () => {
    try {
      const controlador = new AbortController()
      const idGuardado = localStorage.getItem('huerto_activo_id')
      const huertoId = huertoIdProp || (idGuardado ? parseInt(idGuardado, 10) : 1)
      const res = await fetch(`/api/huertos/${huertoId}`, { signal: controlador.signal })
      if (!res.ok) throw new Error('Error al consultar huerto')
      const datos = await res.json()
      // sync gremio location if present
      let gremioActivo = null
      try {
        const raw = localStorage.getItem('gremio_activo')
        if (raw) gremioActivo = JSON.parse(raw)
      } catch {}
      if (gremioActivo?.ubicacion) {
        datos.ubicacion = {
          lat: gremioActivo.ubicacion.lat,
          lng: gremioActivo.ubicacion.lng,
          direccion: gremioActivo.direccion || gremioActivo.nombre,
        }
        datos.nombre = gremioActivo.nombre || datos.nombre
      }
      setHuerto(datos)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[useHuerto] No se pudo conectar a la API, usando huerto de reserva:', err.message)
        const fallback = { ...HUERTO_PRUEBA }
        let gremioActivo = null
        try {
          const raw = localStorage.getItem('gremio_activo')
          if (raw) gremioActivo = JSON.parse(raw)
        } catch {}
        if (gremioActivo?.ubicacion) {
          fallback.ubicacion = {
            lat: gremioActivo.ubicacion.lat,
            lng: gremioActivo.ubicacion.lng,
            direccion: gremioActivo.direccion || gremioActivo.nombre,
          }
          fallback.nombre = gremioActivo.nombre || 'Mi Huerto'
        }
        setHuerto(fallback)
      }
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [huertoIdProp])

  return { huerto, cargando, recargar: cargar }
}
