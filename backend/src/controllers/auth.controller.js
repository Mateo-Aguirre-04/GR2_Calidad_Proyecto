import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'
import bcrypt from 'bcryptjs'
import { startSession, COOKIE_NAME, cookieOptions } from '../config/sessions.js'

function publicUser(user) {
  const { contrasena, contrasenia_hash, ...safe } = user
  return safe
}

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body

    if (typeof usuario !== 'string' || typeof contrasena !== 'string' || !usuario.trim() || !contrasena) {
      return res.status(400).json({ error: 'El nombre de usuario es requerido.' })
    }

    if (isDbConnected()) {
      try {
        const sql = `
          SELECT u.ID_usuario,
                 COALESCE(to_jsonb(u)->>'nombres', to_jsonb(u)->>'nombre', '') AS nombres,
                 COALESCE(to_jsonb(u)->>'apellidos', to_jsonb(u)->>'apellido', '') AS apellidos,
                 COALESCE(to_jsonb(u)->>'contrasenia_hash', to_jsonb(u)->>'contraseña') AS contrasenia_hash,
                 COALESCE(to_jsonb(ug)->>'nombre_usuario', to_jsonb(u)->>'nombre_usuario') AS nombre_usuario,
                 COALESCE(to_jsonb(ug)->>'descripcion', to_jsonb(ug)->>'descripción') AS descripcion, ug.Puntos,
                 g.ID_gremio, g.Nombre_Gremio, mg.Rol AS Rol_En_Gremio
          FROM Usuario u
          LEFT JOIN Usuario_General ug ON u.ID_usuario = ug.ID_usuario
          LEFT JOIN Miembro_Gremio mg ON u.ID_usuario = mg.ID_usuario
          LEFT JOIN Gremio g ON mg.ID_gremio = g.ID_gremio
          WHERE LOWER(COALESCE(to_jsonb(ug)->>'nombre_usuario', to_jsonb(u)->>'nombre_usuario')) = LOWER($1)
          ORDER BY g.ID_gremio
          LIMIT 1
        `
        const { rows } = await query(sql, [usuario])
        const user = rows[0]

        const valida = user?.contrasenia_hash
        ? await bcrypt.compare(contrasena, user.contrasenia_hash)
        : false

        if (!valida) {
          return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
        }

        await startSession(req, user.id_usuario, 'postgres')
        return res.json({
          mensaje: 'Inicio de sesión exitoso',
          usuario: {
            id: Number(user.id_usuario),
            usuario: user.nombre_usuario,
            nombre: `${user.nombres} ${user.apellidos ?? ''}`.trim(),
            descripcion: user.descripcion,
            puntos: user.puntos || 0,
            gremioId: user.id_gremio ? Number(user.id_gremio) : null,
            gremioNombre: user.nombre_gremio,
            rolGremio: user.rol_en_gremio,
          },
        })
      } catch (dbErr) {
        console.warn('[Auth] Error consultando PostgreSQL:', dbErr.message)
        return res.status(503).json({ error: 'No se pudo iniciar sesión en la base de datos.' })
      }
    }

    // Fallback con mockStore
    const userFound = mockData.usuarios.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    )

    if (userFound && contrasena === userFound.contrasena) {
      await startSession(req, userFound.id, 'mock')
      userFound.enLinea = true
      userFound.lastSeen = req.session.lastSeen
      return res.json({
        mensaje: 'Inicio de sesión exitoso (modo datos semilla)',
        usuario: publicUser(userFound),
      })
    }

    // Si no existe, para desarrollo permitimos crear sesión temporal o sugerir usuarios existentes
    const nombresDisponibles = mockData.usuarios.map((u) => u.usuario).slice(0, 4).join(', ')
    return res.status(401).json({
      error: `Usuario no encontrado. Usuarios de prueba disponibles: ${nombresDisponibles}`,
    })
  } catch (error) {
    console.error('[Auth.login]', error)
    return res.status(500).json({ error: 'Error interno en el servidor.' })
  }
}

export async function logout(req, res) {
  const usuarioId = req.session.usuarioId
  await new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'No se pudo cerrar la sesión.' })
      } else {
        const user = mockData.usuarios.find((u) => u.id === usuarioId)
        if (user) user.enLinea = false
        res.clearCookie(COOKIE_NAME, cookieOptions)
        res.json({ mensaje: 'Sesión cerrada.' })
      }
      resolve()
    })
  })
}

export function presence(req, res) {
  if (!req.session.usuarioId) return res.status(401).json({ error: 'Inicia sesión.' })
  const user = req.session.source === 'mock' && mockData.usuarios.find((u) => u.id === req.session.usuarioId)
  if (user) {
    user.enLinea = true
    user.lastSeen = req.session.lastSeen
  }
  res.json({ lastSeen: req.session.lastSeen })
}


export async function registro(req, res) {
  try {
    const { nombre, apellido, usuario, contrasena, genero } = req.body

    if (!nombre || !usuario) {
      return res.status(400).json({ error: 'Nombre y nombre de usuario son obligatorios.' })
    }

    const gen = genero && ['M', 'F', 'NB', 'O'].includes(genero) ? genero : 'O'
    const nombreCompleto = `${nombre} ${apellido || ''}`.trim()

    if (isDbConnected()) {
      try {
        const insertUser = `
          INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
          VALUES ($1, CURRENT_DATE - INTERVAL '20 years', $2)
          RETURNING ID_usuario, Nombre_Usuario
        `
        const userRes = await query(insertUser, [usuario, gen])
        const newId = userRes.rows[0].id_usuario

        const insertGen = `
          INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
          VALUES ($1, 'Nuevo agricultor urbano', 0, 'Novato')
        `
        await query(insertGen, [newId])

        return res.status(201).json({
          mensaje: 'Cuenta registrada exitosamente en la base de datos',
          usuario: {
            id: newId,
            usuario,
            nombre: nombreCompleto,
            puntos: 0,
            rango: 'Novato',
          },
        })
      } catch (dbErr) {
        console.warn('[Auth] Error registrando en PostgreSQL, guardando en fallback:', dbErr.message)
      }
    }

    // Fallback en mockStore
    const id = mockData.usuarios.length + 1
    const nuevoUsuario = {
      id,
      usuario,
      nombre: nombreCompleto,
      contrasena: contrasena || '12345678',
      fechaNacimiento: '2000-01-01',
      genero: gen,
      talento: 'Nuevo agricultor comunitario',
      puntos: 0,
      rango: 'Novato',
      gremioId: 1, // Por defecto asignado a Ficoa
      gremioNombre: 'Sembradores de Ficoa - Ambato',
      rolGremio: 'Miembro',
      posicionGremio: mockData.usuarios.length + 1,
      avatar: '',
    }
    mockData.usuarios.push(nuevoUsuario)

    return res.status(201).json({
      mensaje: 'Cuenta registrada exitosamente',
      usuario: publicUser(nuevoUsuario),
    })
  } catch (error) {
    console.error('[Auth.registro]', error)
    return res.status(500).json({ error: 'Error al registrar la cuenta.' })
  }
}
