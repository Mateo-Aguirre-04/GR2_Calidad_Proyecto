import { httpError, requireMember } from './postgres.js'
import { validId } from './taskParticipation.js'
import { completeTask } from './taskCompletion.js'
import { requestOnce } from './checklistRequests.js'
import { mappedSection } from './sections.js'
import { assertAvailable, taskDetails } from './checklistRules.js'

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
export async function recordWatering(db, usuarioId, huertoId, body, env) {
  validId(huertoId, 'huerto')
  validId(body?.zonaId, 'sección')
  await requireMember(db, usuarioId, huertoId)
  return requestOnce(db, usuarioId, huertoId, body.claveSolicitud, 'riego_seccion', {zonaId:body.zonaId}, async () => {
    await mappedSection(db,huertoId,body.zonaId)
    const points = (await db.query("SELECT puntos FROM actividades WHERE codigo='riego' FOR SHARE")).rows[0]?.puntos
    if (points !== 5) throw httpError(409, 'El catálogo de riego debe conservar los 5 puntos acordados.')
    const task=(await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_zona,modalidad,programada_para)
      VALUES('riego',$1,$2,'individual',$3) RETURNING id_tarea::text AS id`,[huertoId,body.zonaId,env.ahora])).rows[0]
    const receipt=await completeTask(db,usuarioId,huertoId,task.id,async()=>{
      await assertAvailable(db,(await taskDetails(db,huertoId,task.id,env))[0],env,{})
    },env.ahora)
    return {claveSolicitud:body.claveSolicitud,huertoId,zonaId:body.zonaId,puntosOtorgados:5,tareas:[receipt]}
  })
}
