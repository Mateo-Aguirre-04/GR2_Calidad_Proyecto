import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authenticatedFetch } from '../src/authSession.js'

function browser(t) {
  const entries = new Map([['usuario_actual','usuario'],['gremio_activo','gremio'],['huerto_activo_id','1']])
  const redirects = []
  for (const [name, value] of Object.entries({
    localStorage: { removeItem: (key) => entries.delete(key) },
    window: { location: { pathname: '/juego', replace: (url) => redirects.push(url) } },
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, value })
    t.after(() => original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name])
  }
  return { entries, redirects }
}

test('sesión vencida: limpia el usuario anterior y regresa al login', async (t) => {
  const state = browser(t)
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.credentials, 'include')
    return { status: 401 }
  })
  await authenticatedFetch('/api/huertos/1')
  assert.equal(state.entries.size, 0)
  assert.deepEqual(state.redirects, ['/'])
})

test('fallo temporal del servidor: conserva la sesión y permite reintentar', async (t) => {
  const state = browser(t)
  t.mock.method(globalThis, 'fetch', async () => ({ status: 503 }))
  assert.equal((await authenticatedFetch('/api/huertos/1')).status, 503)
  assert.equal(state.entries.size, 3)
  assert.equal(state.redirects.length, 0)
})
