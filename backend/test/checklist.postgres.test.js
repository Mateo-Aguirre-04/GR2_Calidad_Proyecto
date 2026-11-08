import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import express from 'express'
import { createRecordatoriosRouter } from '../src/routes/recordatorios.routes.js'
import { rewardTaskParticipants } from '../src/data/taskRewards.js'
import { completeTask } from '../src/data/taskCompletion.js'
import { enrollTask } from '../src/data/taskParticipation.js'
import { recordWatering } from '../src/data/watering.js'
import { requireMember } from '../src/data/postgres.js'
import { localDate } from '../src/data/checklistEnvironment.js'
import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine'
import { readGuildRanking, guildRankingHandler } from '../src/data/guildRanking.js'

async function installCurrentSchema(db) {
  await db.query(`CREATE TABLE gremio(id_gremio bigint PRIMARY KEY,puntos_gremio integer DEFAULT 0,area_total numeric DEFAULT 1800,
      nombre_gremio text DEFAULT 'Prueba',latitud numeric DEFAULT -0.2,longitud numeric DEFAULT -78.5,created_at timestamptz DEFAULT now());
    INSERT INTO gremio(id_gremio) VALUES(10),(11);
    CREATE TABLE subdiseño_huerto(id_diseño integer,id_subdiseño integer,imagen text,num_parcelas integer);
    INSERT INTO subdiseño_huerto VALUES(1,1,'surcos.png',6);
    ALTER TABLE huerto ADD COLUMN id_diseño integer DEFAULT 1, ADD COLUMN id_subdiseño integer DEFAULT 1;
    ALTER TABLE huerto_planta ADD COLUMN zona integer, ADD COLUMN parcela integer;`)
  await db.query(`CREATE TABLE IF NOT EXISTS planta(id_planta bigint PRIMARY KEY,nombre_comun text,ciclo_cultivo text,fases jsonb DEFAULT '[]',imagen_muerta text)`)
  await db.query(await readFile(new URL('../migrations/20261108_004_secciones_puntos_ranking.sql',import.meta.url),'utf8'))
}

const url = process.env.CHECKLIST_TEST_DATABASE_URL
test('PostgreSQL aislado: baseline, consulta HTTP, permisos e inscripción por miembro', { skip: !url }, async () => {
  const target = new URL(url)
  assert.ok(['localhost', '127.0.0.1'].includes(target.hostname))
  assert.equal(target.pathname, '/gr2_checklist_test')
  const db = new pg.Client({ connectionString: url })
  await db.connect()
  let server
  try {
    await db.query('BEGIN')
    await db.query(`CREATE SCHEMA huertos;
      SET LOCAL search_path=huertos,public;
      CREATE TABLE usuario_general (id_usuario bigint PRIMARY KEY, puntos integer NOT NULL DEFAULT 0);
      CREATE TABLE huerto (id_huerto bigint PRIMARY KEY, id_gremio bigint NOT NULL);
      CREATE TABLE miembro_gremio (id_usuario bigint, id_gremio bigint, PRIMARY KEY(id_usuario,id_gremio));
      CREATE TABLE planta(id_planta bigint PRIMARY KEY,nombre_comun text,ciclo_cultivo text,fases jsonb DEFAULT '[]',imagen_muerta text);
      CREATE TABLE huerto_planta (id_huerto bigint, id_planta bigint, fecha_siembra timestamptz,
        id_estado integer DEFAULT 1,cantidad integer DEFAULT 1,observaciones text DEFAULT '{}',modified_at timestamptz DEFAULT now(),
        PRIMARY KEY(id_huerto,id_planta,fecha_siembra));`)
    await db.query(await readFile(new URL('../migrations/20261108_001_checklist_baseline.sql', import.meta.url), 'utf8'))
    await db.query(await readFile(new URL('../migrations/20261108_002_solicitudes_checklist.sql', import.meta.url), 'utf8'))
    await db.query(await readFile(new URL('../migrations/20261108_003_programacion_checklist.sql', import.meta.url), 'utf8'))
    await installCurrentSchema(db)
    await db.query(`INSERT INTO usuario_general VALUES (5),(6),(7);
      INSERT INTO huerto VALUES (42,10),(43,11),(44,10);
      INSERT INTO miembro_gremio VALUES (5,10),(6,10),(7,11);
      INSERT INTO planta(id_planta,nombre_comun,ciclo_cultivo) VALUES(9,'Prueba','2 días'),(10,'Prueba 2','2 días');
      INSERT INTO huerto_planta VALUES (42,9,'2026-11-08 10:00:00.123456+00');
      INSERT INTO tareas_huerto (codigo_actividad,id_huerto,modalidad,programada_para) VALUES
        ('limpieza_huerto',42,'grupal','2026-11-09 10:00+00'),
        ('limpieza_huerto',43,'grupal','2026-11-09 10:00+00');
      INSERT INTO tareas_huerto (codigo_actividad,id_huerto,modalidad,id_planta,fecha_siembra,completada_en,completada_por)
        VALUES ('riego',42,'individual',9,'2026-11-08 10:00:00.123456+00',now(),5);
      INSERT INTO participantes_tarea(id_tarea,id_usuario) VALUES (1,5);`)
    let now=new Date('2026-11-08T15:00Z')
    const app = express()
    app.use(express.json())
    // Sesiones ficticias solo en esta prueba, sin login ni escrituras de presencia.
    app.use((req, res, next) => {
      if (req.headers['x-test-user']) req.session = { usuarioId: req.headers['x-test-user'], source: 'postgres' }
      next()
    })
    app.get('/api/gremios',guildRankingHandler(db))
    app.use('/api/recordatorios', createRecordatoriosRouter(db, async operation => {
      await db.query('SAVEPOINT http_operation')
      try {
        const result = await operation(db)
        await db.query('RELEASE SAVEPOINT http_operation')
        return result
      } catch (error) {
        await db.query('ROLLBACK TO SAVEPOINT http_operation')
        await db.query('RELEASE SAVEPOINT http_operation')
        throw error
      }
    },async(client,user,garden)=>{
      await requireMember(client,user,garden)
      return {ahora:now,zonaHoraria:'America/Guayaquil',clima:null,amanecer:null}
    }))
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const get = (garden, user) => fetch(`http://127.0.0.1:${server.address().port}/api/recordatorios/huerto/${garden}?usuarioId=5`,
      { headers: user ? { 'x-test-user': user } : {} })
    const authorized = await get('42', '5')
    assert.equal(authorized.status, 200)
    assert.equal(authorized.headers.get('cache-control'), 'no-store')
    const tasks = await authorized.json()
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0].yaInscrito, true)
    assert.equal(tasks[0].cultivo, null)
    assert.equal(tasks[1].completado, true)
    assert.equal(tasks[1].yaInscrito, false)
    assert.equal(tasks[1].cultivo.fechaSiembra, '2026-11-08 10:00:00.123456+00')
    const otherMember = await get('42', '6')
    assert.equal(otherMember.status, 200)
    assert.equal((await otherMember.json())[0].yaInscrito, false)
    assert.equal((await get('43', '5')).status, 403)
    assert.equal((await get('42', '7')).status, 403)
    assert.equal((await get('42')).status, 401)
    assert.equal((await get('abc', '5')).status, 400)
    assert.deepEqual(await (await get('44', '5')).json(), [])
    assert.equal((await db.query('SELECT count(*)::int AS n FROM participantes_tarea')).rows[0].n, 1)
    assert.equal((await db.query('SELECT puntos_otorgados FROM participantes_tarea')).rows[0].puntos_otorgados, null)
    const enroll = (id, user, garden = '42') => fetch(
      `http://127.0.0.1:${server.address().port}/api/recordatorios/huerto/${garden}/tareas/${id}/inscribirse`,
      { method: 'POST', headers: user ? { 'x-test-user': user } : {} })
    const inscription = await enroll('1', '6')
    assert.equal(inscription.status, 200)
    assert.deepEqual(await inscription.json(), { id: '1', yaInscrito: true, nuevaInscripcion: true })
    assert.equal((await (await enroll('1', '6')).json()).nuevaInscripcion, false)
    assert.equal((await (await get('42', '6')).json())[0].yaInscrito, true)
    assert.equal((await enroll('1', '7')).status, 403)
    assert.equal((await enroll('2', '5')).status, 404)
    assert.equal((await enroll('3', '5')).status, 409)
    assert.equal((await enroll('1')).status, 401)
    assert.equal((await enroll('abc', '5')).status, 400)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM participantes_tarea')).rows[0].n, 2)
    const noExtraConditions = async () => {}
    const firstCompleted = await completeTask(db, '5', '42', '1', noExtraConditions)
    const awarded = firstCompleted.recompensas
    assert.equal(awarded.length, 2)
    assert.deepEqual(await rewardTaskParticipants(db, '1', 999), [])
    const balances = await db.query('SELECT id_usuario::text AS id,puntos FROM usuario_general ORDER BY id_usuario')
    assert.deepEqual(balances.rows, [{ id: '5', puntos: 30 }, { id: '6', puntos: 30 }, { id: '7', puntos: 0 }])
    assert.deepEqual((await db.query('SELECT puntos_otorgados FROM participantes_tarea ORDER BY id_usuario')).rows,
      [{ puntos_otorgados: 30 }, { puntos_otorgados: 30 }])
    const completed = await completeTask(db, '5', '42', '1', noExtraConditions)
    assert.equal(completed.completado, true)
    assert.equal(completed.completadaPor, '5')
    assert.equal(completed.recompensas.length, 2)
    const originalDate = completed.completadaEn
    await db.query("UPDATE actividades SET puntos=999 WHERE codigo='limpieza_huerto'")
    const retried = await completeTask(db, '6', '42', '1', () => { throw new Error('No debe reevaluar un reenvío') })
    assert.deepEqual(retried.recompensas, completed.recompensas)
    assert.deepEqual(retried.completadaEn, originalDate)
    assert.equal(retried.completadaPor, '5')
    await db.query('INSERT INTO usuario_general(id_usuario) VALUES(8); INSERT INTO miembro_gremio VALUES(8,10)')
    assert.equal((await enroll('1', '8')).status, 409)
    await assert.rejects(completeTask(db, '8', '42', '1', noExtraConditions), { status: 403 })
    await db.query('SAVEPOINT reward_failure')
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,modalidad)
      VALUES ('abono_organico',42,'individual')`)
    // Forzar un fallo después de actualizar la tarea: toda la operación debe revertirse.
    await db.query('ALTER TABLE usuario_general ADD CHECK (puntos < 40)')
    await assert.rejects(completeTask(db, '5', '42', '4', noExtraConditions), { code: '23514' })
    await db.query('ROLLBACK TO SAVEPOINT reward_failure')
    assert.deepEqual((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows, [{ puntos: 30 }])
    await db.query("INSERT INTO huerto_planta VALUES(42,10,'2026-11-08 10:00:00.654321+00')")
    await db.query("INSERT INTO zonas_huerto(id_huerto,nombre,zona_mapa,parcela_mapa) VALUES(42,'Seccion 1',1,1)")
    await db.query('UPDATE huerto_planta SET zona=1,parcela=1,cantidad=20 WHERE id_huerto=42')
    const wateringBody = { claveSolicitud:'23f70b94-af20-46c5-9f88-7db0887a6cac',zonaId:'1' }
    const water = (body, user = '5') => fetch(
      `http://127.0.0.1:${server.address().port}/api/recordatorios/huerto/42/riegos`,
      { method: 'POST', headers: { 'x-test-user': user, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const registered = await water(wateringBody)
    assert.equal(registered.status, 200)
    const receipt = await registered.json()
    assert.equal(receipt.puntosOtorgados, 5)
    assert.equal(receipt.tareas.length, 1)
    const rankingUrl=`http://127.0.0.1:${server.address().port}/api/gremios`
    const ranking=async()=>{
      const response=await fetch(rankingUrl,{headers:{'x-test-user':'5'}})
      assert.equal(response.headers.get('cache-control'),'no-store')
      return response.json()
    }
    assert.equal((await ranking())[0].puntos,65)
    assert.deepEqual(await (await water(wateringBody)).json(), receipt)
    assert.equal((await water({ ...wateringBody, zonaId:'2' })).status, 409)
    assert.equal((await water(wateringBody, '7')).status, 403)
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows[0].puntos, 35)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM solicitudes_checklist')).rows[0].n, 1)
    const invalid = await water({ ...wateringBody, claveSolicitud:'f75bc56c-c137-4b8c-8c17-f9cfb987e6ce',zonaId:'999' })
    assert.equal(invalid.status,404)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM solicitudes_checklist')).rows[0].n,1)
    const tasksBefore = (await db.query('SELECT count(*)::int AS n FROM tareas_huerto')).rows[0].n
    await db.query('ALTER TABLE usuario_general ADD CONSTRAINT test_batch_limit CHECK (puntos < 40)')
    const failedBatch = await water({ ...wateringBody, claveSolicitud: 'dfffb9a3-96bc-4ae6-9a36-6f26edc89a60' })
    assert.equal(failedBatch.status, 503)
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows[0].puntos, 35)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tareas_huerto')).rows[0].n, tasksBefore)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM solicitudes_checklist')).rows[0].n, 1)
    await db.query('ALTER TABLE usuario_general DROP CONSTRAINT test_batch_limit')
    const second=await water({...wateringBody,claveSolicitud:'00000000-0000-4000-8000-000000000099'})
    assert.equal(second.status,200)
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows[0].puntos,40)
    assert.equal((await ranking())[0].puntos,70)
    const base=`http://127.0.0.1:${server.address().port}/api/recordatorios/huerto/42`
    const post=async(path,body)=>{
      const res=await fetch(base+path,{method:'POST',headers:{'x-test-user':'5','Content-Type':'application/json'},body:JSON.stringify(body)})
      return {status:res.status,data:await res.json()}
    }
    const scheduled=await post('/programar',{actividad:'riego',zonaId:'1',programadaPara:'2026-11-09T15:00:00Z',claveSolicitud:'00000000-0000-4000-8000-000000000100'})
    assert.equal(scheduled.status,200)
    let panelResponse=await fetch(base+'/panel',{headers:{'x-test-user':'5'}})
    const before=await panelResponse.json()
    assert.ok(before.recordatorios.some(r=>r.tipo==='riego'&&r.zonaId==='1'&&r.nombre==='Seccion 1'))
    assert.equal((await post(`/tareas/${scheduled.data.id}/completar`,{confirmaciones:{}})).status,409)
    now=new Date('2026-11-09T15:00Z')
    const completedWater=await post(`/tareas/${scheduled.data.id}/completar`,{confirmaciones:{}})
    assert.equal(completedWater.status,200)
    assert.deepEqual((await post(`/tareas/${scheduled.data.id}/completar`,{confirmaciones:{}})).data,completedWater.data)
    assert.equal((await ranking())[0].puntos,75)
    panelResponse=await fetch(base+'/panel',{headers:{'x-test-user':'5'}})
    assert.ok(!(await panelResponse.json()).recordatorios.some(r=>r.tipo==='riego'&&r.tareaId===scheduled.data.id))
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    await db.query('ROLLBACK')
    await db.end()
  }
})

test('PostgreSQL: finalizaciones concurrentes e inscripción simultánea no duplican puntos', { skip: !url }, async () => {
  const target = new URL(url)
  assert.ok(['localhost', '127.0.0.1'].includes(target.hostname))
  assert.equal(target.pathname, '/gr2_checklist_test')
  const pool = new pg.Pool({ connectionString: url, options: '-c search_path=huertos,public', max: 4 })
  let created = false
  async function transaction(operation) {
    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      await db.query("SET LOCAL lock_timeout='5s'")
      const result = await operation(db)
      await db.query('COMMIT')
      return result
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally { db.release() }
  }
  const allow = async () => {}
  try {
    await transaction(async db => {
      await db.query(`CREATE SCHEMA huertos;
        CREATE TABLE huertos.usuario_general(id_usuario bigint PRIMARY KEY,puntos integer NOT NULL DEFAULT 0);
        CREATE TABLE huertos.huerto(id_huerto bigint PRIMARY KEY,id_gremio bigint NOT NULL);
        CREATE TABLE huertos.miembro_gremio(id_usuario bigint,id_gremio bigint,PRIMARY KEY(id_usuario,id_gremio));
        CREATE TABLE huertos.huerto_planta(id_huerto bigint,id_planta bigint,fecha_siembra timestamptz,id_estado integer DEFAULT 1,
          PRIMARY KEY(id_huerto,id_planta,fecha_siembra));`)
      await db.query(await readFile(new URL('../migrations/20261108_001_checklist_baseline.sql', import.meta.url), 'utf8'))
      await db.query(await readFile(new URL('../migrations/20261108_002_solicitudes_checklist.sql', import.meta.url), 'utf8'))
      await db.query(await readFile(new URL('../migrations/20261108_003_programacion_checklist.sql', import.meta.url), 'utf8'))
      await installCurrentSchema(db)
      await db.query(`INSERT INTO usuario_general(id_usuario) VALUES(5),(6),(8);
        INSERT INTO huerto VALUES(42,10);
        INSERT INTO miembro_gremio VALUES(5,10),(6,10),(8,10);
        INSERT INTO tareas_huerto(codigo_actividad,id_huerto,modalidad) VALUES
          ('limpieza_huerto',42,'grupal'),('limpieza_huerto',42,'grupal'),
          ('limpieza_huerto',42,'grupal'),('limpieza_huerto',42,'grupal');
        INSERT INTO participantes_tarea(id_tarea,id_usuario) VALUES(1,5),(1,6),(2,5),(3,5),(3,6),(4,5),(4,6);`)
    })
    created = true
    const results = await Promise.all(['5', '6', '5', '6'].map(user =>
      transaction(db => completeTask(db, user, '42', '1', allow))))
    for (const result of results) assert.deepEqual(result, results[0])
    assert.deepEqual((await pool.query('SELECT puntos FROM usuario_general ORDER BY id_usuario')).rows,
      [{ puntos: 30 }, { puntos: 30 }, { puntos: 0 }])

    const race = await Promise.allSettled([
      transaction(db => completeTask(db, '5', '42', '2', allow)),
      transaction(db => enrollTask(db, '8', '42', '2')),
    ])
    assert.equal(race[0].status, 'fulfilled')
    if (race[1].status === 'rejected') assert.equal(race[1].reason.status, 409)
    const participant = (await pool.query('SELECT puntos_otorgados FROM participantes_tarea WHERE id_tarea=2 AND id_usuario=8')).rows
    const points8 = (await pool.query('SELECT puntos FROM usuario_general WHERE id_usuario=8')).rows[0].puntos
    assert.equal(points8, participant.length ? 30 : 0)
    if (participant.length) assert.equal(participant[0].puntos_otorgados, 30)

    await Promise.all(['3', '4'].map(id => transaction(db => completeTask(db, '5', '42', id, allow))))
    assert.deepEqual((await pool.query('SELECT puntos FROM usuario_general WHERE id_usuario IN (5,6) ORDER BY id_usuario')).rows,
      [{ puntos: 120 }, { puntos: 90 }])
    await pool.query("INSERT INTO huerto_planta VALUES(42,9,'2026-11-08 10:00:00.123456+00')")
    await pool.query("INSERT INTO zonas_huerto(id_huerto,nombre,zona_mapa,parcela_mapa) VALUES(42,'Seccion 1',1,1)")
    const input = { claveSolicitud:'23f70b94-af20-46c5-9f88-7db0887a6cac',zonaId:'1' }
    const watering = await Promise.all([1, 2, 3, 4].map(() => transaction(db => recordWatering(db, '5', '42', input,{ahora:new Date(),zonaHoraria:'America/Guayaquil'}))))
    for (const result of watering) assert.deepEqual(result, watering[0])
    assert.equal((await pool.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows[0].puntos, 125)
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM solicitudes_checklist')).rows[0].n, 1)
    const moves=await Promise.allSettled([
      transaction(db=>db.query('UPDATE usuario_general SET puntos=puntos+7 WHERE id_usuario=8')),
      transaction(db=>db.query('UPDATE miembro_gremio SET id_gremio=11 WHERE id_usuario=8')),
      transaction(db=>db.query('UPDATE usuario_general SET puntos=puntos+3 WHERE id_usuario=6')),
    ])
    for(const move of moves) assert.equal(move.status,'fulfilled',move.reason?.message)
    const differences=(await pool.query(`SELECT count(*)::int AS n FROM gremio g WHERE puntos_gremio<>
      (SELECT COALESCE(sum(u.puntos),0) FROM miembro_gremio m JOIN usuario_general u USING(id_usuario) WHERE m.id_gremio=g.id_gremio)`)).rows[0].n
    assert.equal(differences,0)
  } finally {
    // Exclusivamente la base local de prueba validada arriba, creada por este test.
    if (created) await pool.query('DROP SCHEMA huertos CASCADE')
    await pool.end()
  }
})

test('HTTP: zona → maleza → preparación → siembra → señalética/abono → cosecha → secado', {skip:!url},async()=>{
  const target=new URL(url)
  assert.ok(['localhost','127.0.0.1'].includes(target.hostname));assert.equal(target.pathname,'/gr2_checklist_test')
  const db=new pg.Client({connectionString:url});await db.connect()
  let server
  const zone='America/Guayaquil'
  let env
  function clock(date) {
    const now=new Date(date),day=localDate(now,zone)
    env={ahora:now,zonaHoraria:zone,amanecer:new Date(`${day}T11:00Z`),
      clima:{codigo:0,precipitacion:0,esDia:1,observadaEn:now}}
  }
  function phaseDate(quarter,start) {
    let event=SearchMoonQuarter(new Date(start))
    while(event.quarter!==quarter) event=NextMoonQuarter(event)
    return new Date(`${localDate(event.time.date,zone)}T15:00Z`)
  }
  const key=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
  try {
    await db.query(`BEGIN;CREATE SCHEMA huertos;SET LOCAL search_path=huertos,public;
      CREATE TABLE usuario_general(id_usuario bigint PRIMARY KEY,puntos integer NOT NULL DEFAULT 0);
      CREATE TABLE huerto(id_huerto bigint PRIMARY KEY,id_gremio bigint NOT NULL);
      CREATE TABLE miembro_gremio(id_usuario bigint,id_gremio bigint,PRIMARY KEY(id_usuario,id_gremio));
      CREATE TABLE planta(id_planta bigint PRIMARY KEY,nombre_comun text,ciclo_cultivo text,fases jsonb DEFAULT '[]',imagen_muerta text);
      CREATE TABLE huerto_planta(id_huerto bigint,id_planta bigint,fecha_siembra timestamptz,
        id_estado integer DEFAULT 1,cantidad integer DEFAULT 1,observaciones text DEFAULT '{}',modified_at timestamptz DEFAULT now(),
        PRIMARY KEY(id_huerto,id_planta,fecha_siembra));
      INSERT INTO usuario_general(id_usuario) VALUES(5),(6),(7),(8);
      INSERT INTO huerto VALUES(42,10),(43,11);
      INSERT INTO miembro_gremio VALUES(5,10),(6,10),(7,11),(8,10);
      INSERT INTO planta(id_planta,nombre_comun,ciclo_cultivo) VALUES(9,'Especie de prueba','2 días'),(10,'Sin plazo','Perenne');`)
    for(const file of ['20261108_001_checklist_baseline.sql','20261108_002_solicitudes_checklist.sql','20261108_003_programacion_checklist.sql']) {
      await db.query(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'))
    }
    await installCurrentSchema(db)
    const transact=async operation=>{
      await db.query('SAVEPOINT operation')
      try {const result=await operation(db);await db.query('RELEASE SAVEPOINT operation');return result}
      catch(error){await db.query('ROLLBACK TO SAVEPOINT operation');await db.query('RELEASE SAVEPOINT operation');throw error}
    }
    const app=express();app.use(express.json())
    app.use((req,res,next)=>{if(req.headers['x-test-user'])req.session={usuarioId:req.headers['x-test-user'],source:'postgres'};next()})
    app.use('/api/recordatorios',createRecordatoriosRouter(db,transact,async(client,user,garden)=>{
      await requireMember(client,user,garden);return env
    }))
    server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
    const base=`http://127.0.0.1:${server.address().port}/api/recordatorios/huerto/42`
    async function call(path='',body,user='5',method=body?'POST':'GET') {
      const res=await fetch(base+path,{method,headers:{'x-test-user':user,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
      return {status:res.status,data:await res.json()}
    }
    const done=(id,confirmaciones={},user='5')=>call(`/tareas/${id}/completar`,{confirmaciones},user)
    const join=(id,user)=>call(`/tareas/${id}/inscribirse`,{},user)
    const getTask=async code=>(await call()).data.find(t=>t.actividad.codigo===code)

    clock(phaseDate(0,'2026-10-01T00:00Z'))
    const zoneResult=await call('/zonas',{zona:1,parcela:1});assert.equal(zoneResult.status,200)
    const zoneId=zoneResult.data.id
    const cycle=await call('/ciclos',{zonaId:zoneId,claveSolicitud:key(1)});assert.equal(cycle.status,200)
    assert.deepEqual((await call('/ciclos',{zonaId:zoneId,claveSolicitud:key(1)})).data,cycle.data)
    const weed=await getTask('retiro_maleza');assert.equal(weed.disponibilidad.puedeCompletar,true)
    env.clima.precipitacion=1;assert.equal((await done(weed.id)).status,409);env.clima.precipitacion=0
    assert.equal((await done(weed.id)).status,200)
    const prep=await getTask('preparacion_tierra')
    assert.equal((await done(prep.id,{},'8')).status,403)
    await join(prep.id,'5');await join(prep.id,'6')
    assert.equal((await done(prep.id,{abonoOrganico:true})).status,200)
    const preparedDate=new Date(env.ahora)
    const sowBody={claveSolicitud:key(2),cicloId:cycle.data.cicloId,plantaId:'9',parteCosecha:'hojas',cantidad:20,confirmaciones:{ritualAmanecer:true}}
    assert.equal((await call('/siembras',sowBody)).status,409)
    clock(phaseDate(1,new Date(+preparedDate+16*86400000)))
    assert.equal((await call('/siembras',{...sowBody,confirmaciones:{}})).status,400)
    const planted=await call('/siembras',sowBody);assert.equal(planted.status,200,JSON.stringify(planted.data))
    assert.equal(planted.data.comprobante.recompensas[0].puntos,30)
    assert.deepEqual((await call('/siembras',sowBody)).data,planted.data)
    const cropId=planted.data.cultivo.id,separator=cropId.indexOf(':')
    const crop={plantaId:cropId.slice(0,separator),fechaSiembra:cropId.slice(separator+1)}
    const sign=await getTask('senaletica');assert.equal((await done(sign.id,{},'6')).status,200)
    assert.equal((await done(sign.id)).status,409)
    const fertilizer=await call('/programar',{actividad:'abono_organico',cultivo:crop,programadaPara:env.ahora.toISOString(),claveSolicitud:key(3)})
    assert.equal(fertilizer.status,200)
    assert.equal((await done(fertilizer.data.id)).status,200)
    const another=await call('/programar',{actividad:'abono_organico',cultivo:crop,programadaPara:env.ahora.toISOString(),claveSolicitud:key(4)})
    assert.equal(another.data.id,fertilizer.data.id)
    const cleaning=await call('/programar',{actividad:'limpieza_huerto',programadaPara:new Date(+env.ahora+86400000).toISOString(),claveSolicitud:key(5)})
    await join(cleaning.data.id,'5');await join(cleaning.data.id,'6')
    assert.equal((await done(cleaning.data.id)).status,409)
    clock(new Date(+env.ahora+86400000))
    assert.equal((await done(cleaning.data.id,{},'6')).status,200)

    const harvest=await getTask('cosecha')
    clock(phaseDate(2,new Date(+env.ahora+2*86400000)))
    assert.equal((await done(harvest.id,{cultivoListo:true,rocioSeco:true})).status,409)
    const otherSection=(await call('/zonas',{zona:1,parcela:2})).data
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_zona,modalidad,completada_en,completada_por)
      VALUES('riego',42,$1,'individual',$2,5)`,[otherSection.id,new Date(+env.ahora-2*86400000)])
    assert.ok((await getTask('cosecha')).disponibilidad.motivos.some(m=>m.includes('riego de la sección')))
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_planta,fecha_siembra,modalidad,completada_en,completada_por)
      VALUES('riego',42,$1,$2,'individual',$3,5)`,[crop.plantaId,crop.fechaSiembra,
      `${localDate(new Date(+env.ahora-2*86400000),zone)}T23:30:00-05:00`])
    // Un riego adicional del día siguiente no invalida el de hace dos fechas locales.
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_zona,modalidad,completada_en,completada_por)
      VALUES('riego',42,$1,'individual',$2,5)`,[zoneId,new Date(+env.ahora-86400000)])
    const synced=await call('/sincronizar',{});assert.equal(synced.status,200)
    const ritual=await getTask('ritual_agradecimiento');assert.ok(ritual)
    await join(ritual.id,'5');await join(ritual.id,'6')
    assert.equal((await done(ritual.id,{ritualAmanecer:true})).status,200)
    assert.equal((await done(harvest.id,{cultivoListo:true})).status,400)
    env.clima.codigo=3;assert.equal((await done(harvest.id,{cultivoListo:true,rocioSeco:true})).status,409);env.clima.codigo=0
    const harvested=await done(harvest.id,{cultivoListo:true,rocioSeco:true,conservarCultivo:true});assert.equal(harvested.status,200)
    assert.deepEqual((await done(harvest.id)).data,harvested.data)
    assert.equal((await db.query('SELECT id_estado FROM huerto_planta WHERE id_planta=9')).rows[0].id_estado,1)
    assert.equal((await call('/ciclos',{zonaId:zoneId,claveSolicitud:key(6)})).status,409)
    const otherZone=(await call('/zonas',{zona:1,parcela:2})).data
    assert.ok(otherZone.id)
    const lots=(await call('/panel')).data.lotes;assert.equal(lots.length,1)
    const drying=await call('/secados',{loteId:lots[0].id,modalidad:'grupal',aLaSombra:true});assert.equal(drying.status,200)
    await join(drying.data.id,'6')
    const dryConfirm={seco:true,empacado:true,etiquetado:true,almacenado:true}
    clock(new Date(+env.ahora+9*86400000));assert.equal((await done(drying.data.id,dryConfirm)).status,409)
    clock(new Date(+env.ahora+6*86400000));assert.equal((await done(drying.data.id,{...dryConfirm,seco:false})).status,400)
    assert.equal((await db.query('SELECT completada_en FROM tareas_huerto WHERE id_tarea=$1',[drying.data.id])).rows[0].completada_en,null)
    assert.equal((await done(drying.data.id,dryConfirm,'6')).status,200)
    const balances=(await db.query('SELECT id_usuario::text AS id,puntos FROM usuario_general ORDER BY id_usuario')).rows
    assert.deepEqual(balances,[{id:'5',puntos:200},{id:'6',puntos:125},{id:'7',puntos:0},{id:'8',puntos:0}])
    const taskCount=(await db.query('SELECT count(*)::int AS n FROM tareas_huerto')).rows[0].n
    await call('/sincronizar',{});await call('/sincronizar',{})
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tareas_huerto')).rows[0].n,taskCount)
    assert.equal((await call('/panel',undefined,'7')).status,403)
    assert.equal((await call('/cultivos/finalizar',{...crop,cultivoFinalizado:false})).status,400)
    assert.equal((await call('/cultivos/finalizar',{...crop,cultivoFinalizado:true},'7')).status,403)
    const closed=await call('/cultivos/finalizar',{...crop,cultivoFinalizado:true});assert.equal(closed.status,200)
    assert.equal(closed.data.puntosOtorgados,0)
    assert.deepEqual((await call('/cultivos/finalizar',{...crop,cultivoFinalizado:true})).data,closed.data)
    assert.equal((await call('/siembras',{...sowBody,claveSolicitud:key(9)})).status,409)
    const nextCycle=await call('/ciclos',{zonaId:zoneId,claveSolicitud:key(8)})
    assert.equal(nextCycle.status,200)
    const newTasks=(await call()).data.filter(t=>t.zona?.cicloId===nextCycle.data.cicloId)
    assert.deepEqual(newTasks.map(t=>t.actividad.codigo),['retiro_maleza'])
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=5')).rows[0].puntos,200)
    // Un catálogo sin días se muestra pendiente, no se reemplaza por 60 ni 120 días.
    await db.query("INSERT INTO huerto_planta(id_huerto,id_planta,fecha_siembra) VALUES(42,10,'2026-01-01T10:00Z')")
    await call('/sincronizar',{})
    const unknown=(await call()).data.find(t=>t.actividad.codigo==='cosecha'&&t.cultivo.plantaId==='10')
    assert.equal(unknown.disponibilidad.estado,'pendiente_configuracion')
    // Al completar los datos del catálogo se puede cosechar y finalizar el cultivo.
    await db.query("UPDATE planta SET ciclo_cultivo='2 días' WHERE id_planta=10")
    await db.query('UPDATE gremio SET area_total=2400 WHERE id_gremio=10')
    const importedZone=(await call('/zonas',{zona:4,parcela:1})).data
    const configured=await call('/cultivos/configuracion',{plantaId:'10',fechaSiembra:'2026-01-01T10:00:00Z',parteCosecha:'flores',zonaId:importedZone.id},'6','PUT')
    assert.equal(configured.status,200)
    assert.equal((await call('/ciclos',{zonaId:importedZone.id,claveSolicitud:key(10)})).status,409)
    await call('/sincronizar',{})
    const importedTasks=(await call()).data.filter(task=>task.zona?.id===importedZone.id)
    assert.ok(importedTasks.length)
    assert.ok(importedTasks.every(task=>!['retiro_maleza','preparacion_tierra','siembra'].includes(task.actividad.codigo)))
    assert.ok(importedTasks.every(task=>task.zona.cicloId===configured.data.cicloId))
    clock(phaseDate(2,new Date(+env.ahora+86400000)))
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,id_planta,fecha_siembra,modalidad,completada_en,completada_por)
      VALUES('riego',42,10,'2026-01-01T10:00Z','individual',$1,6)`,[new Date(+env.ahora-2*86400000)])
    await call('/sincronizar',{})
    const extraRitual=(await call()).data.find(t=>t.actividad.codigo==='ritual_agradecimiento'&&!t.completado)
    await join(extraRitual.id,'6');assert.equal((await done(extraRitual.id,{ritualAmanecer:true},'6')).status,200)
    const full=await done(unknown.id,{cultivoListo:true,rocioSeco:true,conservarCultivo:false},'6')
    assert.equal(full.status,200)
    assert.equal((await db.query('SELECT id_estado FROM huerto_planta WHERE id_planta=10')).rows[0].id_estado,6)
    assert.equal((await call('/ciclos',{zonaId:importedZone.id,claveSolicitud:key(10)})).status,200)
    const extraLot=(await call('/panel')).data.lotes.find(lot=>lot.cosechaId===unknown.id)
    // Un lote individual reserva la tarea para su responsable; otro miembro no cobra.
    const individual=await call('/secados',{loteId:extraLot.id,modalidad:'individual',aLaSombra:true},'6')
    clock(new Date(+env.ahora+10*86400000))
    assert.equal((await join(individual.data.id,'5')).status,409)
    assert.equal((await done(individual.data.id,dryConfirm,'5')).status,403)
    assert.equal((await done(individual.data.id,dryConfirm,'6')).status,200)
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=6')).rows[0].puntos,200)
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve))
    await db.query('ROLLBACK');await db.end()
  }
})

test('004: totales iniciales, cambios de membresía e inmutabilidad de recompensas', {skip:!url},async()=>{
  const target=new URL(url)
  assert.ok(['localhost','127.0.0.1'].includes(target.hostname));assert.equal(target.pathname,'/gr2_checklist_test')
  const db=new pg.Client({connectionString:url});await db.connect()
  try {
    await db.query(`BEGIN;CREATE SCHEMA huertos;SET LOCAL search_path=huertos,public;
      CREATE TABLE usuario_general(id_usuario bigint PRIMARY KEY,puntos integer DEFAULT 0);
      CREATE TABLE miembro_gremio(id_usuario bigint,id_gremio bigint,PRIMARY KEY(id_usuario,id_gremio));
      CREATE TABLE huerto(id_huerto bigint PRIMARY KEY,id_gremio bigint);
      CREATE TABLE huerto_planta(id_huerto bigint,id_planta bigint,fecha_siembra timestamptz,PRIMARY KEY(id_huerto,id_planta,fecha_siembra));
      INSERT INTO usuario_general VALUES(5,50),(6,20);
      INSERT INTO miembro_gremio VALUES(5,10),(6,11);
      INSERT INTO huerto VALUES(42,10);`)
    for(const file of ['20261108_001_checklist_baseline.sql','20261108_002_solicitudes_checklist.sql','20261108_003_programacion_checklist.sql'])
      await db.query(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'))
    await installCurrentSchema(db)
    assert.deepEqual((await readGuildRanking(db)).map(g=>[g.id,g.puntos]),[['10',50],['11',20]])
    await db.query('UPDATE miembro_gremio SET id_gremio=10 WHERE id_usuario=6')
    assert.deepEqual((await readGuildRanking(db)).map(g=>g.puntos),[70,0])
    await db.query('UPDATE usuario_general SET puntos=puntos+7 WHERE id_usuario=6')
    assert.equal((await readGuildRanking(db))[0].puntos,77)
    await db.query('DELETE FROM miembro_gremio WHERE id_usuario=5;INSERT INTO miembro_gremio VALUES(5,11)')
    assert.deepEqual((await readGuildRanking(db)).map(g=>[g.id,g.puntos]),[['11',50],['10',27]])
    await db.query(`INSERT INTO tareas_huerto(codigo_actividad,id_huerto,modalidad,completada_en,completada_por)
      VALUES('limpieza_huerto',42,'grupal',now(),6);
      INSERT INTO participantes_tarea(id_tarea,id_usuario,puntos_otorgados) VALUES(1,6,30);`)
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=6')).rows[0].puntos,57)
    await db.query('UPDATE participantes_tarea SET puntos_otorgados=30 WHERE id_tarea=1 AND id_usuario=6')
    assert.equal((await db.query('SELECT puntos FROM usuario_general WHERE id_usuario=6')).rows[0].puntos,57)
    for(const sql of ['UPDATE participantes_tarea SET puntos_otorgados=999 WHERE id_tarea=1',
      'DELETE FROM participantes_tarea WHERE id_tarea=1',
      "INSERT INTO participantes_tarea(id_tarea,id_usuario,puntos_otorgados) VALUES(1,5,30)"]) {
      await db.query('SAVEPOINT invalid_reward')
      await assert.rejects(db.query(sql),{code:'P0001'})
      await db.query('ROLLBACK TO SAVEPOINT invalid_reward')
    }
  } finally {await db.query('ROLLBACK');await db.end()}
})
