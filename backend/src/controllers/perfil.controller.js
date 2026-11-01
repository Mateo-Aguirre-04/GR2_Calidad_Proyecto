import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'

export async function getPerfil(req, res) {
  try {
    const id = parseInt(req.params.id, 10) || 2 // Juanito Pérez por defecto
    const usuario = mockData.usuarios.find((u) => u.id === id) || mockData.usuarios[1]

    if (isDbConnected()) {
      try {
        const sql = `
          SELECT u.ID_usuario AS id,
                 u.Nombre_Usuario AS usuario,
                 ug.Talento AS descripcion,
                 ug.Puntos AS puntuacion,
                 ug.Rol_Gremio AS rango,
                 g.Nombre_Gremio AS gremio,
                 mg.Rol AS "rolGremio"
          FROM Usuario u
          JOIN Usuario_General ug ON u.ID_usuario = ug.ID_usuario
          LEFT JOIN Miembro_Gremio mg ON u.ID_usuario = mg.ID_usuario
          LEFT JOIN Gremio g ON mg.ID_gremio = g.ID_gremio
          WHERE u.ID_usuario = $1
        `
        const { rows } = await query(sql, [id])
        if (rows.length > 0) {
          const row = rows[0]
          return res.json({
            ...row,
            nombre: usuario.nombre || row.usuario,
            posicionGremio: usuario.posicionGremio || 1,
            avatar: '',
          })
        }
      } catch (err) {
        console.warn('[Perfil.getPerfil] Fallback a datos locales:', err.message)
      }
    }

    return res.json({
      nombre: usuario.nombre,
      gremio: usuario.gremioNombre,
      rango: usuario.rango,
      puntuacion: usuario.puntos,
      posicionGremio: usuario.posicionGremio,
      descripcion: usuario.talento,
      avatar: usuario.avatar || '',
    })
  } catch (error) {
    console.error('[Perfil.getPerfil]', error)
    return res.status(500).json({ error: 'Error al obtener el perfil.' })
  }
}

export async function guardarDescripcion(req, res) {
  try {
    const id = parseInt(req.params.id, 10) || 2
    const { descripcion } = req.body

    const usuario = mockData.usuarios.find((u) => u.id === id)
    if (usuario) {
      usuario.talento = descripcion
    }

    if (isDbConnected()) {
      try {
        const sql = `UPDATE Usuario_General SET Talento = $1 WHERE ID_usuario = $2`
        await query(sql, [descripcion, id])
      } catch (err) {
        console.warn('[Perfil.guardarDescripcion] Error en BD:', err.message)
      }
    }

    return res.json({
      mensaje: 'Descripción actualizada correctamente.',
      descripcion,
    })
  } catch (error) {
    console.error('[Perfil.guardarDescripcion]', error)
    return res.status(500).json({ error: 'Error al guardar la descripción.' })
  }
}
