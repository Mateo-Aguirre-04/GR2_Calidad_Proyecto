// Operación interna: invocar dentro de la transacción de finalización, con la tarea
// bloqueada. La autorización y las condiciones de disponibilidad van antes.
export async function rewardTaskParticipants(db, tareaId, puntos, soloUsuarioId = null) {
  // Bloquear usuarios en orden antes de activar los triggers de recompensa y gremio.
  await db.query(`SELECT u.id_usuario FROM usuario_general u JOIN participantes_tarea p USING(id_usuario)
    WHERE p.id_tarea=$1 AND p.puntos_otorgados IS NULL AND ($2::bigint IS NULL OR p.id_usuario=$2)
    ORDER BY u.id_usuario FOR NO KEY UPDATE OF u`, [tareaId, soloUsuarioId])
  await db.query(`SELECT g.id_gremio FROM gremio g WHERE EXISTS(
    SELECT 1 FROM miembro_gremio m JOIN participantes_tarea p USING(id_usuario)
    WHERE m.id_gremio=g.id_gremio AND p.id_tarea=$1 AND p.puntos_otorgados IS NULL
      AND ($2::bigint IS NULL OR p.id_usuario=$2)) ORDER BY g.id_gremio FOR NO KEY UPDATE`,[tareaId,soloUsuarioId])
  const { rows: awarded } = await db.query(`UPDATE participantes_tarea
    SET puntos_otorgados=$2 WHERE id_tarea=$1 AND puntos_otorgados IS NULL
      AND ($3::bigint IS NULL OR id_usuario=$3)
    RETURNING id_usuario::text AS "usuarioId", puntos_otorgados AS puntos`, [tareaId, puntos, soloUsuarioId])
  // El trigger acreditar_recompensa_tarea es la única vía de acreditación.
  return awarded
}
