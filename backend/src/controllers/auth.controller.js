import { query } from '../config/db.js'
import bcrypt from 'bcryptjs'
import { startSession, COOKIE_NAME, cookieOptions } from '../config/sessions.js'
import { touchSharedPresence } from '../data/sharedPresence.js'

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body

    if (typeof usuario !== 'string' || typeof contrasena !== 'string' || !usuario.trim() || !contrasena) {
      return res.status(400).json({ error: 'El nombre de usuario es requerido.' })
    }

    try {
      const sql = `
        SELECT u.ID_usuario,
               COALESCE(to_jsonb(u)->>'nombres', to_jsonb(u)->>'nombre', '') AS nombres,
               COALESCE(to_jsonb(u)->>'apellidos', to_jsonb(u)->>'apellido', '') AS apellidos,
               COALESCE(to_jsonb(u)->>'contrasenia_hash', to_jsonb(u)->>'contraseña') AS contrasenia_hash,
               COALESCE(to_jsonb(ug)->>'nombre_usuario', to_jsonb(u)->>'nombre_usuario') AS nombre_usuario,
               COALESCE(to_jsonb(ug)->>'descripcion', to_jsonb(ug)->>'descripción') AS descripcion, ug.Puntos,
               g.ID_gremio, g.Nombre_Gremio, mg.Rol AS Rol_En_Gremio, ug.last_seen
        FROM Usuario u
        LEFT JOIN Usuario_General ug ON u.ID_usuario = ug.ID_usuario
        LEFT JOIN Miembro_Gremio mg ON u.ID_usuario = mg.ID_usuario
        LEFT JOIN Gremio g ON mg.ID_gremio = g.ID_gremio
        LEFT JOIN Huerto h ON h.ID_gremio = g.ID_gremio
        WHERE LOWER(COALESCE(to_jsonb(ug)->>'nombre_usuario', to_jsonb(u)->>'nombre_usuario')) = LOWER($1)
        ORDER BY g.ID_gremio
        LIMIT 1
      `
      const { rows } = await query(sql, [usuario])
      const user = rows[0]

      if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado.' })
      }

      // Verificar contraseña con bcrypt
      const valida = user.contrasenia_hash
        ? await bcrypt.compare(contrasena, user.contrasenia_hash)
        : false

      if (!valida) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
      }

      await startSession(req, user.id_usuario, 'postgres')
      await touchSharedPresence(req, user.last_seen)
      // Construir objeto gremio si pertenece a uno
      const gremioIdNum = user.id_gremio ? Number(user.id_gremio) : null
      const gremioObj = gremioIdNum
        ? {
            id: gremioIdNum,
            nombre: user.nombre_gremio,
            areaTotal: Number(user.area_total || 0),
            puntos: Number(user.puntos_gremio || 0),
            ubicacion: {
              lat: Number(user.latitud || -0.1807),
              lng: Number(user.longitud || -78.4678),
            },
            direccion: `Tungurahua (Lat: ${user.latitud}, Lng: ${user.longitud})`,
          }
        : null

      return res.json({
        mensaje: 'Inicio de sesión exitoso',
        usuario: {
          id: Number(user.id_usuario),
          usuario: user.nombre_usuario,
          nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.nombre_usuario,
          descripcion: user.descripcion,
          puntos: Number(user.puntos || 0),
          gremioId: gremioIdNum ? Number(user.id_gremio) : null,
          gremioNombre: user.nombre_gremio || null,
          rolGremio: user.rol_en_gremio || null,
          huertoId: user.id_huerto ? Number(user.id_huerto) : gremioIdNum,
        },
        gremio: gremioObj,
      })
    } catch (dbErr) {
      console.warn('[Auth] Error consultando PostgreSQL:', dbErr.message)
      return res.status(503).json({ error: 'No se pudo iniciar sesión en la base de datos.' })
    }
  } catch (error) {
    console.error('[Auth.login]', error)
    return res.status(500).json({ error: 'Error interno en el servidor.' })
  }
}

export async function logout(req, res) {
  await new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'No se pudo cerrar la sesión.' })
      } else {
        res.clearCookie(COOKIE_NAME, cookieOptions)
        res.json({ mensaje: 'Sesión cerrada.' })
      }
      resolve()
    })
  })
}

export async function presence(req, res) {
  if (!req.session.usuarioId) return res.status(401).json({ error: 'Tu sesión terminó. Inicia sesión nuevamente.' })
  try {
    await touchSharedPresence(req)
  } catch (error) {
    console.error('[Presencia]', error.code || 'ERROR')
    return res.status(503).json({ error: 'No se pudo actualizar la presencia. Inténtalo más tarde.' })
  }
  res.json({ lastSeen: req.session.sharedLastSeen || req.session.lastSeen, nextUpdateAt: req.session.presenceDueAt || null })
}
