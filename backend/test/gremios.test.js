import { test } from 'node:test'
import assert from 'node:assert/strict'
import session from 'express-session'
import { createApp } from '../src/app.js'
import { isOnline, ONLINE_MS, createSessionStore, getPresence } from '../src/config/sessions.js'

test('cuentas PostgreSQL usan presencia en memoria y no sobreviven a otro backend', async () => {
  const store = await createSessionStore()
  const lastSeen = new Date().toISOString()
  await new Promise((resolve, reject) => store.set('sesion-prueba', {
    usuarioId: 123, source: 'postgres', lastSeen,
    cookie: { expires: new Date(Date.now() + 60_000).toISOString() },
  }, (err) => err ? reject(err) : resolve()))
  assert.equal((await getPresence(store, 'postgres')).get(123), lastSeen)
  assert.equal((await getPresence(await createSessionStore(), 'postgres')).size, 0)
})

test('presencia: frontera estricta de 15 minutos y fechas inválidas', () => {
  const now = Date.now()
  assert.equal(isOnline(new Date(now - ONLINE_MS + 1), now), true)
  assert.equal(isOnline(new Date(now - ONLINE_MS), now), false)
  assert.equal(isOnline('inválida', now), false)
  assert.equal(isOnline(new Date(now + 1), now), false)
})

test('API: cookies, miembros, acciones reales, dos sesiones, expiración y logout', async (t) => {
  const store = new session.MemoryStore()
  const app = createApp(store)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  async function call(path, { cookie, body, method = body ? 'POST' : 'GET' } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { res, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] }
  }
  const member = (data) => data.miembros.find((u) => u.id === 3)
  const initial = await call('/api/gremios/1')
  assert.equal(member(initial.data).enLinea, false)
  assert.equal(initial.cookie, undefined)
  assert.equal('actividades' in initial.data, false)
  assert.equal('contrasena' in member(initial.data), false)
  assert.equal((await call('/api/gremios/0')).res.status, 400)
  assert.equal((await call('/api/gremios/999')).res.status, 404)
  assert.equal((await call('/api/auth/presence', { method: 'POST' })).res.status, 401)
  const bad = await call('/api/auth/login', { body: { usuario: 'carlos_andrade', contrasena: 'incorrecta' } })
  assert.equal(bad.res.status, 401)
  assert.equal(bad.cookie, undefined)
  const credentials = { usuario: 'carlos_andrade', contrasena: 'password123' }
  const first = await call('/api/auth/login', { body: credentials })
  assert.equal(first.res.status, 200)
  assert.match(first.res.headers.get('set-cookie'), /HttpOnly/i)
  assert.match(first.res.headers.get('set-cookie'), /SameSite=Lax/i)
  assert.equal('contrasena' in first.data.usuario, false)
  assert.equal(member((await call('/api/gremios/1')).data).enLinea, true)
  const planted = await call('/api/huertos/1/sembrar', { cookie: first.cookie, body: { plantaId: 3, x: 10, y: 20 } })
  assert.equal(planted.res.status, 201)
  const second = await call('/api/auth/login', { body: credentials })
  assert.notEqual(first.cookie, second.cookie)
  await call('/api/auth/logout', { cookie: first.cookie, method: 'POST' })
  assert.equal(member((await call('/api/gremios/1')).data).enLinea, true)
  assert.equal((await call('/api/auth/presence', { cookie: first.cookie, method: 'POST' })).res.status, 401)
  // Envejecer el lastSeen conservando la cookie: una sesión viva puede estar desconectada.
  const all = await new Promise((resolve, reject) => store.all((err, values) => err ? reject(err) : resolve(values)))
  for (const [id, value] of Object.entries(all)) {
    value.lastSeen = new Date(Date.now() - ONLINE_MS - 1).toISOString()
    await new Promise((resolve, reject) => store.set(id, value, (err) => err ? reject(err) : resolve()))
  }
  assert.equal(member((await call('/api/gremios/1')).data).enLinea, false)
  await call('/api/auth/presence', { cookie: second.cookie, method: 'POST' })
  assert.equal(member((await call('/api/gremios/1')).data).enLinea, true)
  await call('/api/auth/logout', { cookie: second.cookie, method: 'POST' })
  assert.equal(member((await call('/api/gremios/1')).data).enLinea, false)
})
