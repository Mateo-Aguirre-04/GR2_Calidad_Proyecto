import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'

export async function getHuerto(req, res) {
  try {
    const id = parseInt(req.params.id, 10) || 1
    const huerto = mockData.huertos.find((h) => h.id === id) || mockData.huertos[0]

    return res.json(huerto)
  } catch (error) {
    console.error('[Huertos.getHuerto]', error)
    return res.status(500).json({ error: 'Error al obtener el huerto.' })
  }
}

export async function sembrarCultivo(req, res) {
  try {
    const huertoId = parseInt(req.params.id, 10) || 1
    const { plantaId, x, y } = req.body

    const planta = mockData.plantas.find((p) => p.id === parseInt(plantaId, 10)) || mockData.plantas[0]
    const huerto = mockData.huertos.find((h) => h.id === huertoId) || mockData.huertos[0]

    const nuevoCultivo = {
      id: Date.now(),
      plantaId: planta.id,
      planta: {
        nombre: planta.nombre,
        diasCrecimiento: planta.diasCrecimiento || 60,
        imagenes: ['', '', '', ''],
      },
      x: typeof x === 'number' ? x : 40,
      y: typeof y === 'number' ? y : 60,
      sembradoEn: new Date().toISOString(),
      cosechado: false,
    }

    huerto.cultivos.push(nuevoCultivo)

    // Si la BD está conectada, registrar también en Huerto_Planta
    if (isDbConnected()) {
      try {
        const sql = `
          INSERT INTO Huerto_Planta (ID_Huerto, ID_Planta, Fecha_Siembra, Cantidad, Estado, Observaciones)
          VALUES ($1, $2, CURRENT_DATE, 1, 'Activo', $3)
        `
        await query(sql, [huertoId, planta.id, `Posición: ${x}%, ${y}%`])
      } catch (err) {
        console.warn('[Huertos.sembrarCultivo] Error en BD:', err.message)
      }
    }

    return res.status(201).json({
      mensaje: `¡${planta.nombre} sembrada exitosamente!`,
      cultivo: nuevoCultivo,
    })
  } catch (error) {
    console.error('[Huertos.sembrarCultivo]', error)
    return res.status(500).json({ error: 'Error al sembrar el cultivo.' })
  }
}

export async function cosecharCultivo(req, res) {
  try {
    const huertoId = parseInt(req.params.id, 10) || 1
    const { cultivoId } = req.body

    const huerto = mockData.huertos.find((h) => h.id === huertoId) || mockData.huertos[0]
    const cultivo = huerto.cultivos.find((c) => c.id === parseInt(cultivoId, 10))

    if (!cultivo) {
      return res.status(404).json({ error: 'Cultivo no encontrado.' })
    }

    cultivo.cosechado = true

    return res.json({
      mensaje: `¡${cultivo.planta.nombre} cosechada con éxito! Has ganado puntos.`,
      cultivo,
    })
  } catch (error) {
    console.error('[Huertos.cosecharCultivo]', error)
    return res.status(500).json({ error: 'Error al cosechar el cultivo.' })
  }
}
