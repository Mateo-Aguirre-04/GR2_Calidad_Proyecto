import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readChecklist } from '../src/data/checklist.js'

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
