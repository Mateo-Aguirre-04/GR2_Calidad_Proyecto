import { test } from 'node:test'
import assert from 'node:assert/strict'
import { touchSharedPresence } from '../src/data/sharedPresence.js'
import { presenceConfig } from '../src/config/presence.js'

test('presencia compartida: una escritura por intervalo, sin consultas intermedias', async () => {
  const now = Date.now(), calls = []
  const req = { session: { usuarioId: 42, source: 'postgres' } }
  const db = async (sql, params) => {
    calls.push({sql,params})
    return { rows: [{ last_seen: new Date(calls.length === 1 ? now : now + presenceConfig.updateIntervalMs) }] }
  }
  await touchSharedPresence(req, null, db, now)
  for (const elapsed of [1000,60_000,presenceConfig.updateIntervalMs-1]) await touchSharedPresence(req, undefined, db, now+elapsed)
  assert.equal(calls.length,1)
  await touchSharedPresence(req, undefined, db, now+presenceConfig.updateIntervalMs)
  assert.equal(calls.length,2)
  assert.equal(calls[0].params[1],presenceConfig.updateIntervalMs)
  assert.match(calls[0].sql,/WHERE id_usuario=\$1 AND/)
})

test('otro backend lee una fecha reciente del login y no vuelve a escribir', async () => {
  const now=Date.now(), req={session:{usuarioId:42,source:'postgres'}}
  let queries=0
  await touchSharedPresence(req,new Date(now-1000),async()=>{ queries++;return {rows:[]} },now)
  assert.equal(queries,0)
  assert.equal(req.session.presenceDueAt,now-1000+presenceConfig.updateIntervalMs)
})

test('la demostración no escribe en Supabase y el plazo en línea cubre el intervalo', async () => {
  await touchSharedPresence({session:{source:'mock'}},null,async()=>assert.fail('No debe consultar la base'))
  assert.ok(presenceConfig.onlineWindowMs>presenceConfig.updateIntervalMs)
  assert.equal(presenceConfig.refreshIntervalMs,presenceConfig.updateIntervalMs)
})
