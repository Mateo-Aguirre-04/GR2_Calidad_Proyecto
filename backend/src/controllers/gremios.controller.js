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
