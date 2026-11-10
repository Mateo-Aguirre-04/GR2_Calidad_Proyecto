import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { query, transaction } from '../config/db.js'
import { presenceConfig } from '../config/presence.js'
import { requireUser, requireMember, cropResponse, growthDays, httpError, sendError } from '../data/postgres.js'
import { canEditGuildProfile, updateGuildProfile } from '../data/guildProfile.js'
import { createGuildRecords } from '../data/guildCreation.js'
import { isValidBirthDate } from '../data/registration.js'
import { distribucionHuerto, tipoDesdeImagen } from '../data/parcelas.js'
import { plantaDisponibleEnCatalogo } from '../data/catalogoMedicinal.js'
import { guildRankingHandler } from '../data/guildRanking.js'

const handle = (operation) => async (req, res) => {
  try { await operation(req, res) } catch (error) { sendError(res, error) }
}
const guildFields = `g.id_gremio AS id, g.nombre_gremio AS nombre, g.area_total AS "areaTotal",
  g.puntos_gremio AS puntos, g.latitud, g.longitud, g.created_at AS "creadoEn"`
const guildResponse = (g) => ({ ...g, id: Number(g.id), ubicacion: { lat: Number(g.latitud), lng: Number(g.longitud) } })

export const getGremios = guildRankingHandler({query})

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
  const guild = await query(`SELECT ${guildFields}, g.descripcion, g.anuncios, m.rol AS "miRol" FROM gremio g JOIN miembro_gremio m USING(id_gremio)
    WHERE g.id_gremio=$1 AND m.id_usuario=$2`, [id, userId])
  if (!guild.rows.length) throw httpError(403, 'No perteneces a este gremio.')
  const members = await query(`SELECT u.id_usuario AS id, concat_ws(' ',u.nombres,u.apellidos) AS nombre,
    ug.nombre_usuario AS usuario, ug.puntos, m.rol AS "rolGremio", ug.last_seen AS "lastSeen",
    COALESCE(ug.last_seen > CURRENT_TIMESTAMP - ($2 * interval '1 millisecond'), FALSE) AS "enLinea"
    FROM miembro_gremio m JOIN usuario u USING(id_usuario) JOIN usuario_general ug USING(id_usuario)
    WHERE m.id_gremio=$1 ORDER BY ug.puntos DESC,u.id_usuario`, [id, presenceConfig.onlineWindowMs])
  const gardens = await query('SELECT id_huerto AS id FROM huerto WHERE id_gremio=$1 ORDER BY id_huerto LIMIT 1', [id])
  const token = await query('SELECT codigo FROM invitacion_gremio WHERE id_gremio=$1 AND expira_en>now() ORDER BY expira_en DESC LIMIT 1', [id])
  res.set('Cache-Control', 'no-store').json({
    ...guildResponse(guild.rows[0]), puedeEditar: canEditGuildProfile(guild.rows[0].miRol), fuente: 'postgres', huerto: gardens.rows[0] || null, codigo: token.rows[0]?.codigo || null,
    miembros: members.rows.map((u) => ({ ...u, id: Number(u.id), puntos: Number(u.puntos) })),
  })
})

export const guardarPerfilGremio = handle(async (req, res) => {
  const userId = requireUser(req)
  const profile = await transaction((db) => updateGuildProfile(db, userId, req.params.id, req.body))
  res.json(profile)
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
  const result = await transaction((db) => createGuildRecords(db, userId, req.body))
  res.status(201).json({ mensaje:'Gremio creado.', gremio:result })
})

export const registro = handle(async (req, res) => {
  const { nombre, apellido, usuario, contrasena, genero, descripcion = '' } = req.body
  if (![nombre,apellido,usuario,contrasena].every((v) => typeof v === 'string' && v.trim()) || contrasena.length<8) throw httpError(400, 'Completa los datos y usa una contraseña de al menos 8 caracteres.')
  if (!['M','F','NB','O'].includes(genero)) throw httpError(400, 'Género inválido.')
  if (!isValidBirthDate(req.body.fechaNacimiento)) throw httpError(400,'Ingresa una fecha de nacimiento válida.')
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
const plantResponse = (p) => ({
  id: Number(p.id_planta),
  nombre: p.nombre_comun,
  nombreCientifico: p.nombre_cientifico,
  tipo: p.tipo,
  region: p.region || 'Sierra',
  ciclo: p.ciclo_cultivo,
  diasCrecimiento: growthDays(p.ciclo_cultivo),
  resumen: p.descripcion || p.ciclo_cultivo,
  cuidados: p.cuidados || {},
  imagen: p.imagen || '',
  imagenMuerta: p.imagen_muerta || '',
  fases: p.fases || []
})
export const getPlantas = handle(async (req,res) => res.json((await query(`${plantSQL} ORDER BY p.id_planta`)).rows.filter(plantaDisponibleEnCatalogo).map(plantResponse)))
export const getPlanta = handle(async (req,res) => {
  const { rows } = await query(`${plantSQL} WHERE p.id_planta=$1`,[req.params.id])
  if (!plantaDisponibleEnCatalogo(rows[0])) throw httpError(404,'Planta no disponible en el catálogo medicinal.')
  res.json(plantResponse(rows[0]))
})

export const getHuerto = handle(async (req,res) => {
  const userId=requireUser(req)
  const id=Number(req.params.id)
  await requireMember({query},userId,id)
  const gardens=await query(`SELECT h.*,g.latitud,g.longitud,g.nombre_gremio,g.area_total,sd.imagen,sd.num_parcelas
    FROM huerto h JOIN gremio g USING(id_gremio)
    JOIN subdiseño_huerto sd ON sd.id_diseño=h.id_diseño AND sd.id_subdiseño=h.id_subdiseño
    WHERE h.id_huerto=$1`,[id])
  const h=gardens.rows[0]
  if (!h) throw httpError(404,'Huerto no encontrado.')
  const crops=await query(`SELECT hp.*,hp.fecha_siembra::text AS fecha_exacta,p.nombre_comun,p.nombre_cientifico,p.ciclo_cultivo,p.fases,p.imagen,p.imagen_muerta
    FROM huerto_planta hp JOIN planta p USING(id_planta)
    WHERE hp.id_huerto=$1 ORDER BY hp.fecha_siembra`,[id])
  const tipo=tipoDesdeImagen(h.imagen)
  res.json({ id:Number(h.id_huerto),gremioId:Number(h.id_gremio),nombre:h.nombre_gremio,
    tipo,
    ubicacion:{lat:Number(h.latitud),lng:Number(h.longitud)},
    areaTotal:Number(h.area_total),
    parcelas:distribucionHuerto(h.area_total,tipo,h.num_parcelas),
    cultivos:crops.rows.map(cropResponse) })
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
