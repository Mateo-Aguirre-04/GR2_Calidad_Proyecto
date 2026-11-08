import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGuildRecords } from '../src/data/guildCreation.js'

function database({ membership = [] } = {}) {
  const calls = []
  let invitationAttempts = 0
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params })
      if (sql.startsWith('SELECT id_usuario FROM usuario_general')) return { rows: [{ id_usuario: 42 }] }
      if (sql.startsWith('SELECT 1 FROM miembro_gremio')) return { rows: membership }
      if (sql.includes('FROM subcerca_seguridad')) {
        return { rows: [{ id_cerca: 1, id_subcerca: 2, id_diseño: 3, id_subdiseño: 4, id_abono: 5, id_suelo: 6, id_riego: 7 }] }
      }
      if (sql.startsWith('SELECT id_suelo FROM tipo_suelo')) return { rows: [{ id_suelo: 8 }] }
      if (sql.startsWith('SELECT id_riego FROM tipo_riego')) return { rows: [{ id_riego: 9 }] }
      if (sql.startsWith('INSERT INTO gremio')) return { rows: [{ id_gremio: 17 }] }
      if (sql.startsWith('INSERT INTO huerto')) return { rows: [{ id: 24 }] }
      if (sql.startsWith('INSERT INTO invitacion_gremio')) {
        invitationAttempts += 1
        return { rows: invitationAttempts === 1 ? [] : [{ codigo: params[0] }] }
      }
      return { rows: [] }
    },
  }
}

const input = {
  nombre: '  Huerto Nuevo  ',
  descripcion: '  Comunidad de prueba  ',
  area: 125,
  suelo: 'Franco',
  riego: 'Goteo',
  lat: -1.2,
  lng: -78.6,
  usuarioId: 99,
}

test('crea gremio, membresía Fundador, huerto e invitación para el usuario de sesión', async () => {
  const db = database()
  const result = await createGuildRecords(db, 42, input)

  assert.equal(result.id, 17)
  assert.equal(result.nombre, 'Huerto Nuevo')
  assert.equal(result.descripcion, 'Comunidad de prueba')
  assert.deepEqual(result.huerto, { id: 24 })
  assert.match(db.calls.find((call) => call.sql.startsWith('INSERT INTO miembro_gremio')).sql, /CURRENT_DATE/)
  assert.deepEqual(
    db.calls.find((call) => call.sql.startsWith('INSERT INTO miembro_gremio')).params,
    [42, 17, 'Fundador'],
  )
  assert.equal(db.calls.filter((call) => call.sql.startsWith('INSERT INTO invitacion_gremio')).length, 2)
})

test('no permite crear otro gremio si el usuario ya tiene membresía', async () => {
  const db = database({ membership: [{ '?column?': 1 }] })
  await assert.rejects(createGuildRecords(db, 42, input), { status: 409 })
  assert.equal(db.calls.some((call) => call.sql.startsWith('INSERT INTO gremio')), false)
})
