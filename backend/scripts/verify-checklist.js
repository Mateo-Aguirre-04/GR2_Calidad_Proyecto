// Verificación compartida exclusivamente READ ONLY: no crea tareas ni datos de prueba.
import { pool } from '../src/config/db.js'
import { readChecklist } from '../src/data/checklist.js'
import { loadEnvironment } from '../src/data/checklistEnvironment.js'
import { panel } from '../src/data/checklistWorkflow.js'

let db
try {
  db=await pool.connect()
  await db.query('BEGIN READ ONLY')
  const tables=(await db.query(`SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='huertos' AND c.relname IN ('solicitudes_checklist','checklist_configuracion','zonas_huerto','ciclos_zona','cultivos_checklist','lotes_cosecha')`)).rows
  if(tables.length!==6||tables.some(table=>!table.relrowsecurity))throw new Error('Faltan tablas o RLS en la programación del checklist.')
  console.log('Esquema: 6 tablas nuevas verificadas, todas con RLS activo.')
  const pair=(await db.query(`SELECT m.id_usuario::text AS usuario,h.id_huerto::text AS huerto
    FROM miembro_gremio m JOIN huerto h USING(id_gremio) ORDER BY h.id_huerto,m.id_usuario LIMIT 1`)).rows[0]
  if(pair) {
    const tasks=await readChecklist(db,pair.usuario,pair.huerto)
    console.log('Lectura SQL de un miembro existente: correcta. Tareas:',tasks.length)
    const foreign=(await db.query(`SELECT h.id_huerto::text AS huerto FROM huerto h
      WHERE NOT EXISTS(SELECT 1 FROM miembro_gremio m WHERE m.id_gremio=h.id_gremio AND m.id_usuario=$1) LIMIT 1`,[pair.usuario])).rows[0]
    const outsider=foreign?{usuario:pair.usuario,huerto:foreign.huerto}:(await db.query(`SELECT ug.id_usuario::text AS usuario,$1::text AS huerto
      FROM usuario_general ug WHERE NOT EXISTS(SELECT 1 FROM miembro_gremio m JOIN huerto h USING(id_gremio)
        WHERE h.id_huerto=$1 AND m.id_usuario=ug.id_usuario) LIMIT 1`,[pair.huerto])).rows[0]
    if(outsider) {
      try {await readChecklist(db,outsider.usuario,outsider.huerto);throw new Error('No se rechazó una lectura ajena.')}
      catch(error){if(error.status!==403)throw error;console.log('Lectura ajena: rechazada con 403.')}
    } else console.log('No hay una combinación ajena en los datos compartidos; caso cubierto en PostgreSQL local.')
    const env=await loadEnvironment(db,pair.usuario,pair.huerto)
    const result=await panel(db,pair.usuario,pair.huerto,env)
    console.log('Panel SQL real: correcto. Zona horaria:',env.zonaHoraria || 'pendiente de obtener el clima',
      'Clima consultado:',!!env.clima,'Cultivos:',result.cultivos.length)
  } else console.log('No hay un miembro con huerto en la base compartida; permisos verificados en PostgreSQL local.')
  console.log('Validación completada sin sincronizar tareas, registrar acciones ni cambiar puntajes.')
  await db.query('ROLLBACK')
} catch(error) {
  if(db)await db.query('ROLLBACK').catch(()=>{})
  console.error('Falló la verificación:',error.code || error.message)
  process.exitCode=1
} finally {db?.release();await pool.end()}
