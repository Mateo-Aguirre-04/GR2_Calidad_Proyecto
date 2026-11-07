import pkg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const { Pool } = pkg
export const schema = process.env.DB_SCHEMA || 'huertos'
if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('DB_SCHEMA inválido.')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
  options: `-c search_path=${schema},public`,
})

let connected = false

export async function checkDbConnection() {
  if (process.env.DATA_MODE === 'mock') {
    connected = false
    console.info('[DB] DATA_MODE=mock: demostración explícita.')
    return false
  }
  if (!process.env.DATABASE_URL) {
    connected = false
    throw new Error('Falta DATABASE_URL en backend/.env. Para una demo explícita usa DATA_MODE=mock.')
  }
  try {
    const client = await pool.connect()
    connected = true
    client.release()
    console.log('[DB] Conexión exitosa a PostgreSQL:', process.env.DB_NAME || 'huertos_db')
    return true
  } catch (err) {
    connected = false
    throw new Error(`No se pudo conectar a PostgreSQL (${err.code || 'CONNECTION_FAILED'}). No se usarán datos mock.`)
  }
}

export async function transaction(operation) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await operation(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
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
