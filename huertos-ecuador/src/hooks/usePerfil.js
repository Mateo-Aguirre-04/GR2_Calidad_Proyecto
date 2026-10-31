import { useEffect, useState } from 'react'

const PERFIL_PRUEBA = {
  nombre: 'Juanito Perez',
  gremio: 'Los Leones',
  rango: 'Oficial',
  puntuacion: 130,
  posicionGremio: 10,
  descripcion: 'Soy Juanito y me gusta cultivar',
  avatar: '', // ruta de la imagen; vacío muestra un emoji
}

export function usePerfil() {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setPerfil(PERFIL_PRUEBA)
      setCargando(false)
    }, 300)
    return () => clearTimeout(temporizador)
  }, [])

  // Con la API real aquí iría el PUT/PATCH
  function guardarDescripcion(descripcion) {
    setPerfil((prev) => ({ ...prev, descripcion }))
  }

  return { perfil, cargando, guardarDescripcion }
}