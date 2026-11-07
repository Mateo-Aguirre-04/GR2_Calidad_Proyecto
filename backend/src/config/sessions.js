import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { randomBytes } from 'node:crypto'
import { pool, isDbConnected, query, schema } from './db.js'

export const ONLINE_MS = 15 * 60 * 1000
export const COOKIE_NAME = 'huertos.sid'
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function createSessionStore() {
  if (!isDbConnected()) return new session.MemoryStore()
  // La tabla se crea antes de aceptar peticiones, incluso antes del primer login.
  await query(`CREATE TABLE IF NOT EXISTS huertos_sessions (
    sid varchar PRIMARY KEY,
    sess json NOT NULL,
    expire timestamp(6) NOT NULL
  )`)
  await query('CREATE INDEX IF NOT EXISTS huertos_sessions_expire_idx ON huertos_sessions (expire)')
  const PgStore = connectPgSimple(session)
  return new PgStore({ pool, schemaName: schema, tableName: 'huertos_sessions' })
}

export function sessionMiddleware(store) {
  const secret = process.env.SESSION_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET es obligatorio en producción.')
  }
  return session({
    name: COOKIE_NAME,
    secret: secret || randomBytes(32).toString('hex'),
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 },
  })
}

export function isOnline(lastSeen, now = Date.now()) {
  const age = now - new Date(lastSeen).getTime()
  return Number.isFinite(age) && age >= 0 && age < ONLINE_MS
}

export async function getPresence(store, source) {
  let sessions
  if (source === 'postgres') {
    const { rows } = await query('SELECT sess FROM huertos_sessions WHERE expire > CURRENT_TIMESTAMP')
    sessions = rows.map((row) => row.sess)
  } else {
    sessions = await new Promise((resolve, reject) => {
      store.all((err, values) => err ? reject(err) : resolve(Object.values(values || {})))
    })
  }
  const presence = new Map()
  for (const item of sessions) {
    if (item.source !== source || !item.usuarioId || !item.lastSeen) continue
    const previous = presence.get(Number(item.usuarioId))
    if (!previous || new Date(item.lastSeen) > new Date(previous)) {
      presence.set(Number(item.usuarioId), item.lastSeen)
    }
  }
  return presence
}

export async function startSession(req, usuarioId, source) {
  await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()))
  req.session.usuarioId = Number(usuarioId)
  req.session.source = source
  req.session.lastSeen = new Date().toISOString()
  await new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()))
}
