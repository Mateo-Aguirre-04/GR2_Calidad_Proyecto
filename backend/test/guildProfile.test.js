import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canEditGuildProfile, guildDescription, updateGuildProfile } from '../src/data/guildProfile.js'

function database(role) {
  const calls = []
  return { calls, async query(sql, params) {
    calls.push({sql,params})
    if (sql.startsWith('SELECT rol')) return {rows:role ? [{rol:role}] : []}
    return {rows:[{descripcion:params[1],anuncios:params[2]}]}
  } }
}

test('solo Oficial y Maestro tienen permiso; Fundador no es una excepción', () => {
  for (const role of ['Oficial','Maestro',' oficial ','MAESTRO']) assert.equal(canEditGuildProfile(role),true)
  for (const role of ['Fundador','Miembro','Aprendiz','Novato','Líder de Gremio','',undefined]) assert.equal(canEditGuildProfile(role),false)
})

for (const role of ['Oficial','Maestro']) test(`${role} guarda ambos campos consultando su membresía real`,async () => {
  const db=database(role)
  const result=await updateGuildProfile(db,5,9,{descripcion:'  Huerto comunitario  ',anuncios:' Reunión el viernes '})
  assert.deepEqual(db.calls[0].params,[9,5])
  assert.match(db.calls[0].sql,/FOR SHARE/)
  assert.deepEqual(result,{descripcion:'Huerto comunitario',anuncios:'Reunión el viernes',puedeEditar:true})
})

for (const role of ['Fundador','Aprendiz','Miembro',null]) test(`rechaza ${role || 'usuario ajeno'} aunque falsee el rango o el usuario en el cuerpo`,async () => {
  const db=database(role)
  await assert.rejects(updateGuildProfile(db,5,9,{descripcion:'Cambio',anuncios:'Cambio',rol:'Maestro',usuarioId:99}),{status:403})
  assert.equal(db.calls.length,1)
})

test('valida tipos, límites y limpieza de anuncios sin alterar otros datos',async () => {
  for (const body of [{descripcion:'x'.repeat(121),anuncios:''},{descripcion:'Ok',anuncios:'x'.repeat(161)},{descripcion:42,anuncios:''},{descripcion:'Ok'}]) {
    const db=database('Oficial')
    await assert.rejects(updateGuildProfile(db,1,2,body),{status:400})
    assert.equal(db.calls.length,1)
  }
  assert.equal((await updateGuildProfile(database('Maestro'),1,2,{descripcion:'',anuncios:''})).anuncios,'')
  assert.throws(()=>guildDescription('',true),{status:400})
  assert.equal(guildDescription(' Descripción inicial ',true),'Descripción inicial')
})
