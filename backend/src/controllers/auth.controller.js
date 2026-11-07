import { isDbConnected, query } from '../config/db.js'
import { mockData } from '../data/mockStore.js'
import bcrypt from 'bcryptjs'

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body

    if (!usuario) {
      return res.status(400).json({ error: 'El nombre de usuario es requerido.' })
    }

    if (isDbConnected()) {
      try {
        const sql = `
          SELECT u.ID_usuario, u.Nombres, u.Apellidos, u.Contrasenia_hash,
                 ug.Nombre_Usuario, ug.Descripcion, ug.Puntos,
                 g.ID_gremio, g.Nombre_Gremio, g.Area_Total, g.Puntos_Gremio, g.Latitud, g.Longitud,
                 mg.Rol AS Rol_En_Gremio,
                 h.ID_Huerto
          FROM Usuario u
          LEFT JOIN Usuario_General ug ON u.ID_usuario = ug.ID_usuario
          LEFT JOIN Miembro_Gremio mg ON u.ID_usuario = mg.ID_usuario
          LEFT JOIN Gremio g ON mg.ID_gremio = g.ID_gremio
          LEFT JOIN Huerto h ON h.ID_gremio = g.ID_gremio
          WHERE LOWER(ug.Nombre_Usuario) = LOWER($1)
          LIMIT 1
        `
        const { rows } = await query(sql, [usuario])
        const user = rows[0]

        if (!user) {
          // No está en BD, caer al fallback mock más abajo
          const userFound = mockData.usuarios.find(
            (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
          )
          if (userFound) {
            const gremioFound = userFound.gremioId
              ? mockData.gremios.find((g) => g.id === userFound.gremioId)
              : null
            return res.json({
              mensaje: 'Inicio de sesión exitoso (modo datos semilla)',
              usuario: userFound,
              gremio: gremioFound || null,
            })
          }
          return res.status(401).json({ error: 'Usuario no encontrado.' })
        }

        // Verificar contraseña con bcrypt
        const valida = user.contrasenia_hash
          ? await bcrypt.compare(contrasena, user.contrasenia_hash)
          : false

        if (!valida) {
          return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
        }

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
            gremioId: gremioIdNum,
            gremioNombre: user.nombre_gremio || null,
            rolGremio: user.rol_en_gremio || null,
            huertoId: user.id_huerto ? Number(user.id_huerto) : gremioIdNum,
          },
          gremio: gremioObj,
        })
      } catch (dbErr) {
        console.warn('[Auth] Error consultando PostgreSQL, usando fallback:', dbErr.message)
      }
    }

    // Fallback con mockStore
    const userFound = mockData.usuarios.find(
      (u) => u.usuario.toLowerCase() === usuario.toLowerCase()
    )

    if (userFound) {
      const gremioFound = userFound.gremioId
        ? mockData.gremios.find((g) => g.id === userFound.gremioId)
        : null

      return res.json({
        mensaje: 'Inicio de sesión exitoso (modo datos semilla)',
        usuario: userFound,
        gremio: gremioFound || null,
      })
    }

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
    const { nombre, apellido, usuario, contrasena, genero, fechaNacimiento, descripcion } = req.body

    if (!nombre || !usuario || !contrasena) {
      return res.status(400).json({ error: 'Nombre, nombre de usuario y contraseña son obligatorios.' })
    }

    const gen = genero && ['M', 'F', 'NB', 'O'].includes(genero) ? genero : 'O'
    const nombreCompleto = `${nombre} ${apellido || ''}`.trim()

    if (isDbConnected()) {
      try {
        // 1. Verificar que el nombre de usuario no exista ya
        const checkSql = `SELECT 1 FROM Usuario_General WHERE LOWER(Nombre_Usuario) = LOWER($1)`
        const checkRes = await query(checkSql, [usuario])
        if (checkRes.rows.length > 0) {
          return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' })
        }

        // 2. Hashear la contraseña
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(contrasena, salt)

        // 3. Insertar en tabla Usuario (columnas reales: Nombres, Apellidos, Contrasenia_hash, Fecha_Nacimiento, Genero)
        const insertUser = `
          INSERT INTO Usuario (Nombres, Apellidos, Contrasenia_hash, Fecha_Nacimiento, Genero)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING ID_usuario
        `
        const fechaNac = fechaNacimiento || '2000-01-01'
        const userRes = await query(insertUser, [nombre, apellido || '', hash, fechaNac, gen])
        const newId = userRes.rows[0].id_usuario

        // 4. Insertar en tabla Usuario_General (columnas reales: ID_usuario, Nombre_Usuario, Descripcion, Puntos)
        const insertGen = `
          INSERT INTO Usuario_General (ID_usuario, Nombre_Usuario, Descripcion, Puntos)
          VALUES ($1, $2, $3, 0)
        `
        await query(insertGen, [newId, usuario, descripcion || 'Nuevo agricultor urbano'])

        return res.status(201).json({
          mensaje: 'Cuenta registrada exitosamente',
          usuario: {
            id: Number(newId),
            usuario,
            nombre: nombreCompleto,
            puntos: 0,
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
      gremioId: null,
      gremioNombre: null,
      rolGremio: null,
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
