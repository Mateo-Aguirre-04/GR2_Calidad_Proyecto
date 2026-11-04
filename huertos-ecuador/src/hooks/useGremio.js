import { useEffect, useState } from 'react'

const DIA_MS = 24 * 60 * 60 * 1000

// Las fechas de prueba se calculan desde hoy para que «Hace N días» no envejezca
function haceDias(dias) {
  return new Date(Date.now() - dias * DIA_MS).toISOString()
}

// Datos de reserva mientras el backend no expone descripción, fama, anuncios ni actividad
const GREMIO_PRUEBA = {
  id: 1,
  nombre: 'Los Leones',
  descripcion: 'Nuestra manada cultiva juntos y protege a sus miembros.',
  emblema: '',
  rango: 1,
  nivel: 15,
  clasificacion: 10,
  creadoEn: '2026-02-28',
  anuncio: 'Aquí se ponen anuncios para la comunidad. (Reunión hoy a las 5 pm)',
  miembros: [
    { id: 1,  nombre: 'Pepe Perez',        nivel: 'Fundador', enLinea: true,  puntos: 520, avatar: '' },
    { id: 2,  nombre: 'Carlos Rodriguez',  nivel: 'Maestro',  enLinea: true,  puntos: 470, avatar: '' },
    { id: 3,  nombre: 'Ana García',        nivel: 'Maestro',  enLinea: false, puntos: 430, avatar: '' },
    { id: 4,  nombre: 'Miguel Torres',     nivel: 'Oficial',  enLinea: true,  puntos: 390, avatar: '' },
    { id: 5,  nombre: 'Elena Martínez',    nivel: 'Oficial',  enLinea: false, puntos: 350, avatar: '' },
    { id: 6,  nombre: 'Juan Sanchez',      nivel: 'Oficial',  enLinea: true,  puntos: 310, avatar: '' },
    { id: 7,  nombre: 'Lucía Gomez',       nivel: 'Miembro',  enLinea: true,  puntos: 280, avatar: '' },
    { id: 8,  nombre: 'David Ruiz',        nivel: 'Miembro',  enLinea: false, puntos: 240, avatar: '' },
    { id: 9,  nombre: 'Sofía Herrera',     nivel: 'Miembro',  enLinea: false, puntos: 210, avatar: '' },
    { id: 10, nombre: 'Andrés Castillo',   nivel: 'Miembro',  enLinea: false, puntos: 180, avatar: '' },
    { id: 11, nombre: 'Valentina Ortiz',   nivel: 'Miembro',  enLinea: false, puntos: 150, avatar: '' },
    { id: 12, nombre: 'Mateo Vargas',      nivel: 'Miembro',  enLinea: false, puntos: 120, avatar: '' },
    { id: 13, nombre: 'Camila Rojas',      nivel: 'Miembro',  enLinea: false, puntos: 90,  avatar: '' },
    { id: 14, nombre: 'Sebastián Mora',    nivel: 'Miembro',  enLinea: false, puntos: 60,  avatar: '' },
    { id: 15, nombre: 'Daniela Paredes',   nivel: 'Miembro',  enLinea: false, puntos: 30,  avatar: '' },
  ],
  // tipo: 'riego' | 'abono' | 'cosecha' | 'siembra'
  actividades: [
    { id: 1,  jugador: 'Lucía Gomez',      tipo: 'riego',   texto: 'regó el Invernadero Norte',       fecha: haceDias(1) },
    { id: 2,  jugador: 'David Ruiz',       tipo: 'abono',   texto: 'abonó Árboles Frutales',          fecha: haceDias(2) },
    { id: 3,  jugador: 'Pepe Perez',       tipo: 'cosecha', texto: 'cosechó Lechugas (x8)',           fecha: haceDias(2) },
    { id: 4,  jugador: 'Carlos Rodriguez', tipo: 'riego',   texto: 'regó Parcela de Aguacates',       fecha: haceDias(2) },
    { id: 5,  jugador: 'Ana García',       tipo: 'siembra', texto: 'sembró Pimientos Rojos (x10)',    fecha: haceDias(3) },
    { id: 6,  jugador: 'Miguel Torres',    tipo: 'cosecha', texto: 'cosechó Cacao Orgánico (x25)',    fecha: haceDias(3) },
    { id: 7,  jugador: 'Elena Martínez',   tipo: 'abono',   texto: 'abonó la Huerta de Hortalizas',   fecha: haceDias(4) },
    { id: 8,  jugador: 'Juan Sanchez',     tipo: 'siembra', texto: 'sembró Tomates Riñón (x12)',      fecha: haceDias(4) },
    { id: 9,  jugador: 'Lucía Gomez',      tipo: 'cosecha', texto: 'cosechó Papas Cecilia (x30)',     fecha: haceDias(5) },
    { id: 10, jugador: 'Sofía Herrera',    tipo: 'riego',   texto: 'regó el Bancal de Hierbas',       fecha: haceDias(6) },
    { id: 11, jugador: 'Pepe Perez',       tipo: 'siembra', texto: 'sembró Maíz Suave (x20)',         fecha: haceDias(7) },
    { id: 12, jugador: 'Andrés Castillo',  tipo: 'abono',   texto: 'abonó Parcela de Quinua',         fecha: haceDias(8) },
  ],
}

function leerGremioGuardado() {
  try {
    const raw = localStorage.getItem('gremio_activo')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// GET /api/gremios/:id devuelve usuarios completos; solo tomamos lo que la vista necesita
function adaptarMiembro(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    nivel: u.nivelGremio ?? (u.rolGremio === 'Líder de Gremio' ? 'Fundador' : 'Miembro'),
    enLinea: Boolean(u.enLinea),
    puntos: u.puntos ?? 0,
    avatar: u.avatar ?? '',
  }
}

export function useGremio() {
  const [gremio, setGremio] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const controlador = new AbortController()
    const guardado = leerGremioGuardado()
    const id = guardado?.id ?? GREMIO_PRUEBA.id

    async function cargar() {
      try {
        const res = await fetch(`/api/gremios/${id}`, { signal: controlador.signal })
        if (!res.ok) throw new Error('Error al consultar gremio')
        const datos = await res.json()
        setGremio({
          ...GREMIO_PRUEBA,
          ...datos,
          miembros: Array.isArray(datos.miembros) ? datos.miembros.map(adaptarMiembro) : GREMIO_PRUEBA.miembros,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[useGremio] No se pudo conectar a la API, usando gremio de reserva:', err.message)
          setGremio({ ...GREMIO_PRUEBA, ...(guardado?.nombre ? { nombre: guardado.nombre } : {}) })
        }
      } finally {
        setCargando(false)
      }
    }

    cargar()
    return () => controlador.abort()
  }, [])

  // Solo actualiza el estado local: la persistencia queda para cuando exista el endpoint
  function guardarPerfil(cambios) {
    setGremio((prev) => (prev ? { ...prev, ...cambios } : prev))
  }

  return { gremio, cargando, guardarPerfil }
}
