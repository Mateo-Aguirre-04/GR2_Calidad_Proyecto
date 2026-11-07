import { checkDbConnection, query, pool, schema } from '../src/config/db.js'

try {
  if (!await checkDbConnection()) throw new Error('Requiere PostgreSQL.')
  await query(`ALTER TABLE "${schema}".usuario_general ADD COLUMN IF NOT EXISTS last_seen timestamptz`)
  console.log('Columna last_seen preparada en usuario_general. No se crearon tablas.')
} catch (error) {
  console.error('No se pudo preparar last_seen:', error.code || 'CONFIGURATION_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
