import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'huertos_db',
  connectionTimeoutMillis: 2000,
})

let connected = false

export async function checkDbConnection() {
  try {
    const client = await pool.connect()
    connected = true
    client.release()
    console.log('[DB] Conexión exitosa a PostgreSQL:', process.env.DB_NAME || 'huertos_db')
    return true
  } catch (err) {
    connected = false
    console.warn('[DB] PostgreSQL no está activo o no responde:', err.message)
    console.info('[DB] Activando modo fallback con datos locales (seed_datos_iniciales).')
    return false
  }
}

export function isDbConnected() {
  return connected
}

export async function query(text, params) {
  if (!connected) {
    throw new Error('Database not connected')
  }
  return pool.query(text, params)
}
