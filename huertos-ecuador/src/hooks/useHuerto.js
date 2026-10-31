import { useEffect, useState } from 'react'

const hace = (dias) => new Date(Date.now() - dias * 86_400_000).toISOString()

const TOMATE = {
  nombre: 'Tomate',
  diasCrecimiento: 60,
  imagenes: ['', '', '', ''], // fase 1, 2, 3 y cosechada
}
const MAIZ = { nombre: 'Maíz', diasCrecimiento: 90, imagenes: ['', '', '', ''] }

// x e y son porcentajes sobre la pantalla: así la posición es igual en cualquier tamaño
const HUERTO_PRUEBA = {
  tipo: 'campo', // define el fondo: /fondos/campo.png
  ubicacion: { lat: -0.1807, lng: -78.4678 }, // la que se guardó al crear el gremio
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

export function useHuerto() {
  const [huerto, setHuerto] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setHuerto(HUERTO_PRUEBA)
      setCargando(false)
    }, 300)
    return () => clearTimeout(temporizador)
  }, [])

  return { huerto, cargando }
}