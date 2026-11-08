import crypto from 'crypto'
import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'
import { getPresence, isOnline } from '../config/sessions.js'

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
                 g.latitud,
                 g.longitud,
                 CONCAT('Tungurahua (Lat: ', g.latitud, ', Lng: ', g.longitud, ')') AS direccion,
                 COUNT(mg.ID_usuario) AS "miembrosCount"
          FROM Gremio g
          LEFT JOIN Miembro_Gremio mg ON g.ID_gremio = mg.ID_gremio
          GROUP BY g.ID_gremio, g.Nombre_Gremio, g.Area_total, g.Puntos_Gremio, g.latitud, g.longitud
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
      const presence = await getPresence(req.sessionStore, 'postgres')
      return res.json({
        ...rows[0], fuente: 'postgres',
        miembros: membersResult.rows.map((u) => memberResponse(u, presence)),
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
      huerto,
    })
  } catch (error) {
    console.error('[Gremios.getGremioById]', error)
    return res.status(503).json({ error: 'No se pudo cargar el gremio. Inténtalo de nuevo.' })
  }
}

export async function crearGremio(req, res) {
  try {
    if (req.session?.source !== 'mock' || !req.session.usuarioId) {
      return res.status(401).json({ error: 'Tu sesión terminó. Inicia sesión nuevamente.' })
    }

    const user = mockData.usuarios.find((item) => item.id === Number(req.session.usuarioId))
    if (!user) return res.status(404).json({ error: 'No se encontró el usuario de la sesión.' })
    if (user.gremioId) return res.status(409).json({ error: 'Ya perteneces a un gremio.' })

    const { nombre, area, suelo, riego, lat, lng, descripcion } = req.body
    const areaTotal = Number(area)
    const latitud = Number(lat)
    const longitud = Number(lng)
    const descripcionLimpia = typeof descripcion === 'string' ? descripcion.trim() : ''
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150 || !Number.isFinite(areaTotal) || areaTotal <= 0) {
      return res.status(400).json({ error: 'Nombre y área positiva son obligatorios.' })
    }
    const validCoordinate = (value) => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
      && Number.isFinite(Number(value))
    if (!validCoordinate(lat) || !validCoordinate(lng) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
      return res.status(400).json({ error: 'Coordenadas inválidas.' })
    }
    if (!descripcionLimpia || descripcionLimpia.length > 120) {
      return res.status(400).json({ error: 'La descripción debe contener texto y tener hasta 120 caracteres.' })
    }
    if (!['Arcilloso', 'Arenoso', 'Franco', 'Calcáreo'].includes(suelo)
      || !['Goteo', 'Aspersión', 'Manual', 'Surcos'].includes(riego)) {
      return res.status(400).json({ error: 'Selecciona un tipo de suelo y riego válido.' })
    }

    const id = Math.max(0, ...mockData.gremios.map((item) => Number(item.id))) + 1
    const huertoId = Math.max(0, ...mockData.huertos.map((item) => Number(item.id))) + 1
    const codigo = String(crypto.randomInt(100000, 1000000))
    const nuevoGremio = {
      id,
      codigo,
      nombre: nombre.trim(),
      descripcion: descripcionLimpia,
      anuncios: '',
      areaTotal,
      puntos: 0,
      ubicacion: { lat: latitud, lng: longitud },
      direccion: req.body.direccion || 'Ecuador',
      suelo,
      riego,
      miembrosCount: 1,
    }
    const nuevoHuerto = {
      id: huertoId,
      gremioId: id,
      tipo: 'campo',
      ubicacion: { lat: latitud, lng: longitud },
      cultivos: [],
    }

    mockData.gremios.push(nuevoGremio)
    mockData.huertos.push(nuevoHuerto)
    mockData.invitaciones.push({
      codigo,
      idGremio: id,
      creadoPor: user.id,
      expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      usos: 0,
    })
    user.gremioId = id
    user.gremioNombre = nuevoGremio.nombre
    user.rolGremio = 'Fundador'
    user.huertoId = huertoId

    return res.status(201).json({
      mensaje: 'Gremio creado exitosamente',
      gremio: { ...nuevoGremio, huerto: { id: huertoId } },
    })
  } catch (error) {
    console.error('[Gremios.crearGremio]', error)
    return res.status(500).json({ error: 'Error al crear el gremio.' })
  }
}

export async function crearInvitacion(req, res) {
  try {
    const idGremio = parseInt(req.params.id, 10)
    const { creadoPor } = req.body || {}

    if (!idGremio) {
      return res.status(400).json({ error: 'El ID de gremio es requerido.' })
    }

    // Código aleatorio de 6 dígitos con crypto (100000 - 999999)
    const codigo = String(crypto.randomInt(100000, 1000000))
    // Expira en 24 horas
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)

    if (isDbConnected()) {
      try {
        const sql = `
          INSERT INTO invitacion_gremio (codigo, id_gremio, creado_por, expira_en, usos)
          VALUES ($1, $2, $3, $4, 0)
          RETURNING codigo, id_gremio AS "idGremio", expira_en AS "expiraEn"
        `
        const { rows } = await query(sql, [codigo, idGremio, creadoPor || null, expiraEn])
        if (rows.length > 0) {
          return res.status(201).json({
            mensaje: 'Invitación creada exitosamente',
            invitacion: rows[0],
          })
        }
      } catch (err) {
        console.warn('[Gremios.crearInvitacion] Error en BD, guardando en memoria:', err.message)
      }
    }

    // Fallback local en memoria
    const invitacion = {
      codigo,
      idGremio,
      creadoPor: creadoPor || null,
      expiraEn: expiraEn.toISOString(),
      usos: 0,
    }
    if (!mockData.invitaciones) {
      mockData.invitaciones = []
    }
    mockData.invitaciones.push(invitacion)

    return res.status(201).json({
      mensaje: 'Invitación creada exitosamente',
      invitacion,
    })
  } catch (error) {
    console.error('[Gremios.crearInvitacion]', error)
    return res.status(500).json({ error: 'Error al generar la invitación.' })
  }
}

export async function unirseGremio(req, res) {
  try {
    const { codigo, usuarioId } = req.body

    if (!codigo) {
      return res.status(400).json({ error: 'El código de 6 dígitos es requerido.' })
    }

    const codigoLimpio = String(codigo).trim()
    const codigoNormalizado = codigoLimpio.padStart(6, '0')

    if (isDbConnected()) {
      try {
        // 1. Buscar si coincide con una invitación temporal
        const sqlInv = `
          SELECT ig.codigo, ig.id_gremio, ig.expira_en, ig.usos,
                 g.nombre_gremio AS nombre, g.area_total AS "areaTotal",
                 g.puntos_gremio AS puntos, g.latitud, g.longitud,
                 CONCAT('Tungurahua (Lat: ', g.latitud, ', Lng: ', g.longitud, ')') AS direccion
          FROM invitacion_gremio ig
          JOIN gremio g ON g.id_gremio = ig.id_gremio
          WHERE ig.codigo = $1
        `
        const resInv = await query(sqlInv, [codigoLimpio])

        let gremioEncontrado = null
        let esInvitacion = false

        if (resInv.rows.length > 0) {
          const inv = resInv.rows[0]
          // Validar si ha expirado
          if (new Date(inv.expira_en).getTime() < Date.now()) {
            return res.status(400).json({ error: 'El código de invitación ha expirado.' })
          }
          gremioEncontrado = {
            id: Number(inv.id_gremio),
            nombre: inv.nombre,
            areaTotal: Number(inv.areaTotal),
            puntos: Number(inv.puntos),
            direccion: inv.direccion,
          }
          esInvitacion = true
        } else {
          // 2. Compatibilidad con código fijo del gremio (ej: '000001' o ID numérico)
          const sqlGremio = `
            SELECT id_gremio AS id, nombre_gremio AS nombre, area_total AS "areaTotal",
                   puntos_gremio AS puntos, latitud, longitud,
                   CONCAT('Tungurahua (Lat: ', latitud, ', Lng: ', longitud, ')') AS direccion
            FROM gremio
            WHERE LPAD(id_gremio::text, 6, '0') = $1 OR id_gremio::text = $1
          `
          const resGremio = await query(sqlGremio, [codigoNormalizado])
          if (resGremio.rows.length > 0) {
            const g = resGremio.rows[0]
            gremioEncontrado = {
              id: Number(g.id),
              nombre: g.nombre,
              areaTotal: Number(g.areaTotal),
              puntos: Number(g.puntos),
              direccion: g.direccion,
            }
          }
        }

        if (gremioEncontrado) {
          // Si fue invitación, incrementar usos
          if (esInvitacion) {
            await query('UPDATE invitacion_gremio SET usos = usos + 1 WHERE codigo = $1', [codigoLimpio])
          }

          // Si vino usuarioId, registrar membresía en miembro_gremio
          if (usuarioId) {
            const uid = parseInt(usuarioId, 10)
            const insertMiembro = `
              INSERT INTO miembro_gremio (id_usuario, id_gremio, rol)
              VALUES ($1, $2, 'Miembro')
              ON CONFLICT (id_usuario, id_gremio) DO NOTHING
            `
            await query(insertMiembro, [uid, gremioEncontrado.id])
          }

          return res.json({
            mensaje: `Te has unido exitosamente al gremio: ${gremioEncontrado.nombre}`,
            gremio: gremioEncontrado,
          })
        }
      } catch (err) {
        console.warn('[Gremios.unirseGremio] Error en BD, verificando en memoria:', err.message)
      }
    }

    // Modo Fallback en memoria
    if (!mockData.invitaciones) {
      mockData.invitaciones = []
    }

    const invMock = mockData.invitaciones.find((i) => i.codigo === codigoLimpio)
    let gremioMock = null

    if (invMock) {
      if (new Date(invMock.expiraEn).getTime() < Date.now()) {
        return res.status(400).json({ error: 'El código de invitación ha expirado.' })
      }
      gremioMock = mockData.gremios.find((g) => g.id === invMock.idGremio)
      invMock.usos = (invMock.usos || 0) + 1
    } else {
      gremioMock = mockData.gremios.find(
        (g) => g.codigo === codigoNormalizado || String(g.id) === codigoLimpio
      )
    }

    if (!gremioMock) {
      return res.status(404).json({ error: 'No se encontró ningún gremio con ese código o invitación.' })
    }

    if (usuarioId) {
      const uid = parseInt(usuarioId, 10)
      const usuario = mockData.usuarios.find((u) => u.id === uid)
      if (usuario) {
        usuario.gremioId = gremioMock.id
        usuario.gremioNombre = gremioMock.nombre
        usuario.rolGremio = usuario.rolGremio || 'Miembro'
      }
    }

    gremioMock.miembrosCount = (gremioMock.miembrosCount || 1) + 1

    return res.json({
      mensaje: `Te has unido exitosamente al gremio: ${gremioMock.nombre}`,
      gremio: gremioMock,
    })
  } catch (error) {
    console.error('[Gremios.unirseGremio]', error)
    return res.status(500).json({ error: 'Error al unirse al gremio.' })
  }
}
