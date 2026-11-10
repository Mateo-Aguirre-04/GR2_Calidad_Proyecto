// Solo lectura: revisa el catálogo y cantidades de cultivos, sin datos de usuarios.
import { pool } from '../src/config/db.js'

try {
  const db=await pool.connect()
  try {
    await db.query('BEGIN READ ONLY')
    const {rows}=await db.query(`SELECT p.id_planta::text AS id,p.nombre_comun AS nombre,
      p.nombre_cientifico AS cientifico,p.ciclo_cultivo AS ciclo,tp.nombre AS tipo,
      p.imagen,p.imagen_muerta,p.fases,
      (SELECT count(*)::int FROM huerto_planta hp WHERE hp.id_planta=p.id_planta AND hp.id_estado<>$1) AS activos
      FROM planta p LEFT JOIN tipo_planta tp USING(id_tipo_planta) ORDER BY p.id_planta`,[Number(process.env.HARVEST_STATE_ID||6)])
    if(!process.argv.includes('--references'))console.log(JSON.stringify(rows.map(p=>({...p,
      fases:undefined,imagen:undefined,imagen_muerta:undefined,
      fasesConImagen:(p.fases||[]).filter(f=>!f.muerta&&f.imagen).length,
      carpeta:p.imagen?.split('/').at(-2)||null,
    })),null,2))
    const testIds=rows.filter(p=>!p.imagen&&!(p.fases||[]).length).map(p=>p.id)
    const dependencies=(await db.query(`SELECT ns.nspname AS esquema,t.relname AS tabla,a.attname AS columna,c.confdeltype AS borrado
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=t.relnamespace
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(c.conkey)
      WHERE c.contype='f' AND c.confrelid='planta'::regclass AND a.attname='id_planta'`)).rows
    const ident=value=>'"'+value.replaceAll('"','""')+'"'
    for(const dependency of dependencies) {
      const count=(await db.query(`SELECT count(*)::int AS cantidad FROM ${ident(dependency.esquema)}.${ident(dependency.tabla)}
        WHERE ${ident(dependency.columna)}=ANY($1::bigint[])`,[testIds])).rows[0].cantidad
      console.log(JSON.stringify({...dependency,cantidad:count}))
    }
    console.log('cultivos_prueba',JSON.stringify((await db.query(`SELECT p.nombre_comun AS nombre,hp.id_estado,count(*)::int AS cantidad
      FROM huerto_planta hp JOIN planta p USING(id_planta) WHERE hp.id_planta=ANY($1::bigint[])
      GROUP BY p.nombre_comun,hp.id_estado`,[testIds])).rows))
    console.log('tareas_prueba',JSON.stringify((await db.query(`SELECT codigo_actividad,completada_en IS NOT NULL AS completada,count(*)::int AS cantidad
      FROM tareas_huerto WHERE id_planta=ANY($1::bigint[]) GROUP BY codigo_actividad,completada_en IS NOT NULL`,[testIds])).rows))
    await db.query('ROLLBACK')
  } finally {db.release()}
} catch(error) {
  console.error('No se pudo consultar el catálogo:',error.code||'DB_ERROR')
  process.exitCode=1
} finally {await pool.end()}
