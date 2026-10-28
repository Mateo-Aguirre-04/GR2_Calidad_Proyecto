// Esto lo hizo chat para poder probar el renderizado, luego tenemos que cambiarlo para que se adapte a nuestra base
// y luego de adpatarlo a la base refactorizamos el código del front

import { useEffect, useState } from 'react'

const PLANTAS_PRUEBA = [
  {
    id: 1,
    nombre: 'Papa Chaucha',
    tipo: 'Tubérculo',
    region: 'Sierra',
    cuidados: 'Suelo bien drenado, clima frío. Riego regular sin anegar.',
    descripcion:
      'La papa chaucha prefiere suelos sueltos y ricos en materia orgánica.\n\nRiega de forma regular, evitando encharcamientos. Aporca la tierra alrededor del tallo cuando la planta alcance unos 20 cm.\n\nCosecha cuando las hojas empiecen a secarse.',
    imagen: '',
    fases: [
      { nombre: 'Siembra', imagen: '' },
      { nombre: 'Germinación', imagen: '' },
      { nombre: 'Crecimiento', imagen: '' },
      { nombre: 'Cosecha', imagen: '' },
    ],
  },
  {
    id: 2,
    nombre: 'Tomate de Árbol',
    tipo: 'Fruta',
    region: 'Sierra',
    cuidados: 'Soporta temperaturas templadas. Requiere buen abono orgánico.',
    descripcion:
      'El tomate de árbol necesita un suelo fértil y protegido del viento fuerte.\n\nAbona cada dos meses con compost y poda las ramas secas para favorecer la producción.',
    imagen: '',
    fases: [
      { nombre: 'Siembra', imagen: '' },
      { nombre: 'Germinación', imagen: '' },
      { nombre: 'Crecimiento', imagen: '' },
      { nombre: 'Cosecha', imagen: '' },
    ],
  },
  {
    id: 3,
    nombre: 'Menta / Hierbabuena',
    tipo: 'Hierba',
    region: 'Sierra',
    cuidados: 'Riego constante, semisombra. Crece rápido en macetas.',
    descripcion:
      'La menta se adapta bien a macetas porque sus raíces se extienden con rapidez.\n\nMantén la tierra húmeda y córtala con frecuencia para que rebrote.',
    imagen: '',
    fases: [
      { nombre: 'Siembra', imagen: '' },
      { nombre: 'Germinación', imagen: '' },
      { nombre: 'Crecimiento', imagen: '' },
      { nombre: 'Cosecha', imagen: '' },
    ],
  },
  {
    id: 4,
    nombre: 'Maíz',
    tipo: 'Cereal',
    region: 'Costa',
    cuidados: 'Pleno sol y riego frecuente. Necesita suelo profundo.',
    descripcion:
      'El maíz requiere sol directo y suelo profundo y fértil.\n\nRiega con frecuencia durante la floración y espera a que las mazorcas estén firmes para cosechar.',
    imagen: '',
    fases: [
      { nombre: 'Siembra', imagen: '' },
      { nombre: 'Germinación', imagen: '' },
      { nombre: 'Crecimiento', imagen: '' },
      { nombre: 'Cosecha', imagen: '' },
    ],
  },
]

export function usePlantas() {
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error] = useState('')

  useEffect(() => {
    // Simula la espera de una API
    const temporizador = setTimeout(() => {
      setPlantas(PLANTAS_PRUEBA)
      setCargando(false)
    }, 400)

    return () => clearTimeout(temporizador)
  }, [])

  return { plantas, cargando, error }
}