// Inspección de metadatos: nunca modifica la base compartida ni muestra usuarios.
import { pool } from '../src/config/db.js'

try {
  const db = await pool.connect()
  try {
    await db.query('BEGIN READ ONLY')
    const queries = {
      columnas: `SELECT table_name,column_name,data_type,is_nullable,column_default,is_identity,identity_generation
        FROM information_schema.columns WHERE table_schema='huertos'
        AND table_name IN ('actividades','tareas_huerto','participantes_tarea','solicitudes_checklist')
        ORDER BY table_name,ordinal_position`,
      restricciones: `SELECT conrelid::regclass::text AS tabla,conname,pg_get_constraintdef(oid) AS definicion
        FROM pg_constraint WHERE connamespace='huertos'::regnamespace
        AND conrelid IN ('huertos.actividades'::regclass,'huertos.tareas_huerto'::regclass,'huertos.participantes_tarea'::regclass)`,
      seguridad: `SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class
        WHERE oid IN ('huertos.actividades'::regclass,'huertos.tareas_huerto'::regclass,'huertos.participantes_tarea'::regclass)`,
      actividades: 'SELECT * FROM huertos.actividades ORDER BY codigo',
      migracion_riego: "SELECT to_regclass('huertos.solicitudes_checklist') AS solicitudes_checklist",
      programacion: `SELECT c.relname AS tabla,c.relrowsecurity AS rls FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='huertos'
        AND c.relname IN ('solicitudes_checklist','checklist_configuracion','zonas_huerto','ciclos_zona','cultivos_checklist','lotes_cosecha')
        ORDER BY c.relname`,
      columnas_operativas: `SELECT table_name,column_name,data_type,is_nullable
        FROM information_schema.columns WHERE table_schema='huertos' AND
          ((table_name='usuario_general' AND column_name IN ('id_usuario','puntos')) OR
           (table_name='huerto_planta' AND column_name IN ('id_huerto','id_planta','fecha_siembra','id_estado')))
        ORDER BY table_name,column_name`,
      esquema_programacion: `SELECT table_name,column_name,data_type,column_default,is_nullable
        FROM information_schema.columns WHERE table_schema='huertos'
        AND table_name IN ('planta','huerto_planta','gremio','huerto') ORDER BY table_name,ordinal_position`,
      ciclos_catalogo: `SELECT ciclo_cultivo,count(*)::int AS cantidad FROM huertos.planta GROUP BY ciclo_cultivo ORDER BY ciclo_cultivo`,
      cantidades: `SELECT (SELECT count(*) FROM huertos.tareas_huerto) AS tareas,
        (SELECT count(*) FROM huertos.participantes_tarea) AS participantes`,
    }
    for (const [name, sql] of Object.entries(queries)) {
      console.log(name, JSON.stringify((await db.query(sql)).rows))
    }
    await db.query('ROLLBACK')
  } finally { db.release() }
} catch (error) {
  console.error('No se pudo inspeccionar el checklist:', error.code || 'DB_ERROR')
  process.exitCode = 1
} finally { await pool.end() }
