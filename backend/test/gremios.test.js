import { test } from 'node:test'
import assert from 'node:assert/strict'
import session from 'express-session'
import { createApp } from '../src/app.js'
import { isOnline, ONLINE_MS } from '../src/config/sessions.js'
import { mockData } from '../src/data/mockStore.js'
import { activityType } from '../src/controllers/gremios.controller.js'

test('presencia: frontera estricta de 15 minutos y fechas inválidas', () => {
  const now = Date.now()
  assert.equal(isOnline(new Date(now - ONLINE_MS + 1), now), true)
  assert.equal(isOnline(new Date(now - ONLINE_MS), now), false)
  assert.equal(isOnline('inválida', now), false)
  assert.equal(isOnline(new Date(now + 1), now), false)
})

test('clasifica el catálogo de actividades, incluidas otras actividades', () => {
  for (const [text, type] of [['Regó el huerto', 'riego'], ['Abonar', 'abono'], ['Cosechar', 'cosecha'], ['Sembrar', 'siembra'], ['Reunión', 'otro']]) {
    assert.equal(activityType(text), type)
  }
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
  assert.equal(initial.data.actividades.length, 0)
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
  const history = (await call('/api/gremios/1')).data.actividades
  assert.equal(history.length, 1)
  assert.equal(history[0].jugador, 'Carlos Andrade')
  assert.equal(history[0].tipo, 'siembra')
  assert.equal((await call('/api/gremios/2')).data.actividades.length, 0)
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
  // Evitar que la prueba deje datos en otros tests del mismo proceso.
  mockData.actividades.length = 0
})
