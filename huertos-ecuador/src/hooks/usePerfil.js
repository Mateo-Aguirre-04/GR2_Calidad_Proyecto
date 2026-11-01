import { useEffect, useState } from 'react'

const PERFIL_PRUEBA = {
  nombre: 'Juanito Pérez',
  gremio: 'Gremio Huerto San Francisco',
  rango: 'Oficial',
  puntuacion: 130,
  posicionGremio: 2,
  descripcion: 'Cultivo de hortalizas y compostaje urbano',
  avatar: '',
}

export function usePerfil(usuarioId = 2) {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const controlador = new AbortController()

    async function cargar() {
      try {
        const res = await fetch(`/api/perfil/${usuarioId}`, { signal: controlador.signal })
        if (!res.ok) throw new Error('Error al consultar perfil')
        const datos = await res.json()
        setPerfil(datos)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[usePerfil] No se pudo conectar a la API, usando perfil de reserva:', err.message)
          setPerfil(PERFIL_PRUEBA)
        }
      } finally {
        setCargando(false)
      }
    }

    cargar()
    return () => controlador.abort()
  }, [usuarioId])

  async function guardarDescripcion(descripcion) {
    setPerfil((prev) => (prev ? { ...prev, descripcion } : prev))
    try {
      await fetch(`/api/perfil/${usuarioId}/descripcion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion }),
      })
    } catch (err) {
      console.warn('[usePerfil] No se pudo persistir la descripción en la API:', err.message)
    }
  }

  return { perfil, cargando, guardarDescripcion }
}
