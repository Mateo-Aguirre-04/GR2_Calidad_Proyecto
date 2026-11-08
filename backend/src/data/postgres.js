import { fasesCrecimiento } from './fases.js'

export function httpError(status, message) {
  return Object.assign(new Error(message), { status })
}

export function requireUser(req) {
  if (!req.session?.usuarioId || req.session.source !== 'postgres') throw httpError(401, 'Tu sesión terminó. Inicia sesión nuevamente.')
  return req.session.usuarioId
}

export async function requireMember(db, usuarioId, huertoId) {
  const { rows } = await db.query(`SELECT h.id_huerto, h.id_gremio FROM huerto h
    JOIN miembro_gremio m ON m.id_gremio=h.id_gremio AND m.id_usuario=$1
    WHERE h.id_huerto=$2`, [usuarioId, huertoId])
  if (!rows.length) throw httpError(403, 'No perteneces al gremio de este huerto.')
  return rows[0]
}

export function growthDays(cycle) {
  const match = String(cycle || '').match(/(\d+)(?:\s*-\s*(\d+))?\s*d[ií]as/i)
  return match ? Number(match[2] || match[1]) : 60
}

export function cropResponse(row) {
  let metadata = {}
  try { metadata = JSON.parse(row.observaciones) } catch { /* Observaciones antiguas son texto libre. */ }
  const fecha = new Date(row.fecha_siembra).toISOString()
  return {
    id: `${row.id_planta}:${row.fecha_exacta || fecha}`,
    plantaId: Number(row.id_planta),
    planta: {
      nombre: row.nombre_comun,
      nombreCientifico: row.nombre_cientifico || '',
      ciclo: row.ciclo_cultivo || '',
      imagen: row.imagen || '',
      diasCrecimiento: growthDays(row.ciclo_cultivo),
      // Solo fases de crecimiento (la última es la de cosecha); la muerta va en imagenMuerta.
      fases: fasesCrecimiento(row.fases).map((f) => ({ fase: Number(f.fase), nombre: f.nombre || '', imagen: f.imagen || '' })),
      imagenes: fasesCrecimiento(row.fases).map((f) => f.imagen),
      imagenMuerta: row.imagen_muerta || (Array.isArray(row.fases) ? row.fases.find(f => f.muerta)?.imagen : '') || '',
    },
    sembradoEn: fecha,
    x: Number.isFinite(metadata.x) ? metadata.x : 50,
    y: Number.isFinite(metadata.y) ? metadata.y : 50,
    cantidad: Number(row.cantidad) || 1,
    zona: row.zona == null ? null : Number(row.zona),
    parcela: row.parcela == null ? null : Number(row.parcela),
    cosechado: metadata.cosechado === true || Number(row.id_estado) === Number(process.env.HARVEST_STATE_ID || 6),
  }
}

export function sendError(res, error) {
  console.error('[PostgreSQL]', error.code || error.status || 'ERROR')
  return res.status(error.status || 503).json({ error: error.status ? error.message : 'No se pudo guardar o consultar la base de datos.' })
}