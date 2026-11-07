import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'
import { getPresence, isOnline } from '../config/sessions.js'

export function activityType(text) {
  const value = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/riego|regar|rego/.test(value)) return 'riego'
  if (/abon|compost|fertiliz/.test(value)) return 'abono'
  if (/cosech/.test(value)) return 'cosecha'
  if (/siembr|sembr/.test(value)) return 'siembra'
  return 'otro'
}

function memberResponse(user, presence) {
  const lastSeen = presence.get(Number(user.id)) ?? user.lastSeen ?? null
  return {
    id: user.id,
    usuario: user.usuario,
    nombre: user.nombre,
    rolGremio: user.rolGremio,
    nivelGremio: user.nivelGremio ?? user.rango,
    puntos: user.puntos ?? 0,
    avatar: user.avatar ?? '',
    lastSeen,
    enLinea: (presence.has(Number(user.id)) || user.enLinea === true) && isOnline(lastSeen),
  }
}

export async function getGremios(req, res) {
  try {
    if (isDbConnected()) {
      try {
        const sql = `
          SELECT g.ID_gremio AS id,
                 LPAD(g.ID_gremio::text, 6, '0') AS codigo,
                 g.Nombre_Gremio AS nombre,
                 g.Area_total AS "areaTotal",
                 g.Puntos_Gremio AS puntos,
                 g.Ubicacion_Geografica AS direccion,
                 COUNT(mg.ID_usuario) AS "miembrosCount"
          FROM Gremio g
          LEFT JOIN Miembro_Gremio mg ON g.ID_gremio = mg.ID_gremio
          GROUP BY g.ID_gremio
          ORDER BY g.Puntos_Gremio DESC
        `
        const { rows } = await query(sql)
        if (rows.length > 0) {
          return res.json(rows)
        }
      } catch (err) {
        console.warn('[Gremios] Fallback a datos locales:', err.message)
      }
    }
    return res.json(mockData.gremios)
  } catch (error) {
    console.error('[Gremios.getGremios]', error)
    return res.status(500).json({ error: 'Error al obtener gremios.' })
  }
}

export async function getGremioById(req, res) {
  try {
    const id = Number(req.params.id)
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de gremio inválido.' })
    res.set('Cache-Control', 'no-store')
    if (isDbConnected()) {
      const { rows } = await query(`
        SELECT g.ID_gremio AS id, g.Nombre_Gremio AS nombre,
               g.Area_total AS "areaTotal", g.Puntos_Gremio AS puntos,
               g.Creado_En AS "creadoEn"
        FROM Gremio g WHERE g.ID_gremio = $1`, [id])
      if (!rows.length) return res.status(404).json({ error: 'Gremio no encontrado.' })
      const membersResult = await query(`
        SELECT u.ID_usuario AS id,
               COALESCE(to_jsonb(ug)->>'nombre_usuario', to_jsonb(u)->>'nombre_usuario') AS usuario,
               COALESCE(NULLIF(TRIM(CONCAT(
                 COALESCE(to_jsonb(u)->>'nombres', to_jsonb(u)->>'nombre'), ' ',
                 COALESCE(to_jsonb(u)->>'apellidos', to_jsonb(u)->>'apellido'))), ''),
                 to_jsonb(u)->>'nombre_usuario', to_jsonb(ug)->>'nombre_usuario') AS nombre,
               ug.Puntos AS puntos, mg.Rol AS "rolGremio"
        FROM Miembro_Gremio mg
        JOIN Usuario u ON u.ID_usuario = mg.ID_usuario
        JOIN Usuario_General ug ON ug.ID_usuario = u.ID_usuario
        WHERE mg.ID_gremio = $1 ORDER BY ug.Puntos DESC, u.ID_usuario`, [id])
      const activitiesResult = await query(`
        SELECT CONCAT(au.ID_Actividad, '-', au.ID_usuario) AS id,
               COALESCE(NULLIF(TRIM(CONCAT(
                 COALESCE(to_jsonb(u)->>'nombres', to_jsonb(u)->>'nombre'), ' ',
                 COALESCE(to_jsonb(u)->>'apellidos', to_jsonb(u)->>'apellido'))), ''),
                 to_jsonb(u)->>'nombre_usuario', to_jsonb(ug)->>'nombre_usuario') AS jugador,
               a.Actividad AS texto, au.Fecha_Cumplimiento AS fecha
        FROM Actividades_Usuario au
        JOIN Actividades a ON a.ID_Actividad = au.ID_Actividad
        JOIN Usuario u ON u.ID_usuario = au.ID_usuario
        JOIN Usuario_General ug ON ug.ID_usuario = u.ID_usuario
        JOIN Miembro_Gremio mg ON mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = $1
        LEFT JOIN Huerto h ON h.ID_Huerto = au.ID_Huerto
        WHERE au.Cumplimiento = TRUE AND au.Fecha_Cumplimiento IS NOT NULL
          AND au.Fecha_Cumplimiento >= mg.Fecha_ingreso
          AND (h.ID_gremio = $1 OR au.ID_Huerto IS NULL)
        ORDER BY au.Fecha_Cumplimiento DESC, au.ID_Actividad DESC, au.ID_usuario
        LIMIT 100`, [id])
      const presence = await getPresence(req.sessionStore, 'postgres')
      return res.json({
        ...rows[0], fuente: 'postgres',
        miembros: membersResult.rows.map((u) => memberResponse(u, presence)),
        actividades: activitiesResult.rows.map((a) => ({ ...a, tipo: activityType(a.texto) })),
      })
    }
    const gremio = mockData.gremios.find((g) => g.id === id)
    if (!gremio) {
      return res.status(404).json({ error: 'Gremio no encontrado.' })
    }

    const presence = await getPresence(req.sessionStore, 'mock')
    const miembros = mockData.usuarios.filter((u) => u.gremioId === id).map((u) => memberResponse(u, presence))
    const huerto = mockData.huertos.find((h) => h.gremioId === id)

    return res.json({
      ...gremio,
      fuente: 'mock',
      miembros,
      actividades: mockData.actividades.filter((a) => a.gremioId === id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
      huerto,
    })
  } catch (error) {
    console.error('[Gremios.getGremioById]', error)
    return res.status(503).json({ error: 'No se pudo cargar el gremio. Inténtalo de nuevo.' })
  }
}

export async function crearGremio(req, res) {
  try {
    const { nombre, area, suelo, riego, lat, lng } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del gremio es requerido.' })
    }

    const latitud = parseFloat(lat) || -1.2417
    const longitud = parseFloat(lng) || -78.6295
    const areaTotal = parseFloat(area) || 300.0

    if (isDbConnected()) {
      try {
        const insertGremio = `
          INSERT INTO Gremio (Nombre_Gremio, Area_total, Puntos_Gremio, Ubicacion_Geografica)
          VALUES ($1, $2, 0, $3)
          RETURNING ID_gremio
        `
        const dir = `Tungurahua (Lat: ${latitud.toFixed(4)}, Lng: ${longitud.toFixed(4)})`
        const { rows } = await query(insertGremio, [nombre, areaTotal, dir])
        const nuevoGremioId = rows[0].id_gremio

        // Crear Huerto inicial
        const insertHuerto = `
          INSERT INTO Huerto (ID_gremio, ID_Cerca, ID_SubCerca, ID_Abono, ID_Suelo, ID_Riego, ID_Diseño, ID_SubDiseño)
          VALUES ($1, 1, 1, 4, 3, 1, 1, 1)
          RETURNING ID_Huerto
        `
        await query(insertHuerto, [nuevoGremioId])

        return res.status(201).json({
          mensaje: 'Gremio y huerto creados exitosamente en PostgreSQL',
          gremio: {
            id: nuevoGremioId,
            codigo: String(nuevoGremioId).padStart(6, '0'),
            nombre,
            areaTotal,
            ubicacion: { lat: latitud, lng: longitud },
          },
        })
      } catch (err) {
        console.warn('[Gremios.crearGremio] Error en BD, guardando en memoria:', err.message)
      }
    }

    // Fallback local
    const nuevoId = mockData.gremios.length + 1
    const nuevoGremio = {
      id: nuevoId,
      codigo: String(nuevoId).padStart(6, '0'),
      nombre,
      areaTotal,
      puntos: 0,
      ubicacion: { lat: latitud, lng: longitud },
      direccion: `Tungurahua (Lat: ${latitud.toFixed(4)}, Lng: ${longitud.toFixed(4)})`,
      miembrosCount: 1,
    }
    mockData.gremios.push(nuevoGremio)

    // Crear huerto en mockStore
    mockData.huertos.push({
      id: nuevoId,
      gremioId: nuevoId,
      tipo: 'campo',
      ubicacion: { lat: latitud, lng: longitud },
      cultivos: [],
    })

    return res.status(201).json({
      mensaje: 'Gremio creado exitosamente',
      gremio: nuevoGremio,
    })
  } catch (error) {
    console.error('[Gremios.crearGremio]', error)
    return res.status(500).json({ error: 'Error al crear el gremio.' })
  }
}

export async function unirseGremio(req, res) {
  try {
    const { codigo, usuarioId } = req.body

    if (!codigo) {
      return res.status(400).json({ error: 'El código de 6 dígitos es requerido.' })
    }

    // Normalizar código
    const codigoNormalizado = String(codigo).padStart(6, '0')
    const gremio = mockData.gremios.find((g) => g.codigo === codigoNormalizado)

    if (!gremio) {
      return res.status(404).json({ error: 'No se encontró ningún gremio con ese código.' })
    }

    return res.json({
      mensaje: `Te has unido exitosamente al gremio: ${gremio.nombre}`,
      gremio,
    })
  } catch (error) {
    console.error('[Gremios.unirseGremio]', error)
    return res.status(500).json({ error: 'Error al unirse al gremio.' })
  }
}
