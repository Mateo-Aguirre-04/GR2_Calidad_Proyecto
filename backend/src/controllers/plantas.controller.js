import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'

export async function getPlantas(req, res) {
  try {
    if (isDbConnected()) {
      try {
        const sql = `
          SELECT p.ID_Planta AS id,
                 p.Nombre_Comun AS nombre,
                 p.Nombre_Cientifico AS "nombreCientifico",
                 p.Tipo_Planta AS tipo,
                 'Sierra' AS region,
                 p.Ciclo_Cultivo AS ciclo,
                 CONCAT('Altitud óptima: ', p.Altitud_Minima, ' - ', p.Altitud_Maxima, ' msnm. Ciclo: ', p.Ciclo_Cultivo) AS resumen
          FROM Planta p
          ORDER BY p.ID_Planta ASC
        `
        const { rows } = await query(sql)
        if (rows.length > 0) {
          // Combinar datos botánicos de BD con los metadatos de cuidados y fases
          const plantasCompletas = rows.map((dbPlanta) => {
            const local = mockData.plantas.find((lp) => lp.id === dbPlanta.id)
            return {
              ...dbPlanta,
              diasCrecimiento: local ? local.diasCrecimiento : 60,
              cuidados: local ? local.cuidados : {
                suelo: ['Suelo franco y fértil.'],
                ambiente: ['Clima andino templado a frío.'],
                abono: ['Abono orgánico / compost.'],
                extras: ['Riego moderado.'],
              },
              imagen: local ? local.imagen : '',
              fases: local ? local.fases : [
                { nombre: 'Siembra', imagen: '' },
                { nombre: 'Germinación', imagen: '' },
                { nombre: 'Crecimiento', imagen: '' },
                { nombre: 'Cosecha', imagen: '' },
              ],
            }
          })
          return res.json(plantasCompletas)
        }
      } catch (err) {
        console.warn('[Plantas] Fallback a datos locales:', err.message)
      }
    }
    return res.json(mockData.plantas)
  } catch (error) {
    console.error('[Plantas.getPlantas]', error)
    return res.status(500).json({ error: 'Error al obtener plantas.' })
  }
}

export async function getPlantaById(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    const planta = mockData.plantas.find((p) => p.id === id)
    if (!planta) {
      return res.status(404).json({ error: 'Planta no encontrada.' })
    }
    return res.json(planta)
  } catch (error) {
    console.error('[Plantas.getPlantaById]', error)
    return res.status(500).json({ error: 'Error al obtener la planta.' })
  }
}
