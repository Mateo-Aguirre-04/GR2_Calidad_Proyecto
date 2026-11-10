// Sin argumentos solo revisa. --apply ejecuta exclusivamente 002 y 003, en una transacción.
import { readFile } from 'node:fs/promises'
import { pool, schema } from '../src/config/db.js'

const apply=process.argv.includes('--apply')
const names=['solicitudes_checklist','checklist_configuracion','zonas_huerto','ciclos_zona','cultivos_checklist','lotes_cosecha']
const files=['20261108_002_solicitudes_checklist.sql','20261108_003_programacion_checklist.sql']
let db
try {
  if(schema!=='huertos') throw new Error('Este conjunto SQL requiere DB_SCHEMA=huertos.')
  db=await pool.connect()
  await db.query(apply?'BEGIN':'BEGIN READ ONLY')
  if(apply) {
    await db.query("SET LOCAL lock_timeout='5s'")
    await db.query("SET LOCAL statement_timeout='30s'")
    await db.query("SELECT pg_advisory_xact_lock(hashtext('huertos.checklist.migrations'))")
  }
  const present=(await db.query(`SELECT name,to_regclass('huertos.'||name) IS NOT NULL AS existe
    FROM unnest($1::text[]) AS name`,[names])).rows
  if(present.some(row=>row.existe)&&!present.every(row=>row.existe)) {
    throw new Error('Hay una aplicación parcial. Revisa el esquema antes de continuar; no se modificó nada.')
  }
  if(present.every(row=>row.existe)) {
    const columns=(await db.query(`SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='huertos' AND ((table_name='solicitudes_checklist' AND column_name IN ('accion','contenido'))
        OR (table_name='tareas_huerto' AND column_name IN ('id_ciclo','id_lote','confirmaciones','clave_generacion','responsable_id'))
        OR (table_name='cultivos_checklist' AND column_name IN ('conservado_tras_cosecha','finalizado_en')))`)).rows
    if(columns.length!==9) throw new Error('Las tablas existen pero su estructura no coincide con estas migraciones.')
    console.log('002 y 003 ya están presentes; no se reejecutaron.')
  } else {
    const baseline=(await db.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='huertos'
      AND ((table_name='huerto_planta' AND column_name='fecha_siembra')
        OR (table_name='actividades' AND column_name='puntos')
        OR (table_name='participantes_tarea' AND column_name='puntos_otorgados'))`)).rows
    if(baseline.length!==3||!baseline.some(c=>c.table_name==='huerto_planta'&&c.data_type==='timestamp with time zone')) {
      throw new Error('No se verificó la baseline aplicada; no se ejecutará el SQL.')
    }
    console.log('Pendientes:',files.join(', '))
    if(apply) {
      for(const file of files) await db.query(await readFile(new URL(`../database/migrations/${file}`,import.meta.url),'utf8'))
      console.log('Preparadas 6 tablas nuevas y las columnas e índices del checklist. No se modificaron puntos ni cultivos.')
    }
  }
  if(apply) await db.query('COMMIT')
  else await db.query('ROLLBACK')
  console.log(apply?'Migraciones confirmadas.':'Revisión de solo lectura terminada.')
} catch(error) {
  if(db) await db.query('ROLLBACK').catch(()=>{})
  console.error('No se aplicaron las migraciones:',error.code || error.message)
  process.exitCode=1
} finally {
  db?.release()
  await pool.end()
}
