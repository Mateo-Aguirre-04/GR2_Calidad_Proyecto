import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import { checkDbConnection } from './config/db.js'
import { createSessionStore, sessionMiddleware } from './config/sessions.js'
import authRoutes from './routes/auth.routes.js'
import gremiosRoutes from './routes/gremios.routes.js'
import huertosRoutes from './routes/huertos.routes.js'
import plantasRoutes from './routes/plantas.routes.js'
import perfilRoutes from './routes/perfil.routes.js'
import recordatoriosRoutes from './routes/recordatorios.routes.js'

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Mismo almacén para el middleware y para consultar la presencia
const sessionStore = await createSessionStore()
app.locals.sessionStore = sessionStore

// En Render la app está detrás de un proxy HTTPS; sin esto no se envían cookies "secure"
app.set('trust proxy', 1)

// Middlewares globales (las sesiones deben ir antes de las rutas)
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))
app.use(sessionMiddleware(sessionStore))

// Estado de la API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Huertos.ec Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Rutas de la API
app.use('/api/auth', authRoutes)
app.use('/api/gremios', gremiosRoutes)
app.use('/api/huertos', huertosRoutes)
app.use('/api/plantas', plantasRoutes)
app.use('/api/perfil', perfilRoutes)
app.use('/api/recordatorios', recordatoriosRoutes)

// Manejo de rutas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.url} no encontrada.` })
})

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('[Error No Controlado]:', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' })
})

// Express 4 no captura errores de funciones async: evita que uno tumbe el proceso
process.on('unhandledRejection', (reason) => {
  console.error('[Promesa no controlada]:', reason)
})

// Iniciar el servidor solo si la base de datos (o el modo mock) está lista
try {
  await checkDbConnection()
} catch (error) {
  console.error('[DB]', error.message)
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`====================================================`)
  console.log(` 🌱 Huertos.ec API Backend ejecutándose en puerto ${PORT}`)
  console.log(` ➜ http://localhost:${PORT}/api/health`)
  console.log(`====================================================`)
})