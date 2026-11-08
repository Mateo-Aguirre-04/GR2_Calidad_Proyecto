import { readFile } from 'node:fs/promises'
import { pool, schema } from '../src/config/db.js'

let db
try {
  if(schema!=='huertos') throw new Error('Requiere DB_SCHEMA=huertos.')
  db=await pool.connect()
  const apply=process.argv.includes('--apply')
  await db.query(apply?'BEGIN':'BEGIN READ ONLY')
  await db.query("SET LOCAL lock_timeout='10s'")
  await db.query("SET LOCAL statement_timeout='60s'")
  const triggers=(await db.query(`SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definicion
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='huertos' AND NOT t.tgisinternal AND c.relname IN ('participantes_tarea','usuario_general','miembro_gremio')`)).rows
  console.log('Triggers actuales:',JSON.stringify(triggers))
  const installed=(await db.query(`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='huertos'
    AND table_name='tareas_huerto' AND column_name='id_zona') AS ok`)).rows[0].ok
  if(installed) {
    const expected=['acreditar_recompensa_tarea','validar_recompensa_tarea','sincronizar_puntos_gremio','bloquear_saldo_membresia','sincronizar_membresia_gremio']
    if(!expected.every(name=>triggers.some(t=>t.tgname===name))) throw new Error('Migración parcial: revisar antes de continuar.')
    console.log('004 ya está aplicada.')
  } else if(apply) {
    if(triggers.length) throw new Error('Hay triggers previos: revisar para no acreditar puntos por dos vías.')
    await db.query(await readFile(new URL('../migrations/20261108_004_secciones_puntos_ranking.sql',import.meta.url),'utf8'))
    console.log('004 aplicada: secciones, recompensas y totales iniciales de gremios.')
  } else console.log('Pendiente: 20261108_004_secciones_puntos_ranking.sql')
  const balance=(await db.query(`SELECT count(*)::int AS diferencias FROM gremio g WHERE COALESCE(g.puntos_gremio,0)
    <> (SELECT COALESCE(sum(COALESCE(u.puntos,0)),0) FROM miembro_gremio m JOIN usuario_general u USING(id_usuario) WHERE m.id_gremio=g.id_gremio)`)).rows[0]
  console.log('Gremios cuyo total difiere de sus miembros:',balance.diferencias)
  if(apply&&balance.diferencias!==0) throw new Error('Los totales no coinciden; la transacción se revierte.')
  await db.query(apply?'COMMIT':'ROLLBACK')
} catch(error) {
  if(db) await db.query('ROLLBACK').catch(()=>{})
  console.error('No se aplicaron cambios:',error.code||error.message)
  process.exitCode=1
} finally {db?.release();await pool.end()}
