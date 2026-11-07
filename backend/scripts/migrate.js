import { checkDbConnection, pool } from '../src/config/db.js'
import { createSessionStore } from '../src/config/sessions.js'

try {
  if (!await checkDbConnection()) throw new Error('La migración requiere PostgreSQL.')
  const store = await createSessionStore()
  store.close?.()
  console.log('Almacenamiento de sesiones preparado. No se crean tablas de historial.')
} catch (error) {
  console.error('No se pudo aplicar la migración:', error.code || 'CONFIGURATION_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
