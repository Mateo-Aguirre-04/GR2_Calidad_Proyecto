import { useEffect, useState } from 'react'

const FASES = [
  { nombre: 'Siembra', imagen: '' },
  { nombre: 'Germinación', imagen: '' },
  { nombre: 'Crecimiento', imagen: '' },
  { nombre: 'Cosecha', imagen: '' },
]

const PLANTAS_PRUEBA = [
  {
    id: 1,
    nombre: 'Papa Chaucha',
    tipo: 'Tubérculo',
    region: 'Sierra',
    resumen: 'Suelo bien drenado, clima frío. Riego regular sin anegar.',
    cuidados: {
      suelo: ['Suelo suelto y bien drenado.', 'Rico en materia orgánica.'],
      ambiente: ['Clima frío.', 'Evitar heladas fuertes.'],
      abono: ['Compost antes de sembrar.', 'Aporcar cuando la planta mida 20 cm.'],
      extras: ['Cosechar cuando las hojas empiecen a secarse.'],
    },
    imagen: '',
    fases: FASES,
  },
  {
    id: 2,
    nombre: 'Tomate de Árbol',
    tipo: 'Fruta',
    region: 'Sierra',
    resumen: 'Soporta temperaturas templadas. Requiere buen abono orgánico.',
    cuidados: {
      suelo: ['El suelo debe ser fértil.', 'Debe estar protegido.'],
      ambiente: ['No debe existir viento fuerte.'],
      abono: ['Cada dos meses con compost.', 'Poda las ramas secas para favorecer la producción.'],
      extras: ['Revisar plagas con frecuencia.'],
    },
    imagen: '',
    fases: FASES,
  },
  {
    id: 3,
    nombre: 'Menta / Hierbabuena',
    tipo: 'Hierba',
    region: 'Sierra',
    resumen: 'Riego constante, semisombra. Crece rápido en macetas.',
    cuidados: {
      suelo: 'Tierra húmeda y ligera.',
      ambiente: ['Semisombra.', 'Crece bien en macetas.'],
      abono: 'Humus de lombriz una vez al mes.',
    },
    imagen: '',
    fases: FASES,
  },
  {
    id: 4,
    nombre: 'Maíz',
    tipo: 'Cereal',
    region: 'Costa',
    resumen: 'Pleno sol y riego frecuente. Necesita suelo profundo.',
    cuidados: {
      suelo: ['Suelo profundo y fértil.'],
      ambiente: ['Pleno sol.', 'Riego frecuente en la floración.'],
      abono: ['Abonar al sembrar y al aparecer las primeras hojas.'],
      extras: ['Cosechar cuando las mazorcas estén firmes.'],
    },
    imagen: '',
    fases: FASES,
  },
]

export function usePlantas() {
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error] = useState('')

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setPlantas(PLANTAS_PRUEBA)
      setCargando(false)
    }, 400)
    return () => clearTimeout(temporizador)
  }, [])

  return { plantas, cargando, error }
}