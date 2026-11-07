// Prueba de integración en un esquema temporal; no copia usuarios ni sus datos.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: new URL('../.env', import.meta.url) })
const sourceSchema = process.env.DB_SCHEMA || 'huertos'
const testSchema = `huertos_test_${randomBytes(6).toString('hex')}`
const ident = (name) => '"' + name.replaceAll('"', '""') + '"'
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })
let created = false, appPool, server, restarted, store, store2
try {
  await admin.query(`CREATE SCHEMA ${ident(testSchema)}`)
  created = true
  const tables = (await admin.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'`, [sourceSchema])).rows
  const privateTables = new Set(['usuario','usuario_general','gremio','huerto','huerto_planta','miembro_gremio','invitacion_gremio','huertos_sessions','actividad_gremio'])
  for (const {table_name:name} of tables) {
    await admin.query(`CREATE TABLE ${ident(testSchema)}.${ident(name)} (LIKE ${ident(sourceSchema)}.${ident(name)} INCLUDING ALL)`)
    if (!privateTables.has(name)) await admin.query(`INSERT INTO ${ident(testSchema)}.${ident(name)} SELECT * FROM ${ident(sourceSchema)}.${ident(name)}`)
  }
  process.env.DB_SCHEMA = testSchema
  process.env.DATA_MODE = 'postgres'
  const db = await import('../src/config/db.js')
  appPool = db.pool
  await db.checkDbConnection()
  const {createSessionStore} = await import('../src/config/sessions.js')
  const {createApp} = await import('../src/app.js')
  store = await createSessionStore()
  server = createApp(store).listen(0,'127.0.0.1')
  await once(server,'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  async function call(path,{body,cookie,method=body?'POST':'GET',origin=base}={}) {
    const res=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined})
    return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]}
  }
  const password=randomBytes(16).toString('hex')
  const register=async (usuario)=>{
    const r=await call('/api/auth/registro',{body:{nombre:'Prueba',apellido:'Temporal',usuario,contrasena:password,genero:'O',fechaNacimiento:'2000-01-01',descripcion:'Verificación aislada'}})
    assert.equal(r.status,201,JSON.stringify(r.data))
    const login=await call('/api/auth/login',{body:{usuario,contrasena:password}})
    assert.equal(login.status,200,JSON.stringify(login.data))
    return login
  }
  const a=await register('test_uno'), b=await register('test_dos')
  assert.equal((await call('/api/auth/login',{body:{usuario:'test_uno',contrasena:'incorrecta'}})).status,401)
  const config=(await call('/api/gremios/configuracion',{cookie:a.cookie})).data
  const guild=await call('/api/gremios',{cookie:a.cookie,body:{nombre:'Gremio de prueba aislado',area:100,lat:-0.18,lng:-78.46,suelo:config.suelos[0],riego:config.riegos[0]}})
  assert.equal(guild.status,201,JSON.stringify(guild.data))
  const g=guild.data.gremio,h=g.huerto.id
  const profile=await call(`/api/perfil/${a.data.usuario.id}`,{cookie:a.cookie})
  assert.equal(profile.status,200,JSON.stringify(profile.data))
  assert.equal(Number(profile.data.posicionGremio),1)
  assert.equal((await call(`/api/perfil/${a.data.usuario.id}/descripcion`,{cookie:a.cookie,method:'PUT',body:{descripcion:'Descripción persistida de prueba'}})).status,200)
  assert.equal((await call(`/api/perfil/${a.data.usuario.id}`,{cookie:a.cookie})).data.descripcion,'Descripción persistida de prueba')
  assert.equal((await call(`/api/perfil/${a.data.usuario.id}`,{cookie:b.cookie})).status,403)
  assert.equal((await call(`/api/gremios/${g.id}`,{cookie:b.cookie})).status,403)
  assert.equal((await call(`/api/huertos/${h}/sembrar`,{cookie:b.cookie,body:{plantaId:1,x:30,y:40}})).status,403)
  const join=await call('/api/gremios/unirse',{cookie:b.cookie,body:{codigo:g.codigo}})
  assert.equal(join.status,200,JSON.stringify(join.data))
  const again=await call('/api/gremios/unirse',{cookie:b.cookie,body:{codigo:g.codigo}})
  assert.equal(again.status,200)
  const roster=await call(`/api/gremios/${g.id}`,{cookie:b.cookie})
  assert.equal(roster.data.miembros.length,2)
  assert.ok(roster.data.miembros.every((m)=>m.enLinea))
  assert.ok(roster.data.miembros.every((m)=>!('contrasenia_hash' in m)))
  const plants=await call('/api/plantas')
  assert.ok(plants.data.length>0)
  const plant=plants.data[0]
  assert.equal((await call(`/api/plantas/${plant.id}`)).status,200)
  const first=await call(`/api/huertos/${h}/sembrar`,{cookie:a.cookie,body:{plantaId:plant.id,x:30,y:40}})
  assert.equal(first.status,201,JSON.stringify(first.data))
  const second=await call(`/api/huertos/${h}/sembrar`,{cookie:a.cookie,body:{plantaId:plant.id,x:60,y:70}})
  assert.equal(second.status,201,JSON.stringify(second.data))
  assert.notEqual(first.data.cultivo.id,second.data.cultivo.id)
  const harvested=await call(`/api/huertos/${h}/cosechar`,{cookie:a.cookie,body:{cultivoId:first.data.cultivo.id}})
  assert.equal(harvested.status,200,JSON.stringify(harvested.data))
  assert.equal((await call(`/api/huertos/${h}/cosechar`,{cookie:a.cookie,body:{cultivoId:first.data.cultivo.id}})).status,409)
  const garden=await call(`/api/huertos/${h}`,{cookie:a.cookie})
  assert.equal(garden.data.cultivos.length,2)
  assert.equal(garden.data.cultivos.filter((c)=>c.cosechado).length,1)
  assert.equal('actividades' in (await call(`/api/gremios/${g.id}`,{cookie:b.cookie})).data,false)
  store2=await createSessionStore()
  restarted=createApp(store2).listen(0,'127.0.0.1')
  await once(restarted,'listening')
  const origin=`http://127.0.0.1:${restarted.address().port}`
  assert.equal((await call(`/api/gremios/${g.id}`,{cookie:a.cookie,origin})).status,401)
  assert.equal((await call('/api/auth/logout',{cookie:a.cookie,method:'POST'})).status,200)
  const offline=await call(`/api/gremios/${g.id}`,{cookie:b.cookie})
  // Logout destruye la sesión local sin otra escritura: la presencia compartida caduca por tiempo.
  assert.equal(offline.data.miembros.find((m)=>m.id===a.data.usuario.id).enLinea,true)
  assert.equal((await call('/api/auth/presence',{cookie:a.cookie,method:'POST'})).status,401)
  console.log('APROBADO: registro, login, invitaciones, membresía, presencia, dos siembras, cosecha, duplicados, sesiones en memoria y logout.')
} catch(error) {
  console.error('FALLO DE VERIFICACIÓN:',error.code || error.message)
  process.exitCode=1
} finally {
  if(server) await new Promise((resolve)=>server.close(resolve))
  if(restarted) await new Promise((resolve)=>restarted.close(resolve))
  store?.close?.();store2?.close?.()
  if(appPool) await appPool.end()
  if(created) {
    assert.match(testSchema,/^huertos_test_[0-9a-f]{12}$/)
    await admin.query(`DROP SCHEMA ${ident(testSchema)} CASCADE`)
    console.log('Esquema temporal eliminado; datos del equipo conservados.')
  }
  await admin.end()
}
