import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { query, transaction, isDbConnected } from '../config/db.js'
import { presenceConfig } from '../config/presence.js'
import { requireUser, requireMember, cropResponse, growthDays, httpError, sendError } from '../data/postgres.js'
import { canEditGuildProfile, updateGuildProfile } from '../data/guildProfile.js'
import { createGuildRecords } from '../data/guildCreation.js'
import { isValidBirthDate } from '../data/registration.js'
import { daysUntilLunarAge, lunarPhase } from '../data/lunarCalendar.js'

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

export const getConfiguracionDemo = (req, res) => {
  if (req.session?.source !== 'mock' || !req.session.usuarioId) {
    return res.status(401).json({ error: 'Tu sesión terminó. Inicia sesión nuevamente.' })
  }
  res.json({
    suelos: ['Arcilloso', 'Arenoso', 'Franco', 'Calcáreo'],
    riegos: ['Goteo', 'Aspersión', 'Manual', 'Surcos'],
  })
}

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
  const crops=await query(`SELECT hp.*,hp.fecha_siembra::text AS fecha_exacta,p.nombre_comun,p.ciclo_cultivo,p.fases,p.imagen_muerta FROM huerto_planta hp JOIN planta p USING(id_planta)
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

const EVENT_TYPES = new Set(['riego','retirar_maleza','preparar_tierra','cosecha_sombra','almacenar_cosecha','abono','limpiar_huerto','colocar_senaletica'])
const DAY_MS = 86_400_000

async function weatherAt(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), timezone: 'auto', forecast_days: '2',
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
    hourly: 'relative_humidity_2m,precipitation,weather_code,temperature_2m',
  }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`)
  return response.json()
}

function reminder({ id, tipo, texto, fuente, huertoId, plantaId = null, accion, venceEn = null }) {
  return { id, tipo, texto, fuente, huertoId, plantaId, accion, venceEn }
}

export const getRecordatorios = handle(async (req, res) => {
  const userId = requireUser(req)
  const now = new Date()
  const gardens = await query(`SELECT h.id_huerto AS id, g.latitud, g.longitud
    FROM huerto h JOIN gremio g USING(id_gremio)
    JOIN miembro_gremio m USING(id_gremio)
    WHERE m.id_usuario=$1 ORDER BY h.id_huerto`, [userId])
  const result = []
  const fuentes = { luna: 'estimación astronómica', clima: 'no disponible', eventos: 'base de datos' }

  const fullMoon = daysUntilLunarAge(14.765, now)
  const firstQuarter = daysUntilLunarAge(7.382, now)
  const nextSowingPhase = Math.min(fullMoon, firstQuarter)
  if (nextSowingPhase >= 1.5 && nextSowingPhase < 2.5) {
    result.push(reminder({ id: 'luna-siembra', tipo: 'siembra', texto: 'En dos días habrá cuarto creciente o luna llena. Prepara la siembra.', fuente: 'Calendario lunar calculado en el backend', venceEn: new Date(now.getTime() + nextSowingPhase * DAY_MS).toISOString() }))
  }

  const phase = lunarPhase(now)
  if (['creciente','cuarto_creciente','gibosa_creciente','llena'].includes(phase)) {
    result.push(reminder({ id: 'luna-cosecha-hojas', tipo: 'cosecha', texto: 'La luna está creciente o llena. Si tus hojas, flores o frutos ya maduraron, puedes cosecharlos.', fuente: `Calendario lunar calculado en el backend (${phase})` }))
  }
  if (phase === 'cuarto_menguante') {
    result.push(reminder({ id: 'luna-cosecha-raices', tipo: 'cosecha', texto: 'Es cuarto menguante. Si tus raíces o semillas ya maduraron, puedes cosecharlas.', fuente: 'Calendario lunar calculado en el backend' }))
  }

  const latestUser = await query('SELECT last_seen FROM usuario_general WHERE id_usuario=$1', [userId])
  const lastSeen = latestUser.rows[0]?.last_seen ? new Date(latestUser.rows[0].last_seen) : null
  const inactive = lastSeen && now - lastSeen >= 3 * DAY_MS

  for (const garden of gardens.rows) {
    const huertoId = Number(garden.id)
    const crops = await query(`SELECT hp.id_planta, hp.fecha_siembra, hp.id_estado,
        p.nombre_comun, p.ciclo_cultivo,
        (SELECT max(e.registrado_en) FROM huerto_evento e WHERE e.id_huerto=hp.id_huerto AND e.id_planta=hp.id_planta AND e.fecha_siembra=hp.fecha_siembra AND e.tipo='riego') AS ultimo_riego,
        (SELECT max(e.registrado_en) FROM huerto_evento e WHERE e.id_huerto=hp.id_huerto AND e.id_planta=hp.id_planta AND e.fecha_siembra=hp.fecha_siembra AND e.tipo='abono') AS ultimo_abono
      FROM huerto_planta hp JOIN planta p USING(id_planta)
      WHERE hp.id_huerto=$1`, [huertoId])
    const events = await query(`SELECT tipo, id_planta, fecha_siembra, max(registrado_en) AS fecha
      FROM huerto_evento WHERE id_huerto=$1 GROUP BY tipo,id_planta,fecha_siembra`, [huertoId])
    const eventDate = (type, plantId = null, sowingDate = null) => events.rows.find((e) => e.tipo === type
      && (e.id_planta == null ? plantId == null : Number(e.id_planta) === plantId)
      && (e.fecha_siembra == null ? sowingDate == null : String(e.fecha_siembra).slice(0,10) === String(sowingDate).slice(0,10)))?.fecha

    for (const crop of crops.rows) {
      const plantId = Number(crop.id_planta)
      const fechaSiembra = String(crop.fecha_siembra).slice(0, 10)
      const harvested = Number(crop.id_estado) === Number(process.env.HARVEST_STATE_ID || 6)
      if (harvested) {
        if (!eventDate('cosecha_sombra', plantId, fechaSiembra)) {
          result.push(reminder({ id: `sombra-${huertoId}-${plantId}-${fechaSiembra}`, tipo: 'almacenar', huertoId, plantaId, fechaSiembra, texto: `Si ya pusiste la cosecha de ${crop.nombre_comun} a la sombra, registra el inicio del secado para calcular los diez días.`, fuente: 'Cosecha registrada en el huerto', accion: 'cosecha_sombra' }))
        }
        continue
      }
      const ageHours = crop.ultimo_riego ? (now - new Date(crop.ultimo_riego)) / 3_600_000 : Infinity
      const mature = (now - new Date(crop.fecha_siembra)) / DAY_MS >= growthDays(crop.ciclo_cultivo)
      if (crop.ultimo_riego && ageHours >= 48 && mature) {
        result.push(reminder({ id: `riego-cosecha-${huertoId}-${plantId}-${fechaSiembra}`, tipo: 'cosecha', huertoId, plantaId, fechaSiembra, texto: `Han pasado más de 48 horas desde el último riego de ${crop.nombre_comun}; el ciclo estimado ya se cumplió. Revisa su madurez antes de cosechar.`, fuente: 'Registro de riego y ciclo de cultivo del catálogo' }))
      }
      const daysSincePlanting = (now - new Date(crop.fecha_siembra)) / DAY_MS
      const daysSinceFertilizing = crop.ultimo_abono ? (now - new Date(crop.ultimo_abono)) / DAY_MS : daysSincePlanting
      if (daysSinceFertilizing >= 30) {
        result.push(reminder({ id: `abono-${huertoId}-${plantId}-${fechaSiembra}`, tipo: 'abono', huertoId, plantaId, fechaSiembra, texto: `${crop.nombre_comun} lleva al menos 30 días en el huerto sin un abono registrado. Revisa si necesita compost.`, fuente: 'Fecha de siembra y registro de abono (sin medición de nutrientes)', accion: 'abono' }))
      }
    }
    const weeds = eventDate('retirar_maleza')
    const prepared = eventDate('preparar_tierra')
    if (weeds && (!prepared || new Date(weeds) > new Date(prepared))) {
      result.push(reminder({ id: `preparar-tierra-${huertoId}`, tipo: 'preparar_tierra', huertoId, texto: 'Registraste el retiro de maleza y aún no la preparación de la tierra. La parcela está lista para preparar.', fuente: 'Secuencia de labores guardada en el huerto', accion: 'preparar_tierra' }))
    }
    const shade = events.rows.filter((e) => e.tipo === 'cosecha_sombra' && e.fecha)
    for (const harvest of shade) {
      const stored = events.rows.find((e) => e.tipo === 'almacenar_cosecha' && Number(e.id_planta) === Number(harvest.id_planta) && String(e.fecha_siembra).slice(0,10) === String(harvest.fecha_siembra).slice(0,10))
      if (now - new Date(harvest.fecha) >= 10 * DAY_MS && (!stored || new Date(stored.fecha) < new Date(harvest.fecha))) {
        result.push(reminder({ id: `almacenar-${huertoId}-${harvest.id_planta || 0}-${harvest.fecha_siembra}`, tipo: 'almacenar', huertoId, plantaId: harvest.id_planta ? Number(harvest.id_planta) : null, fechaSiembra: String(harvest.fecha_siembra).slice(0,10), texto: 'Han pasado 10 días desde que pusiste la cosecha a la sombra. Ya puedes almacenarla definitivamente.', fuente: 'Fecha registrada al poner la cosecha a secar', accion: 'almacenar_cosecha' }))
      }
    }
    const lastCleaning = eventDate('limpiar_huerto')
    if (inactive && (!lastCleaning || now - new Date(lastCleaning) >= 7 * DAY_MS)) {
      result.push(reminder({ id: `limpieza-${huertoId}`, tipo: 'limpieza', huertoId, texto: 'El huerto no registra actividad desde hace al menos tres días. Date una vuelta para revisar y limpiar el espacio.', fuente: 'Última actividad de la cuenta', accion: 'limpiar_huerto' }))
    }
    if (crops.rows.length >= 5 && !eventDate('colocar_senaletica')) {
      result.push(reminder({ id: `senaletica-${huertoId}`, tipo: 'organizacion', huertoId, texto: 'Tu huerto ya tiene cinco cultivos registrados. Organiza las zonas con señalética.', fuente: 'Progresión actual del huerto', accion: 'colocar_senaletica' }))
    }

    let weather = null
    try {
      weather = await weatherAt(Number(garden.latitud), Number(garden.longitud))
      fuentes.clima = 'Open-Meteo'
    } catch (error) {
      console.warn('[Recordatorios] Clima no disponible:', error.message)
    }
    if (weather?.current) {
      const current = weather.current
      const code = Number(current.weather_code)
      const temp = Number(current.temperature_2m)
      const humidity = Number(current.relative_humidity_2m)
      const localTime = String(current.time || '')
      const hour = Number(localTime.slice(11, 13))
      const phaseIsDark = phase === 'luna_nueva'
      if (code === 0 && temp >= 18 && temp <= 28) {
        result.push(reminder({ id: `clima-cosecha-${huertoId}`, tipo: 'cosecha', huertoId, texto: `El clima actual está soleado y templado (${temp} °C). Revisa qué cultivos están maduros.`, fuente: 'Open-Meteo (condición actual)' }))
      }
      if (hour >= 8 && hour <= 11 && humidity < 70) {
        result.push(reminder({ id: `rocío-${huertoId}`, tipo: 'cosecha', huertoId, texto: `La humedad relativa es ${humidity}% esta mañana; probablemente el rocío ya se secó. Revisa tus cultivos.`, fuente: 'Open-Meteo (humedad relativa; estimación indirecta)' }))
      }
      const lastWeeding = eventDate('retirar_maleza')
      if (code === 0 && phaseIsDark && (!lastWeeding || now - new Date(lastWeeding) >= 7 * DAY_MS)) {
        result.push(reminder({ id: `maleza-${huertoId}`, tipo: 'limpieza', huertoId, texto: 'El pronóstico actual es soleado y la fase lunar calculada es luna nueva. Puedes retirar la maleza.', fuente: 'Open-Meteo y calendario lunar', accion: 'retirar_maleza' }))
      }

      for (const crop of crops.rows) {
        if (Number(crop.id_estado) === Number(process.env.HARVEST_STATE_ID || 6)) continue
        const plantId = Number(crop.id_planta)
        const fechaSiembra = String(crop.fecha_siembra).slice(0, 10)
        const referenciaRiego = crop.ultimo_riego || crop.fecha_siembra
        const ageHours = (now - new Date(referenciaRiego)) / 3_600_000
        const raining = Number(current.precipitation) > 0.5
        if (ageHours >= 24 && !raining) {
          result.push(reminder({ id: `regar-${huertoId}-${plantId}-${fechaSiembra}`, tipo: 'riego', huertoId, plantaId, fechaSiembra, texto: `Han pasado al menos 24 horas desde el último riego registrado o la siembra de ${crop.nombre_comun}. Comprueba la humedad del suelo y riega solo si está seco.`, fuente: 'Registro de riego y precipitación actual; no hay sensor de humedad', accion: 'riego' }))
        }
      }
    }
  }
  res.set('Cache-Control', 'no-store').json({ recordatorios: result, fuentes, generadoEn: now.toISOString() })
})

export const registrarEventoHuerto = handle(async (req, res) => {
  const userId = requireUser(req)
  const huertoId = Number(req.params.id)
  const tipo = String(req.body.tipo || '')
  const plantaId = req.body.plantaId == null ? null : Number(req.body.plantaId)
  const fechaSiembra = req.body.fechaSiembra == null ? null : String(req.body.fechaSiembra)
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaSiembra || '')
    && Number.isFinite(Date.parse(`${fechaSiembra}T00:00:00Z`))
    && new Date(`${fechaSiembra}T00:00:00Z`).toISOString().slice(0, 10) === fechaSiembra
  if (!Number.isSafeInteger(huertoId) || huertoId <= 0 || !EVENT_TYPES.has(tipo)) throw httpError(400, 'Huerto o tipo de actividad inválido.')
  if (['riego','abono','cosecha_sombra','almacenar_cosecha'].includes(tipo) && (!Number.isSafeInteger(plantaId) || plantaId <= 0 || !fechaValida)) throw httpError(400, 'Selecciona un cultivo válido para esta actividad.')
  await transaction(async (db) => {
    await requireMember(db, userId, huertoId)
    if (plantaId != null) {
      const crop = await db.query('SELECT 1 FROM huerto_planta WHERE id_huerto=$1 AND id_planta=$2 AND ($3::date IS NULL OR fecha_siembra=$3::date)', [huertoId, plantaId, fechaSiembra])
      if (!crop.rows.length) throw httpError(404, 'El cultivo no pertenece a este huerto.')
    }
    await db.query('INSERT INTO huerto_evento(id_huerto,id_usuario,id_planta,fecha_siembra,tipo,datos) VALUES($1,$2,$3,$4,$5,$6)', [huertoId,userId,plantaId,fechaSiembra,tipo,JSON.stringify(req.body.datos || {})])
  })
  res.status(201).json({ mensaje: 'Actividad registrada.', tipo, huertoId, plantaId, fechaSiembra })
})
