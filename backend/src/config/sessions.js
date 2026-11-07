import session from 'express-session'
import { randomBytes } from 'node:crypto'

export const ONLINE_MS = 15 * 60 * 1000
export const COOKIE_NAME = 'huertos.sid'
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function createSessionStore() {
  return new session.MemoryStore()
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
  const sessions = await new Promise((resolve, reject) => {
    store.all((err, values) => err ? reject(err) : resolve(Object.values(values || {})))
  })
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
