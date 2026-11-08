import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { checkDbConnection, pool, schema } from '../src/config/db.js'

try {
  if (!await checkDbConnection()) throw new Error('Esta migración requiere PostgreSQL.')
  const sql = await readFile(fileURLToPath(new URL('./sql/recordatorios.sql', import.meta.url)), 'utf8')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL search_path TO "${schema}", public`)
    await client.query(sql)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  console.log('Tabla de eventos del huerto preparada.')
} catch (error) {
  console.error('No se pudo preparar el registro de eventos:', error.code || error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
