import { httpError, requireMember } from './postgres.js'
import { validId } from './taskParticipation.js'
import { completeTask } from './taskCompletion.js'
import { requestOnce } from './checklistRequests.js'

export function wateringInput(body) {
  if (!body || typeof body.claveSolicitud !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.claveSolicitud)) {
    throw httpError(400, 'Envía una claveSolicitud UUID y reutilízala al reintentar la misma acción.')
  }
  if (!Array.isArray(body.cultivos) || body.cultivos.length < 1 || body.cultivos.length > 100) {
    throw httpError(400, 'Selecciona entre 1 y 100 cultivos.')
  }
  const cultivos = body.cultivos.map(crop => {
    validId(crop?.plantaId, 'planta')
    if (typeof crop.fechaSiembra !== 'string'
      || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(crop.fechaSiembra)
      || !Number.isFinite(Date.parse(crop.fechaSiembra))) {
      throw httpError(400, 'Envía la fechaSiembra exacta del cultivo con su zona horaria.')
    }
    return { plantaId: crop.plantaId, fechaSiembra: crop.fechaSiembra }
  }).sort((a, b) => a.plantaId === b.plantaId ? a.fechaSiembra.localeCompare(b.fechaSiembra)
    : BigInt(a.plantaId) < BigInt(b.plantaId) ? -1 : 1)
  return { claveSolicitud: body.claveSolicitud.toLowerCase(), cultivos }
}

// Se ejecuta en una única transacción. No establece frecuencia ni límite diario.
export async function recordWatering(db, usuarioId, huertoId, body) {
  validId(huertoId, 'huerto')
  const input = wateringInput(body)
  await requireMember(db, usuarioId, huertoId)
  const selection = JSON.stringify(input.cultivos)
  return requestOnce(db, usuarioId, huertoId, input.claveSolicitud, 'riego', input.cultivos, async () => {
    let crops
    try {
      crops = (await db.query(`SELECT hp.id_planta::text AS "plantaId",hp.fecha_siembra::text AS "fechaSiembra"
        FROM huerto_planta hp JOIN jsonb_to_recordset($2::jsonb)
          AS c("plantaId" bigint,"fechaSiembra" timestamptz)
          ON hp.id_planta=c."plantaId" AND hp.fecha_siembra=c."fechaSiembra"
        WHERE hp.id_huerto=$1 AND hp.id_estado<>$3 ORDER BY hp.id_planta,hp.fecha_siembra FOR KEY SHARE OF hp`,
      [huertoId, selection,Number(process.env.HARVEST_STATE_ID || 6)])).rows
    } catch (error) {
      if (['22007', '22008'].includes(error.code)) throw httpError(400, 'La fecha de siembra no es válida.')
      throw error
    }
    if (crops.length !== input.cultivos.length) throw httpError(404, 'Uno o más cultivos no pertenecen a este huerto.')
    if (new Set(crops.map(c => `${c.plantaId}:${c.fechaSiembra}`)).size !== crops.length) {
      throw httpError(400, 'La selección contiene el mismo cultivo más de una vez.')
    }
    const points = (await db.query("SELECT puntos FROM actividades WHERE codigo='riego' FOR SHARE")).rows[0]?.puntos
    if (points !== 5) throw httpError(409, 'El catálogo de riego debe conservar los 5 puntos acordados.')
    const tareas = []
    for (const crop of crops) {
      const task = (await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_planta,fecha_siembra,modalidad,programada_para)
        VALUES('riego',$1,$2,$3,'individual',now()) RETURNING id_tarea::text AS id`,
      [huertoId, crop.plantaId, crop.fechaSiembra])).rows[0]
      tareas.push(await completeTask(db, usuarioId, huertoId, task.id, async () => {}))
    }
    // Guardar la misma representación que se entregará por HTTP, incluidas las fechas.
    const result = JSON.parse(JSON.stringify({ claveSolicitud: input.claveSolicitud, huertoId,
      puntosOtorgados: 5 * crops.length, tareas }))
    return result
  })
}
