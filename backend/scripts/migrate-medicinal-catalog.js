// Sin --apply simula la migración y revierte todos los cambios.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool, schema } from '../src/config/db.js'
import { catalogDays } from '../src/data/checklistEnvironment.js'
import { growthDays } from '../src/data/postgres.js'
import { plantaDisponibleEnCatalogo } from '../src/data/catalogoMedicinal.js'

const apply=process.argv.includes('--apply')
let db
try {
  if(schema!=='huertos')throw new Error('Requiere DB_SCHEMA=huertos.')
  db=await pool.connect()
  await db.query('BEGIN')
  await db.query("SET LOCAL lock_timeout='5s'")
  await db.query("SET LOCAL statement_timeout='30s'")
  await db.query("SELECT pg_advisory_xact_lock(hashtext('huertos.catalogo_medicinal'))")
  const before=(await db.query('SELECT * FROM planta ORDER BY id_planta')).rows
  const dates=(await db.query(`SELECT id_tarea::text,id_planta::text,fecha_siembra::text,programada_para::text
    FROM tareas_huerto WHERE codigo_actividad='cosecha' AND completada_en IS NULL`)).rows
  if(apply) {
    const directory=new URL('../../tmp/catalogo-medicinal/',import.meta.url)
    await mkdir(directory,{recursive:true})
    const backup=new URL(`antes-${new Date().toISOString().replaceAll(':','-')}.json`,directory)
    await writeFile(backup,JSON.stringify({plantas:before,cosechasPendientes:dates},null,2),'utf8')
    console.log('Respaldo local:',fileURLToPath(backup))
  }
  await db.query(await readFile(new URL('../database/migrations/20261109_006_catalogo_medicinal.sql',import.meta.url),'utf8'))
  const after=(await db.query('SELECT * FROM planta ORDER BY id_planta')).rows
  const available=after.filter(plantaDisponibleEnCatalogo)
  if(available.some(p=>!catalogDays(p.ciclo_cultivo)||catalogDays(p.ciclo_cultivo)!==growthDays(p.ciclo_cultivo)))
    throw new Error('Hay plantas disponibles sin un ciclo coherente en días.')
  const changes=after.filter(p=>{
    const old=before.find(b=>String(b.id_planta)===String(p.id_planta))
    return (old.catalogo_activo??true)!==p.catalogo_activo||old.ciclo_cultivo!==p.ciclo_cultivo||old.id_tipo_planta!==p.id_tipo_planta
  }).map(p=>({nombre:p.nombre_comun,ciclo:p.ciclo_cultivo,disponible:plantaDisponibleEnCatalogo(p)}))
  const scheduled=(await db.query(`SELECT id_tarea::text,programada_para::text FROM tareas_huerto
    WHERE codigo_actividad='cosecha' AND completada_en IS NULL`)).rows
  console.log(JSON.stringify({cambios:changes,plantasDisponibles:available.length,
    cosechasActualizadas:scheduled.filter(t=>dates.find(d=>d.id_tarea===t.id_tarea)?.programada_para!==t.programada_para).length},null,2))
  await db.query(apply?'COMMIT':'ROLLBACK')
  console.log(apply?'Catálogo medicinal actualizado.':'Simulación terminada; cambios revertidos.')
} catch(error) {
  if(db)await db.query('ROLLBACK').catch(()=>{})
  console.error('No se modificó el catálogo:',error.code||error.message)
  process.exitCode=1
} finally {db?.release();await pool.end()}
