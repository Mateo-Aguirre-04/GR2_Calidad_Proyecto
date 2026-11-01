import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body

    if (!usuario) {
      return res.status(400).json({ error: 'El nombre de usuario es requerido.' })
    }

    if (isDbConnected()) {
      try {
        const sql = `
          SELECT u.ID_usuario, u.Nombre_Usuario, ug.Talento, ug.Puntos, ug.Rol_Gremio,
                 g.ID_gremio, g.Nombre_Gremio, mg.Rol AS Rol_En_Gremio
          FROM Usuario u
          LEFT JOIN Usuario_General ug ON u.ID_usuario = ug.ID_usuario
          LEFT JOIN Miembro_Gremio mg ON u.ID_usuario = mg.ID_usuario
          LEFT JOIN Gremio g ON mg.ID_gremio = g.ID_gremio
          WHERE LOWER(u.Nombre_Usuario) = LOWER($1)
          LIMIT 1
        `
        const { rows } = await query(sql, [usuario])
        if (rows.length > 0) {
          const user = rows[0]
          return res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
              id: user.id_usuario,
              usuario: user.nombre_usuario,
              nombre: user.nombre_usuario,
              talento: user.talento,
              puntos: user.puntos || 0,
              rango: user.rol_gremio || 'Novato',
              gremioId: user.id_gremio,
              gremioNombre: user.nombre_gremio,
              rolGremio: user.rol_en_gremio,
            },
          })
        }
      } catch (dbErr) {
        console.warn('[Auth] Error consultando PostgreSQL, usando fallback:', dbErr.message)
      }
    }

    // Fallback con mockStore
    const userFound = mockData.usuarios.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    )

    if (userFound) {
      return res.json({
        mensaje: 'Inicio de sesión exitoso (modo datos semilla)',
        usuario: userFound,
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
      usuario: nuevoUsuario,
    })
  } catch (error) {
    console.error('[Auth.registro]', error)
    return res.status(500).json({ error: 'Error al registrar la cuenta.' })
  }
}
