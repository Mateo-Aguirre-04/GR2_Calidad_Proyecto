import { httpError, requireMember, requireUser, sendError } from './postgres.js'

export async function readChecklist(db, usuarioId, huertoId) {
  // Mantener bigint como texto: los IDs de PostgreSQL pueden superar MAX_SAFE_INTEGER.
  if (typeof huertoId !== 'string' || !/^[1-9]\d{0,18}$/.test(huertoId)
    || BigInt(huertoId) > 9223372036854775807n) {
    throw httpError(400, 'ID de huerto inválido.')
  }
  await requireMember(db, usuarioId, huertoId)
  const { rows } = await db.query(`SELECT t.id_tarea::text AS id, t.id_huerto::text AS "huertoId",
      a.codigo, a.nombre, a.puntos, t.modalidad,
      t.id_planta::text AS "plantaId", t.fecha_siembra::text AS "fechaSiembra",
      t.programada_para AS "programadaPara", t.completada_en AS "completadaEn",
      t.completada_por::text AS "completadaPor",
      (t.completada_en IS NOT NULL) AS completado,
      CASE WHEN t.modalidad='grupal' THEN EXISTS (
        SELECT 1 FROM participantes_tarea pt WHERE pt.id_tarea=t.id_tarea AND pt.id_usuario=$2
      ) ELSE FALSE END AS "yaInscrito"
    FROM tareas_huerto t JOIN actividades a ON a.codigo=t.codigo_actividad
    WHERE t.id_huerto=$1
    ORDER BY t.programada_para ASC NULLS LAST, t.id_tarea ASC`, [huertoId, usuarioId])
  return rows.map(({ codigo, nombre, puntos, plantaId, fechaSiembra, ...task }) => ({
    ...task,
    actividad: { codigo, nombre, puntos },
    cultivo: plantaId === null ? null : { huertoId: task.huertoId, plantaId, fechaSiembra },
  }))
}

export function checklistHandler(db) {
  return async (req, res) => {
    try {
      const usuarioId = requireUser(req)
      const tasks = await readChecklist(db, usuarioId, req.params.huertoId)
      res.set('Cache-Control', 'no-store').json(tasks)
    } catch (error) { sendError(res, error) }
  }
}
