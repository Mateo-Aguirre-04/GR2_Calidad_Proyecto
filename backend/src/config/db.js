import pkg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config()

const { Pool } = pkg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
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
