import { httpError, requireMember, requireUser, sendError } from './postgres.js'

export function validId(value, label) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)
    || BigInt(value) > 9223372036854775807n) {
    throw httpError(400, `ID de ${label} inválido.`)
  }
  return value
}

// Inscribir y completar deben tomar este mismo bloqueo dentro de una transacción.
// Así una inscripción no puede llegar después de calcular las recompensas.
export async function lockMemberTask(db, usuarioId, huertoId, tareaId) {
  validId(huertoId, 'huerto')
  validId(tareaId, 'tarea')
  const membership = await requireMember(db, usuarioId, huertoId)
  const { rows } = await db.query(`SELECT t.*, t.id_tarea::text AS id,
      t.id_huerto::text AS "huertoId", a.puntos
    FROM tareas_huerto t JOIN actividades a ON a.codigo=t.codigo_actividad
    WHERE t.id_tarea=$1 AND t.id_huerto=$2 FOR UPDATE OF t`, [tareaId, huertoId])
  if (!rows.length) throw httpError(404, 'Tarea no encontrada en este huerto.')
  return { task: rows[0], membership }
}

export async function enrollTask(db, usuarioId, huertoId, tareaId) {
  const { task } = await lockMemberTask(db, usuarioId, huertoId, tareaId)
  if (task.modalidad !== 'grupal') throw httpError(409, 'Solo las tareas grupales admiten inscripción.')
  const existing = await db.query(`SELECT 1 FROM participantes_tarea
    WHERE id_tarea=$1 AND id_usuario=$2`, [tareaId, usuarioId])
  if (existing.rows.length) return { id: task.id, yaInscrito: true, nuevaInscripcion: false }
  if (task.completada_en) throw httpError(409, 'La tarea ya terminó; no admite nuevos participantes.')
  await db.query(`INSERT INTO participantes_tarea(id_tarea,id_usuario) VALUES($1,$2)
    ON CONFLICT(id_tarea,id_usuario) DO NOTHING`, [tareaId, usuarioId])
  return { id: task.id, yaInscrito: true, nuevaInscripcion: true }
}

export function taskMutationHandler(runTransaction, operation) {
  return async (req, res) => {
    try {
      const usuarioId = requireUser(req)
      const result = await runTransaction(db => operation(db, usuarioId, req.params.huertoId, req.params.tareaId, req.body))
      res.set('Cache-Control', 'no-store').json(result)
    } catch (error) { sendError(res, error) }
  }
}
