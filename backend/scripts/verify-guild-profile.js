import assert from 'node:assert/strict'
import { checkDbConnection, pool, schema } from '../src/config/db.js'
import { updateGuildProfile } from '../src/data/guildProfile.js'

let client
try {
  await checkDbConnection()
  client = await pool.connect()
  await client.query('BEGIN')
  // Copiar solo la estructura en tablas temporales de esta conexión. Ningún dato de usuarios o gremios se copia.
  await client.query(`CREATE TEMP TABLE gremio ON COMMIT DROP AS
    SELECT id_gremio,descripcion,anuncios,modified_at FROM "${schema}".gremio WITH NO DATA`)
  await client.query(`CREATE TEMP TABLE miembro_gremio ON COMMIT DROP AS
    SELECT id_gremio,id_usuario,rol FROM "${schema}".miembro_gremio WITH NO DATA`)
  await client.query(`INSERT INTO pg_temp.gremio(id_gremio,descripcion,anuncios,modified_at)
    VALUES(1,'Descripción inicial','',now())`)
  await client.query(`INSERT INTO pg_temp.miembro_gremio VALUES(1,1,'Aprendiz'),(1,2,'Oficial'),(1,3,'Maestro'),(1,4,'Fundador')`)
  const body = {descripcion:'Descripción editada',anuncios:'Anuncio de prueba'}
  for (const userId of [1,4,999]) await assert.rejects(updateGuildProfile(client,userId,1,body),{status:403})
  await updateGuildProfile(client,2,1,body)
  assert.deepEqual((await client.query('SELECT descripcion,anuncios FROM pg_temp.gremio')).rows[0],body)
  const maestro = {descripcion:'Edición de Maestro',anuncios:'Reunión comunitaria'}
  await updateGuildProfile(client,3,1,maestro)
  assert.deepEqual((await client.query('SELECT descripcion,anuncios FROM pg_temp.gremio')).rows[0],maestro)
  await client.query("UPDATE pg_temp.miembro_gremio SET rol='Aprendiz' WHERE id_usuario=2")
  await assert.rejects(updateGuildProfile(client,2,1,body),{status:403})
  assert.deepEqual((await client.query('SELECT descripcion,anuncios FROM pg_temp.gremio')).rows[0],maestro)
  console.log('APROBADO: columnas reales, persistencia, Oficial/Maestro autorizados, otros rangos rechazados y permiso revocado al cambiar de rango.')
} catch (error) {
  console.error('Fallo de verificación:',error.code || error.message)
  process.exitCode = 1
} finally {
  if (client) {
    await client.query('ROLLBACK')
    client.release()
    console.log('Prueba revertida; sin cambios en gremios ni miembros reales.')
  }
  await pool.end()
}
