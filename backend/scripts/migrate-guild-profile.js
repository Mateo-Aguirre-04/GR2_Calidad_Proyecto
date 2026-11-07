import { checkDbConnection, query, pool, schema } from '../src/config/db.js'

try {
  if (!await checkDbConnection()) throw new Error('Requiere PostgreSQL.')
  await query(`ALTER TABLE "${schema}".gremio
    ADD COLUMN IF NOT EXISTS descripcion text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS anuncios text NOT NULL DEFAULT ''`)
  console.log('Columnas descripcion y anuncios preparadas en gremio. No se modificaron los demás campos.')
} catch (error) {
  console.error('No se pudieron preparar las columnas:', error.code || 'CONFIGURATION_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
