import { httpError } from './postgres.js'

export const MAX_GUILD_DESCRIPTION = 120
export const MAX_GUILD_ANNOUNCEMENT = 160

export function canEditGuildProfile(role) {
  return typeof role === 'string' && ['oficial', 'maestro'].includes(role.trim().toLowerCase())
}

export function guildDescription(value, required = false) {
  if (typeof value !== 'string' || value.length > MAX_GUILD_DESCRIPTION || (required && !value.trim())) {
    throw httpError(400, `La descripción debe ${required ? 'contener texto y ' : ''}tener hasta ${MAX_GUILD_DESCRIPTION} caracteres.`)
  }
  return value.trim()
}

export async function updateGuildProfile(db, userId, guildId, body) {
  const id = Number(guildId)
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(400, 'Gremio inválido.')
  // Bloquear la membresía hasta el final de la transacción: el rango se verifica al guardar.
  const membership = await db.query(`SELECT rol FROM miembro_gremio
    WHERE id_gremio=$1 AND id_usuario=$2 FOR SHARE`, [id, userId])
  if (!canEditGuildProfile(membership.rows[0]?.rol)) {
    throw httpError(403, 'Solo Oficial y Maestro pueden editar la descripción y los anuncios del gremio.')
  }
  const descripcion = guildDescription(body?.descripcion)
  if (typeof body?.anuncios !== 'string' || body.anuncios.length > MAX_GUILD_ANNOUNCEMENT) {
    throw httpError(400, `El anuncio debe tener hasta ${MAX_GUILD_ANNOUNCEMENT} caracteres.`)
  }
  const { rows } = await db.query(`UPDATE gremio SET descripcion=$2, anuncios=$3, modified_at=now()
    WHERE id_gremio=$1 RETURNING descripcion, anuncios`, [id, descripcion, body.anuncios.trim()])
  if (!rows.length) throw httpError(404, 'Gremio no encontrado.')
  return { ...rows[0], puedeEditar: true }
}
