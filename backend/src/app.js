import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { sessionMiddleware } from './config/sessions.js'
import authRoutes from './routes/auth.routes.js'
import gremiosRoutes from './routes/gremios.routes.js'
import huertosRoutes from './routes/huertos.routes.js'
import plantasRoutes from './routes/plantas.routes.js'
import perfilRoutes from './routes/perfil.routes.js'
import recordatoriosRoutes from './routes/recordatorios.routes.js'

dotenv.config()

export function createApp(store) {
  const app = express()


  // Middlewares globales
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }))
  app.use(sessionMiddleware(store))
  app.use((req, res, next) => {
    if (req.session.usuarioId) req.session.lastSeen = new Date().toISOString()
    next()
  })
  app.use(express.json())
  app.use(morgan('dev'))

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
    res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' })
  })

  return app
}
