import crypto from 'crypto'
import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'

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
    const id = parseInt(req.params.id, 10)
    const gremio = mockData.gremios.find((g) => g.id === id)
    if (!gremio) {
      return res.status(404).json({ error: 'Gremio no encontrado.' })
    }

    const miembros = mockData.usuarios.filter((u) => u.gremioId === id)
    const huerto = mockData.huertos.find((h) => h.gremioId === id)

    return res.json({
      ...gremio,
      miembros,
      huerto,
    })
  } catch (error) {
    console.error('[Gremios.getGremioById]', error)
    return res.status(500).json({ error: 'Error al obtener gremio.' })
  }
}

export async function crearGremio(req, res) {
  try {
    const { nombre, area, suelo, riego, lat, lng, usuarioId } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del gremio es requerido.' })
    }

    const latitud = parseFloat(lat) || -1.2417
    const longitud = parseFloat(lng) || -78.6295
    const areaTotal = parseFloat(area) || 300.0

    if (isDbConnected()) {
      try {
        const insertGremio = `
          INSERT INTO Gremio (Nombre_Gremio, Area_total, Puntos_Gremio, Latitud, Longitud)
          VALUES ($1, $2, 0, $3, $4)
          RETURNING ID_gremio
        `
        const { rows } = await query(insertGremio, [nombre, areaTotal, latitud, longitud])
        const nuevoGremioId = rows[0].id_gremio

        // Crear Huerto inicial
        const insertHuerto = `
          INSERT INTO Huerto (ID_gremio, ID_Cerca, ID_SubCerca, ID_Abono, ID_Suelo, ID_Riego, ID_Diseño, ID_SubDiseño)
          VALUES ($1, 1, 1, 4, 3, 1, 1, 1)
          RETURNING ID_Huerto
        `
        const huertoRes = await query(insertHuerto, [nuevoGremioId])
        const nuevoHuertoId = huertoRes.rows[0]?.id_huerto

        // Si viene usuarioId, vincularlo como Fundador en Miembro_Gremio
        if (usuarioId) {
          const uid = parseInt(usuarioId, 10)
          const insertMiembro = `
            INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Rol)
            VALUES ($1, $2, 'Fundador')
            ON CONFLICT (ID_usuario, ID_gremio) DO NOTHING
          `
          await query(insertMiembro, [uid, nuevoGremioId])
        }

        return res.status(201).json({
          mensaje: 'Gremio y huerto creados exitosamente en PostgreSQL',
          gremio: {
            id: nuevoGremioId,
            codigo: String(nuevoGremioId).padStart(6, '0'),
            nombre,
            areaTotal,
            ubicacion: { lat: latitud, lng: longitud },
            huertoId: nuevoHuertoId,
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

    if (usuarioId) {
      const uid = parseInt(usuarioId, 10)
      const u = mockData.usuarios.find((usr) => usr.id === uid)
      if (u) {
        u.gremioId = nuevoId
        u.gremioNombre = nombre
        u.rolGremio = 'Fundador'
      }
    }

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
