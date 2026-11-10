import { authenticatedFetch } from '../authSession'

async function request(path, method = 'GET', signal, body) {
  const response = await authenticatedFetch(path, { method, signal,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el checklist.')
  return result
}

const gardenPath = huertoId => `/api/recordatorios/huerto/${encodeURIComponent(huertoId)}`

export function sincronizarChecklist(huertoId, { signal } = {}) {
  return request(`${gardenPath(huertoId)}/sincronizar`, 'POST', signal)
}

export function completarTarea(huertoId, tareaId, confirmaciones = {}) {
  return request(`${gardenPath(huertoId)}/tareas/${encodeURIComponent(tareaId)}/completar`,
    'POST', undefined, { confirmaciones })
}

export function crearZona(huertoId, zona, parcela) {
  return request(`${gardenPath(huertoId)}/zonas`, 'POST', undefined, { zona, parcela })
}

export function iniciarCicloZona(huertoId, zonaId, claveSolicitud) {
  return request(`${gardenPath(huertoId)}/ciclos`, 'POST', undefined, { zonaId, claveSolicitud })
}

export function programarActividad(huertoId, datos) {
  return request(`${gardenPath(huertoId)}/programar`, 'POST', undefined, datos)
}

export function sembrarConChecklist(huertoId, datos) {
  return request(`${gardenPath(huertoId)}/siembras`, 'POST', undefined, datos)
}

export function configurarCultivo(huertoId, datos) {
  return request(`${gardenPath(huertoId)}/cultivos/configuracion`, 'PUT', undefined, datos)
}

export function finalizarCultivo(huertoId, datos) {
  return request(`${gardenPath(huertoId)}/cultivos/finalizar`, 'POST', undefined, datos)
}

export function iniciarSecado(huertoId, loteId, modalidad, aLaSombra) {
  return request(`${gardenPath(huertoId)}/secados`, 'POST', undefined, { loteId, modalidad, aLaSombra })
}

export function inscribirseEnTarea(huertoId, tareaId) {
  return request(`/api/recordatorios/huerto/${encodeURIComponent(huertoId)}/tareas/${encodeURIComponent(tareaId)}/inscribirse`, 'POST')
}

export function registrarRiegos(huertoId, zonaId, claveSolicitud) {
  return request(`/api/recordatorios/huerto/${encodeURIComponent(huertoId)}/riegos`,
    'POST', undefined, { zonaId, claveSolicitud })
}
