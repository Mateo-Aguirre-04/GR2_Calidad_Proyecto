import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { checkDbConnection } from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import gremiosRoutes from './routes/gremios.routes.js'
import huertosRoutes from './routes/huertos.routes.js'
import plantasRoutes from './routes/plantas.routes.js'
import perfilRoutes from './routes/perfil.routes.js'
import recordatoriosRoutes from './routes/recordatorios.routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares globales
app.use(cors())
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

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`====================================================`)
  console.log(` 🌱 Huertos.ec API Backend ejecutándose en puerto ${PORT}`)
  console.log(` ➜ http://localhost:${PORT}/api/health`)
  console.log(`====================================================`)
  await checkDbConnection()
})
