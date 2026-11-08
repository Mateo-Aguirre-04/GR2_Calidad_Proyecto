import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wateringInput } from '../src/data/watering.js'

const claveSolicitud = '23f70b94-af20-46c5-9f88-7db0887a6cac'
const crop = { plantaId: '9007199254740993', fechaSiembra: '2026-11-08 10:00:00.123456+00' }

test('riego conserva bigint y microsegundos; normaliza el orden de la selección', () => {
  const result = wateringInput({ claveSolicitud: claveSolicitud.toUpperCase(), cultivos: [crop,
    { ...crop, plantaId: '2' }], puntos: 999, usuarioId: '99' })
  assert.equal(result.claveSolicitud, claveSolicitud)
  assert.deepEqual(result.cultivos, [{ ...crop, plantaId: '2' }, crop])
  assert.deepEqual(Object.keys(result), ['claveSolicitud', 'cultivos'])
})

test('riego rechaza cuerpos, claves, selecciones y cultivos inválidos', () => {
  for (const body of [undefined, {}, { claveSolicitud, cultivos: [] },
    { claveSolicitud: 'otra', cultivos: [crop] }, { claveSolicitud, cultivos: Array(101).fill(crop) },
    { claveSolicitud, cultivos: [null] }, { claveSolicitud, cultivos: [{ ...crop, plantaId: '-1' }] },
    { claveSolicitud, cultivos: [{ ...crop, fechaSiembra: '2026-11-08' }] }]) {
    assert.throws(() => wateringInput(body), { status: 400 })
  }
})
