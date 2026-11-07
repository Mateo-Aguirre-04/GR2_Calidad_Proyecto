import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { query, transaction, isDbConnected } from '../config/db.js'
import { getPresence, isOnline } from '../config/sessions.js'
import { requireUser, requireMember, cropResponse, growthDays, httpError, sendError } from '../data/postgres.js'

// Con Supabase conectado, nunca se usan los controladores de demostración.
export const realOrDemo = (real, demo) => (req, res, next) => isDbConnected() ? real(req, res, next) : demo(req, res, next)
const handle = (operation) => async (req, res) => {
  try { await operation(req, res) } catch (error) { sendError(res, error) }
}
const guildFields = `g.id_gremio AS id, g.nombre_gremio AS nombre, g.area_total AS "areaTotal",
  g.puntos_gremio AS puntos, g.latitud, g.longitud, g.created_at AS "creadoEn"`
const guildResponse = (g) => ({ ...g, id: Number(g.id), ubicacion: { lat: Number(g.latitud), lng: Number(g.longitud) } })

export const getGremios = handle(async (req, res) => {
  requireUser(req)
  const { rows } = await query(`SELECT ${guildFields}, count(m.id_usuario)::int AS "miembrosCount"
    FROM gremio g LEFT JOIN miembro_gremio m USING(id_gremio)
    GROUP BY g.id_gremio ORDER BY g.puntos_gremio DESC`)
  res.json(rows.map(guildResponse))
})

export const getConfiguracion = handle(async (req,res) => {
  requireUser(req)
  const [suelos,riegos]=await Promise.all([
    query('SELECT nombre FROM tipo_suelo ORDER BY id_suelo'),
    query('SELECT nombre FROM tipo_riego ORDER BY id_riego'),
  ])
  res.json({suelos:suelos.rows.map((r)=>r.nombre),riegos:riegos.rows.map((r)=>r.nombre)})
})

export const getGremio = handle(async (req, res) => {
  const userId = requireUser(req)
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) throw httpError(400, 'ID de gremio inválido.')
  const guild = await query(`SELECT ${guildFields} FROM gremio g JOIN miembro_gremio m USING(id_gremio)
    WHERE g.id_gremio=$1 AND m.id_usuario=$2`, [id, userId])
  if (!guild.rows.length) throw httpError(403, 'No perteneces a este gremio.')
  const members = await query(`SELECT u.id_usuario AS id, concat_ws(' ',u.nombres,u.apellidos) AS nombre,
    ug.nombre_usuario AS usuario, ug.puntos, m.rol AS "rolGremio"
    FROM miembro_gremio m JOIN usuario u USING(id_usuario) JOIN usuario_general ug USING(id_usuario)
    WHERE m.id_gremio=$1 ORDER BY ug.puntos DESC,u.id_usuario`, [id])
  const gardens = await query('SELECT id_huerto AS id FROM huerto WHERE id_gremio=$1 ORDER BY id_huerto LIMIT 1', [id])
  const token = await query('SELECT codigo FROM invitacion_gremio WHERE id_gremio=$1 AND expira_en>now() ORDER BY expira_en DESC LIMIT 1', [id])
  const presence = await getPresence(req.sessionStore, 'postgres')
  res.set('Cache-Control', 'no-store').json({
    ...guildResponse(guild.rows[0]), fuente: 'postgres', huerto: gardens.rows[0] || null, codigo: token.rows[0]?.codigo || null,
    miembros: members.rows.map((u) => ({ ...u, id: Number(u.id), lastSeen: presence.get(Number(u.id)) || null,
      enLinea: isOnline(presence.get(Number(u.id))), puntos: Number(u.puntos) })),
  })
})

async function invitation(db, guildId, userId) {
  // Serializar creación de invitaciones por gremio y evitar códigos repetidos.
  const existing = await db.query('SELECT codigo FROM invitacion_gremio WHERE id_gremio=$1 AND expira_en>now() ORDER BY expira_en DESC LIMIT 1', [guildId])
  if (existing.rows.length) return existing.rows[0].codigo
  for (let i = 0; i < 10; i++) {
    const code = String(randomInt(100000, 1000000))
    const inserted = await db.query(`INSERT INTO invitacion_gremio(codigo,id_gremio,creado_por,expira_en)
      VALUES($1,$2,$3,now()+interval '7 days') ON CONFLICT(codigo) DO NOTHING RETURNING codigo`, [code, guildId, userId])
    if (inserted.rows.length) return code
  }
  throw httpError(503, 'No se pudo generar el código. Inténtalo de nuevo.')
}

export const crearInvitacion = handle(async (req, res) => {
  const userId = requireUser(req)
  const result = await transaction(async (db) => {
    const guild = await db.query(`SELECT g.id_gremio FROM gremio g JOIN miembro_gremio m USING(id_gremio)
      WHERE g.id_gremio=$1 AND m.id_usuario=$2 FOR UPDATE OF g`, [req.params.id, userId])
    if (!guild.rows.length) throw httpError(403, 'No perteneces al gremio.')
    return invitation(db, req.params.id, userId)
  })
  res.json({ codigo: result })
})

export const unirse = handle(async (req, res) => {
  const userId = requireUser(req)
  const codigo = String(req.body.codigo || '').trim()
  if (!/^\d{6}$/.test(codigo)) throw httpError(400, 'Ingresa un código de invitación de 6 dígitos.')
  const result = await transaction(async (db) => {
    const token = await db.query(`SELECT codigo,id_gremio FROM invitacion_gremio WHERE codigo=$1 AND expira_en>now() FOR UPDATE`, [codigo])
    if (!token.rows.length) throw httpError(404, 'Invitación no encontrada o expirada.')
    const id = token.rows[0].id_gremio
    const added = await db.query(`INSERT INTO miembro_gremio(id_usuario,id_gremio,rol) VALUES($1,$2,'Aprendiz')
      ON CONFLICT(id_usuario,id_gremio) DO NOTHING RETURNING id_usuario`, [userId, id])
    if (added.rows.length) await db.query('UPDATE invitacion_gremio SET usos=usos+1 WHERE codigo=$1', [codigo])
    const guild = await db.query(`SELECT ${guildFields} FROM gremio g WHERE id_gremio=$1`, [id])
    const garden = await db.query('SELECT id_huerto AS id FROM huerto WHERE id_gremio=$1 ORDER BY id_huerto LIMIT 1', [id])
    return { ...guildResponse(guild.rows[0]), codigo, huerto: garden.rows[0] || null }
  })
  res.json({ mensaje: 'Ingreso al gremio confirmado.', gremio: result })
})

export const crearGremio = handle(async (req, res) => {
  const userId = requireUser(req)
  const { nombre, area, lat, lng } = req.body
  if (typeof nombre !== 'string' || !nombre.trim() || !Number.isFinite(Number(area)) || Number(area)<=0) throw httpError(400, 'Nombre y área positiva son obligatorios.')
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat))>90 || Math.abs(Number(lng))>180) throw httpError(400, 'Coordenadas inválidas.')
  const result = await transaction(async (db) => {
    const catalogs = await db.query(`SELECT c.id_cerca,c.id_subcerca,d.id_diseño,d.id_subdiseño,a.id_abono,s.id_suelo,r.id_riego
      FROM subcerca_seguridad c CROSS JOIN subdiseño_huerto d CROSS JOIN tipo_abono a CROSS JOIN tipo_suelo s CROSS JOIN tipo_riego r
      ORDER BY c.id_cerca,c.id_subcerca,d.id_diseño,d.id_subdiseño,a.id_abono,s.id_suelo,r.id_riego LIMIT 1`)
    if (!catalogs.rows.length) throw httpError(409, 'Faltan catálogos de configuración del huerto en la base.')
    const c = catalogs.rows[0]
    for (const [field, table, key] of [['suelo','tipo_suelo','id_suelo'],['riego','tipo_riego','id_riego']]) {
      if (!req.body[field]) throw httpError(400, `Selecciona un tipo de ${field}.`)
      const selected=await db.query(`SELECT ${key} FROM ${table} WHERE nombre=$1 LIMIT 1`,[req.body[field]])
      if (!selected.rows.length) throw httpError(400, `El tipo de ${field} no existe en la base.`)
      c[key]=selected.rows[0][key]
    }
    const g = (await db.query(`INSERT INTO gremio(nombre_gremio,area_total,latitud,longitud)
      VALUES($1,$2,$3,$4) RETURNING id_gremio`, [nombre.trim(), Number(area), Number(lat), Number(lng)])).rows[0]
    await db.query(`INSERT INTO miembro_gremio(id_usuario,id_gremio,rol) VALUES($1,$2,'Fundador')`, [userId,g.id_gremio])
    const garden = (await db.query(`INSERT INTO huerto(id_gremio,id_cerca,id_subcerca,id_abono,id_suelo,id_riego,id_diseño,id_subdiseño)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_huerto AS id`, [g.id_gremio,c.id_cerca,c.id_subcerca,c.id_abono,c.id_suelo,c.id_riego,c.id_diseño,c.id_subdiseño])).rows[0]
    const codigo = await invitation(db,g.id_gremio,userId)
    return { id:Number(g.id_gremio),nombre:nombre.trim(),codigo,huerto:garden,ubicacion:{lat:Number(lat),lng:Number(lng)} }
  })
  res.status(201).json({ mensaje:'Gremio creado.', gremio:result })
})

export const registro = handle(async (req, res) => {
  const { nombre, apellido, usuario, contrasena, genero, descripcion = '' } = req.body
  if (![nombre,apellido,usuario,contrasena].every((v) => typeof v === 'string' && v.trim()) || contrasena.length<8) throw httpError(400, 'Completa los datos y usa una contraseña de al menos 8 caracteres.')
  if (!['M','F','NB','O'].includes(genero)) throw httpError(400, 'Género inválido.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.fechaNacimiento || '') || !Number.isFinite(Date.parse(req.body.fechaNacimiento)) || Date.parse(req.body.fechaNacimiento)>Date.now()) throw httpError(400,'Ingresa una fecha de nacimiento válida.')
  const hash = await bcrypt.hash(contrasena,12)
  const user = await transaction(async (db) => {
    const exists = await db.query('SELECT 1 FROM usuario_general WHERE lower(nombre_usuario)=lower($1)', [usuario.trim()])
    if (exists.rows.length) throw httpError(409, 'El nombre de usuario ya existe.')
    const { rows } = await db.query(`INSERT INTO usuario(nombres,apellidos,contrasenia_hash,fecha_nacimiento,genero)
      VALUES($1,$2,$3,$4,$5) RETURNING id_usuario`, [nombre.trim(),apellido.trim(),hash,req.body.fechaNacimiento,genero])
    await db.query(`INSERT INTO usuario_general(id_usuario,nombre_usuario,descripcion,puntos) VALUES($1,$2,$3,0)`, [rows[0].id_usuario,usuario.trim(),descripcion])
    return { id:Number(rows[0].id_usuario),usuario:usuario.trim(),nombre:`${nombre.trim()} ${apellido.trim()}`,puntos:0 }
  })
  res.status(201).json({ mensaje:'Cuenta registrada en Supabase.',usuario:user })
})

const plantSQL = `SELECT p.*,t.nombre AS tipo FROM planta p JOIN tipo_planta t USING(id_tipo_planta)`
const plantResponse = (p) => ({ id:Number(p.id_planta),nombre:p.nombre_comun,nombreCientifico:p.nombre_cientifico,tipo:p.tipo,
  ciclo:p.ciclo_cultivo,diasCrecimiento:growthDays(p.ciclo_cultivo),resumen:p.ciclo_cultivo,cuidados:{},imagen:'',fases:[] })
export const getPlantas = handle(async (req,res) => res.json((await query(`${plantSQL} ORDER BY p.id_planta`)).rows.map(plantResponse)))
export const getPlanta = handle(async (req,res) => {
  const { rows } = await query(`${plantSQL} WHERE p.id_planta=$1`,[req.params.id])
  if (!rows.length) throw httpError(404,'Planta no encontrada.')
  res.json(plantResponse(rows[0]))
})

export const getHuerto = handle(async (req,res) => {
  const userId=requireUser(req)
  const id=Number(req.params.id)
  await requireMember({query},userId,id)
  const gardens=await query(`SELECT h.*,g.latitud,g.longitud,g.nombre_gremio,sd.imagen
    FROM huerto h JOIN gremio g USING(id_gremio)
    JOIN subdiseño_huerto sd ON sd.id_diseño=h.id_diseño AND sd.id_subdiseño=h.id_subdiseño
    WHERE h.id_huerto=$1`,[id])
  const h=gardens.rows[0]
  if (!h) throw httpError(404,'Huerto no encontrado.')
  const crops=await query(`SELECT hp.*,hp.fecha_siembra::text AS fecha_exacta,p.nombre_comun,p.ciclo_cultivo FROM huerto_planta hp JOIN planta p USING(id_planta)
    WHERE hp.id_huerto=$1 ORDER BY hp.fecha_siembra`,[id])
  res.json({ id:Number(h.id_huerto),gremioId:Number(h.id_gremio),nombre:h.nombre_gremio,
    tipo:h.imagen?.replace(/^.*\//,'').replace(/\.png$/,'') || 'surcos',
    ubicacion:{lat:Number(h.latitud),lng:Number(h.longitud)},cultivos:crops.rows.map(cropResponse) })
})

export const sembrar = handle(async (req,res) => {
  const userId=requireUser(req)
  const {plantaId,x,y}=req.body
  if (![x,y].every((v) => Number.isFinite(v) && v>=0 && v<=100) || !Number.isSafeInteger(Number(plantaId))) throw httpError(400,'Planta o posición inválida.')
  const crop=await transaction(async (db) => {
    await requireMember(db,userId,req.params.id)
    const plant=(await db.query('SELECT * FROM planta WHERE id_planta=$1',[plantaId])).rows[0]
    if (!plant) throw httpError(404,'Planta no encontrada.')
    const {rows}=await db.query(`INSERT INTO huerto_planta(id_huerto,id_planta,cantidad,id_estado,observaciones)
      VALUES($1,$2,1,1,$3) RETURNING *,fecha_siembra::text AS fecha_exacta`,[req.params.id,plantaId,JSON.stringify({x,y,cosechado:false})])
    return cropResponse({...rows[0],...plant})
  })
  res.status(201).json({mensaje:'Siembra guardada en Supabase.',cultivo:crop})
})

export const cosechar = handle(async (req,res) => {
  const userId=requireUser(req)
  const value=String(req.body.cultivoId || '')
  const delimiter=value.indexOf(':')
  const plantId=Number(value.slice(0,delimiter)),fecha=value.slice(delimiter+1)
  if (delimiter<1 || !Number.isSafeInteger(plantId) || !Number.isFinite(Date.parse(fecha))) throw httpError(400,'Cultivo inválido.')
  const crop=await transaction(async (db) => {
    await requireMember(db,userId,req.params.id)
    const {rows}=await db.query(`SELECT hp.*,hp.fecha_siembra::text AS fecha_exacta,p.nombre_comun,p.ciclo_cultivo FROM huerto_planta hp JOIN planta p USING(id_planta)
      WHERE hp.id_huerto=$1 AND hp.id_planta=$2 AND hp.fecha_siembra=$3 FOR UPDATE OF hp`,[req.params.id,plantId,fecha])
    if (!rows.length) throw httpError(404,'Cultivo no encontrado.')
    const current=cropResponse(rows[0])
    if (current.cosechado) throw httpError(409,'Este cultivo ya fue cosechado.')
    const metadata=JSON.stringify({x:current.x,y:current.y,cosechado:true})
    await db.query(`UPDATE huerto_planta SET id_estado=$4,observaciones=$5,modified_at=now()
      WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3`,[req.params.id,plantId,fecha,Number(process.env.HARVEST_STATE_ID || 6),metadata])
    return {...current,cosechado:true}
  })
  res.json({mensaje:'Cosecha guardada en Supabase.',cultivo:crop})
})

export const getPerfil = handle(async (req,res) => {
  const userId=requireUser(req)
  if (Number(req.params.id)!==Number(userId)) throw httpError(403,'Solo puedes consultar tu perfil.')
  const {rows}=await query(`SELECT u.id_usuario AS id,concat_ws(' ',u.nombres,u.apellidos) AS nombre,
    ug.nombre_usuario AS usuario,ug.descripcion,ug.puntos AS puntuacion,
    g.nombre_gremio AS gremio,m.rol AS rango,
    CASE WHEN m.id_gremio IS NULL THEN NULL ELSE (
      SELECT count(*)+1 FROM miembro_gremio ranked JOIN usuario_general scores USING(id_usuario)
      WHERE ranked.id_gremio=m.id_gremio AND (scores.puntos>ug.puntos OR (scores.puntos=ug.puntos AND scores.id_usuario<ug.id_usuario))
    ) END AS "posicionGremio"
    FROM usuario u JOIN usuario_general ug USING(id_usuario)
    LEFT JOIN miembro_gremio m USING(id_usuario) LEFT JOIN gremio g USING(id_gremio)
    WHERE u.id_usuario=$1 ORDER BY m.fecha_ingreso DESC LIMIT 1`,[userId])
  if (!rows.length) throw httpError(404,'Perfil no encontrado.')
  res.json({...rows[0],avatar:''})
})
export const guardarDescripcion = handle(async (req,res) => {
  const userId=requireUser(req)
  if (Number(req.params.id)!==Number(userId)) throw httpError(403,'Solo puedes editar tu perfil.')
  if (typeof req.body.descripcion!=='string' || req.body.descripcion.length>1024) throw httpError(400,'Descripción inválida.')
  await query('UPDATE usuario_general SET descripcion=$2,modified_at=now() WHERE id_usuario=$1',[userId,req.body.descripcion])
  res.json({mensaje:'Descripción guardada.'})
})

// No existe una tabla de recordatorios en esta instancia; no inventar tareas ni puntos.
export const getRecordatorios = handle(async (req,res) => { requireUser(req);res.json([]) })
export const completarRecordatorio = handle(async () => { throw httpError(404,'No hay recordatorios configurados en la base real.') })
