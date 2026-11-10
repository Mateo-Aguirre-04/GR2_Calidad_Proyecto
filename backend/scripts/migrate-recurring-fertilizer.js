import { readFile } from 'node:fs/promises'
import { pool, schema } from '../src/config/db.js'

let db
try {
  if(schema!=='huertos')throw new Error('Requiere DB_SCHEMA=huertos.')
  db=await pool.connect()
  const apply=process.argv.includes('--apply')
  await db.query(apply?'BEGIN':'BEGIN READ ONLY')
  await db.query("SET LOCAL lock_timeout='10s'")
  await db.query("SET LOCAL statement_timeout='60s'")
  const definition=(await db.query(`SELECT indexdef FROM pg_indexes WHERE schemaname='huertos'
    AND indexname='tareas_huerto_recompensa_cultivo_unica'`)).rows[0]?.indexdef
  if(!definition||!['siembra','cosecha','senaletica'].every(code=>definition.includes(`'${code}'`)))
    throw new Error('Índice de recompensas inesperado. Revisar antes de migrar.')
  if(!definition.includes("'abono_organico'"))console.log('005 ya está aplicada: abono recurrente habilitado.')
  else if(apply) {
    await db.query(await readFile(new URL('../database/migrations/20261108_005_abono_recurrente.sql',import.meta.url),'utf8'))
    console.log('005 aplicada. Historial y puntos conservados.')
  } else console.log('Pendiente: 005 permite aplicaciones de abono independientes.')
  await db.query(apply?'COMMIT':'ROLLBACK')
} catch(error) {
  if(db)await db.query('ROLLBACK').catch(()=>{})
  console.error('No se aplicaron cambios:',error.code||error.message)
  process.exitCode=1
} finally {db?.release();await pool.end()}
