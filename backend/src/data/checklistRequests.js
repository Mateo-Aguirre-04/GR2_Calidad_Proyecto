import { httpError } from './postgres.js'

export function requestKey(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw httpError(400, 'Envía una claveSolicitud UUID y reutilízala al reintentar la misma acción.')
  }
  return value.toLowerCase()
}

export async function requestOnce(db, user, garden, key, action, content, operation) {
  key = requestKey(key)
  const json = JSON.stringify(content)
  await db.query(`INSERT INTO solicitudes_checklist(id_usuario,clave_solicitud,id_huerto,accion,contenido)
    VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id_usuario,clave_solicitud) DO NOTHING`, [user,key,garden,action,json])
  const request = (await db.query(`SELECT id_huerto::text AS huerto,accion,contenido=$3::jsonb AS coincide,resultado
    FROM solicitudes_checklist WHERE id_usuario=$1 AND clave_solicitud=$2 FOR UPDATE`, [user,key,json])).rows[0]
  if (request.huerto !== garden || request.accion !== action || !request.coincide) {
    throw httpError(409, 'Esta claveSolicitud ya representa otra acción. Reutiliza el contenido original.')
  }
  if (request.resultado) return request.resultado
  const result = JSON.parse(JSON.stringify(await operation()))
  await db.query('UPDATE solicitudes_checklist SET resultado=$3::jsonb WHERE id_usuario=$1 AND clave_solicitud=$2',
    [user,key,JSON.stringify(result)])
  return result
}
