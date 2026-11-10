import session from 'express-session'
import { randomBytes } from 'node:crypto'

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

export async function startSession(req, usuarioId, source) {
  await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()))
  req.session.usuarioId = Number(usuarioId)
  req.session.source = source
  req.session.lastSeen = new Date().toISOString()
  await new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()))
}
