// Operación interna: invocar dentro de la transacción de finalización, con la tarea
// bloqueada. La autorización y las condiciones de disponibilidad van antes.
export async function rewardTaskParticipants(db, tareaId, puntos, soloUsuarioId = null) {
  const { rows: awarded } = await db.query(`UPDATE participantes_tarea
    SET puntos_otorgados=$2 WHERE id_tarea=$1 AND puntos_otorgados IS NULL
      AND ($3::bigint IS NULL OR id_usuario=$3)
    RETURNING id_usuario::text AS "usuarioId", puntos_otorgados AS puntos`, [tareaId, puntos, soloUsuarioId])
  if (!awarded.length) return []

  // Orden global de usuarios para evitar interbloqueos entre jornadas distintas.
  const ids = awarded.map(row => row.usuarioId).sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1)
  // NO KEY UPDATE es compatible con el KEY SHARE que toman las FK de tareas y
  // participantes: FOR UPDATE produciría un interbloqueo al cerrar jornadas distintas.
  await db.query(`SELECT id_usuario FROM usuario_general WHERE id_usuario=ANY($1::bigint[])
    ORDER BY id_usuario FOR NO KEY UPDATE`, [ids])
  for (const usuarioId of ids) {
    const result = await db.query(`UPDATE usuario_general SET puntos=puntos+$2
      WHERE id_usuario=$1 RETURNING id_usuario`, [usuarioId, puntos])
    if (result.rowCount !== 1) throw new Error('No se encontró el participante para acreditar sus puntos.')
  }
  return awarded
}
