// Retira exclusivamente la tabla creada para el historial descartado.
import { checkDbConnection, transaction, pool, schema } from '../src/config/db.js'

try {
  if (!await checkDbConnection()) throw new Error('Requiere PostgreSQL.')
  await transaction(async (db) => {
    const exists = await db.query('SELECT to_regclass($1) AS name', [`${schema}.actividad_gremio`])
    if (!exists.rows[0].name) { console.log('La tabla de historial ya no existe.'); return }
    await db.query(`LOCK TABLE "${schema}".actividad_gremio IN ACCESS EXCLUSIVE MODE`)
    const { rows } = await db.query(`SELECT count(*) AS total FROM "${schema}".actividad_gremio`)
    console.log(`Registros del historial retirado: ${rows[0].total}`)
    // Sin CASCADE: cualquier dependencia externa impide el borrado.
    await db.query(`DROP TABLE "${schema}".actividad_gremio RESTRICT`)
  })
  console.log('Historial retirado. Tabla de sesiones conservada.')
} catch (error) {
  console.error('No se pudo retirar el historial:', error.code || 'CONFIGURATION_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
