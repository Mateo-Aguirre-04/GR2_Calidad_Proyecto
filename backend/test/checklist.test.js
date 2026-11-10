import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checklistHandler, readChecklist } from '../src/data/checklist.js'

function database(member = true, rows = []) {
  const calls = []
  return { calls, async query(sql, params) {
    calls.push({ sql, params })
    return { rows: calls.length === 1 ? (member ? [{ id_huerto: '42', id_gremio: '7' }] : []) : rows }
  } }
}

test('huerto ajeno: no consulta sus tareas', async () => {
  const db = database(false)
  await assert.rejects(readChecklist(db, '5', '42'), { status: 403 })
  assert.equal(db.calls.length, 1)
  assert.deepEqual(db.calls[0].params, ['5', '42'])
})

test('miembro autorizado: devuelve una lista vacía si no hay tareas', async () => {
  assert.deepEqual(await readChecklist(database(), '5', '42'), [])
})

test('conserva bigint, precisión del cultivo y estado de inscripción', async () => {
  const task = { id: '9007199254740993', huertoId: '42', codigo: 'limpieza_huerto', nombre: 'Limpiar',
    puntos: 30, modalidad: 'grupal', plantaId: null, fechaSiembra: null,
    programadaPara: null, completadaEn: null, completadaPor: null, completado: false, yaInscrito: true }
  const db = database(true, [task, { ...task, id: '2', codigo: 'riego', modalidad: 'individual',
    plantaId: '6', fechaSiembra: '2026-11-08 10:00:00.123456+00', yaInscrito: false }])
  const result = await readChecklist(db, '5', '42')
  assert.equal(result[0].id, task.id)
  assert.equal(result[0].yaInscrito, true)
  assert.equal(result[0].cultivo, null)
  assert.deepEqual(result[0].actividad, { codigo: 'limpieza_huerto', nombre: 'Limpiar', puntos: 30 })
  assert.deepEqual(result[1].cultivo, { huertoId: '42', plantaId: '6', fechaSiembra: '2026-11-08 10:00:00.123456+00' })
  assert.equal(result[1].yaInscrito, false)
  assert.deepEqual(db.calls[1].params, ['42', '5'])
})

test('rechaza IDs inválidos antes de consultar PostgreSQL', async () => {
  for (const id of ['', '0', '-1', '1.5', '1 OR 1=1', '9223372036854775808']) {
    const db = database()
    await assert.rejects(readChecklist(db, '5', id), { status: 400 })
    assert.equal(db.calls.length, 0)
  }
})

test('el controlador toma el usuario de la sesión e ignora usuarioId del cliente', async () => {
  const db = database()
  const res = { set() { return this }, json(body) { this.body = body; return this } }
  await checklistHandler(db)({ session: { usuarioId: '5', source: 'postgres' },
    params: { huertoId: '42' }, query: { usuarioId: '99' }, body: { usuarioId: '99' } }, res)
  assert.deepEqual(db.calls[0].params, ['5', '42'])
  assert.deepEqual(res.body, [])
})

test('sin sesión real devuelve 401 antes de consultar', async () => {
  for (const session of [undefined, { usuarioId: '5', source: 'mock' }]) {
    const db = database()
    const res = { status(code) { this.code = code; return this }, json() { return this } }
    await checklistHandler(db)({ session, params: { huertoId: '42' } }, res)
    assert.equal(res.code, 401)
    assert.equal(db.calls.length, 0)
  }
})
