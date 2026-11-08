import { httpError } from './postgres.js'
import { lockMemberTask } from './taskParticipation.js'
import { rewardTaskParticipants } from './taskRewards.js'

async function completionResponse(db, task) {
  const { rows } = await db.query(`SELECT id_usuario::text AS "usuarioId", puntos_otorgados AS puntos
    FROM participantes_tarea WHERE id_tarea=$1 AND puntos_otorgados IS NOT NULL ORDER BY id_usuario`, [task.id])
  return { id: task.id, completado: true, completadaEn: task.completada_en,
    completadaPor: String(task.completada_por), recompensas: rows }
}

// La política se ejecuta únicamente para nuevas finalizaciones. Un reenvío autorizado
// de una tarea ya completada devuelve el resultado guardado, aunque cambie el catálogo.
export async function completeTask(db, usuarioId, huertoId, tareaId, checkAvailability, completedAt = null) {
  const { task } = await lockMemberTask(db, usuarioId, huertoId, tareaId)
  if (task.modalidad === 'individual' && task.responsable_id && String(task.responsable_id) !== String(usuarioId)) {
    throw httpError(403, 'Esta tarea individual pertenece a otro miembro.')
  }
  if (task.modalidad === 'grupal') {
    const enrolled = await db.query('SELECT 1 FROM participantes_tarea WHERE id_tarea=$1 AND id_usuario=$2', [tareaId, usuarioId])
    if (!enrolled.rows.length) throw httpError(403, 'Debes estar inscrito para completar esta jornada.')
  } else if (task.completada_en && String(task.completada_por) !== String(usuarioId)) {
    throw httpError(409, 'Otro miembro ya completó esta tarea individual.')
  }
  if (task.completada_en) return completionResponse(db, task)
  await checkAvailability(db, task)
  if (task.modalidad === 'individual') {
    await db.query(`INSERT INTO participantes_tarea(id_tarea,id_usuario) VALUES($1,$2)
      ON CONFLICT(id_tarea,id_usuario) DO NOTHING`, [tareaId, usuarioId])
  }
  const completed = await db.query(`UPDATE tareas_huerto SET completada_en=COALESCE($3::timestamptz,now()),completada_por=$2
    WHERE id_tarea=$1 RETURNING completada_en,completada_por::text`, [tareaId, usuarioId, completedAt])
  await rewardTaskParticipants(db, tareaId, task.puntos, task.modalidad === 'individual' ? usuarioId : null)
  return completionResponse(db, { ...task, ...completed.rows[0] })
}
