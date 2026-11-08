import { randomInt } from 'node:crypto'
import { guildDescription } from './guildProfile.js'
import { httpError } from './postgres.js'

async function invitation(db, guildId, userId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const codigo = String(randomInt(100000, 1000000))
    const { rows } = await db.query(`INSERT INTO invitacion_gremio(codigo,id_gremio,creado_por,expira_en)
      VALUES($1,$2,$3,now()+interval '7 days') ON CONFLICT(codigo) DO NOTHING RETURNING codigo`, [codigo, guildId, userId])
    if (rows.length) return rows[0].codigo
  }
  throw httpError(503, 'No se pudo generar el código. Inténtalo de nuevo.')
}

export async function createGuildRecords(db, userId, input) {
  const { nombre, area, lat, lng } = input || {}
  const descripcion = guildDescription(input?.descripcion, true)
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150
    || !Number.isFinite(Number(area)) || Number(area) <= 0) {
    throw httpError(400, 'Nombre y área positiva son obligatorios.')
  }
  const validCoordinate = (value) => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value))
  if (!validCoordinate(lat) || !validCoordinate(lng) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
    throw httpError(400, 'Coordenadas inválidas.')
  }

  const user = await db.query('SELECT id_usuario FROM usuario_general WHERE id_usuario=$1 FOR UPDATE', [userId])
  if (!user.rows.length) throw httpError(404, 'No se encontró el usuario de la sesión.')

  const membership = await db.query('SELECT 1 FROM miembro_gremio WHERE id_usuario=$1 LIMIT 1', [userId])
  if (membership.rows.length) throw httpError(409, 'Ya perteneces a un gremio.')

  const catalogs = await db.query(`SELECT c.id_cerca,c.id_subcerca,d.id_diseño,d.id_subdiseño,a.id_abono,s.id_suelo,r.id_riego
    FROM subcerca_seguridad c CROSS JOIN subdiseño_huerto d CROSS JOIN tipo_abono a CROSS JOIN tipo_suelo s CROSS JOIN tipo_riego r
    ORDER BY c.id_cerca,c.id_subcerca,d.id_diseño,d.id_subdiseño,a.id_abono,s.id_suelo,r.id_riego LIMIT 1`)
  if (!catalogs.rows.length) throw httpError(409, 'Faltan catálogos de configuración del huerto en la base.')
  const catalog = catalogs.rows[0]

  for (const [field, table, key] of [['suelo', 'tipo_suelo', 'id_suelo'], ['riego', 'tipo_riego', 'id_riego']]) {
    if (typeof input[field] !== 'string' || !input[field].trim()) throw httpError(400, `Selecciona un tipo de ${field}.`)
    const selected = await db.query(`SELECT ${key} FROM ${table} WHERE nombre=$1 LIMIT 1`, [input[field]])
    if (!selected.rows.length) throw httpError(400, `El tipo de ${field} no existe en la base.`)
    catalog[key] = selected.rows[0][key]
  }

  const { rows: guildRows } = await db.query(`INSERT INTO gremio(nombre_gremio,area_total,latitud,longitud,descripcion,anuncios)
    VALUES($1,$2,$3,$4,$5,'') RETURNING id_gremio`,
  [nombre.trim(), Number(area), Number(lat), Number(lng), descripcion])
  const guildId = guildRows[0].id_gremio

  await db.query(`INSERT INTO miembro_gremio(id_usuario,id_gremio,fecha_ingreso,rol)
    VALUES($1,$2,CURRENT_DATE,$3)`, [userId, guildId, 'Fundador'])
  const { rows: gardenRows } = await db.query(`INSERT INTO huerto(id_gremio,id_cerca,id_subcerca,id_abono,id_suelo,id_riego,id_diseño,id_subdiseño)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_huerto AS id`,
  [guildId, catalog.id_cerca, catalog.id_subcerca, catalog.id_abono, catalog.id_suelo, catalog.id_riego, catalog.id_diseño, catalog.id_subdiseño])
  const codigo = await invitation(db, guildId, userId)

  return {
    id: Number(guildId),
    codigo,
    nombre: nombre.trim(),
    descripcion,
    anuncios: '',
    areaTotal: Number(area),
    ubicacion: { lat: Number(lat), lng: Number(lng) },
    huerto: { id: Number(gardenRows[0].id) },
  }
}
