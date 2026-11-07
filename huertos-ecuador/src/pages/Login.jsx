import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import styles from './css/Login.module.css'
import { authenticatedFetch } from '../authSession'

function Login() {
  const navigate = useNavigate()
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setMensaje('Iniciando sesión...')
    const form = event.currentTarget
    const usuario = form.usuario.value
    const contrasena = form.contrasena.value

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena }),
      })
      const datos = await res.json()
      if (res.ok) {
        setMensaje(`¡Bienvenido, ${datos.usuario?.nombre || usuario}!`)
        localStorage.setItem('usuario_actual', JSON.stringify(datos.usuario))

        // Si el usuario ya pertenece a un gremio en la base de datos
        if (datos.usuario?.gremioId) {
          if (datos.gremio) {
            localStorage.setItem('gremio_activo', JSON.stringify(datos.gremio))
          }
          const huertoId = datos.usuario.huertoId || datos.usuario.gremioId
          localStorage.setItem('huerto_activo_id', String(huertoId))

          // Redirección directa al huerto / juego
          setTimeout(() => navigate('/juego'), 600)
        } else {
          // Si no tiene gremio, limpiar registros antiguos y enviar a selección
          localStorage.removeItem('gremio_activo')
          localStorage.removeItem('huerto_activo_id')
          localStorage.removeItem('gremio_activo')
        localStorage.removeItem('huerto_activo_id')
        if (datos.usuario?.gremioId) {
          const respuestaGremio = await authenticatedFetch(`/api/gremios/${datos.usuario.gremioId}`)
          if (respuestaGremio.status === 401) {
            setMensaje('No se pudo mantener la sesión. Inicia sesión nuevamente.')
            return
          }
          const gremio = await respuestaGremio.json()
          if (!respuestaGremio.ok || !gremio.huerto?.id) {
            setMensaje(gremio.error || 'El gremio no tiene un huerto configurado.')
            return
          }
          localStorage.setItem('gremio_activo', JSON.stringify(gremio))
          localStorage.setItem('huerto_activo_id', String(gremio.huerto.id))
          setTimeout(() => navigate('/juego', { replace: true }), 600)
        } else {
          setTimeout(() => navigate('/seleccion-gremio', { replace: true }), 600)
        }
        }
      } else {
        setMensaje(datos.error || 'Credenciales incorrectas.')
      }
    } catch {
      setMensaje('No se pudo conectar con el servidor. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="pagina">
      <Header
        pregunta="¿No tienes cuenta?"
        textoEnlace="Registrarse"
        destino="/registro"
      />

      <main className={styles.contenido}>
        <Tarjeta ancho={400} aria-labelledby="titulo">
          <p className={styles.bienvenida}>BIENVENIDO DE NUEVO</p>
          <h1 className={styles.titulo} id="titulo">Inicia Sesión</h1>
          <p className={styles.descripcion}>
            Ingresa tus credenciales para acceder a tu cuenta.
          </p>

          <form onSubmit={handleSubmit}>
            <div className={styles.campo}>
              <label htmlFor="usuario">Nombre de usuario</label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                placeholder="Escribe tu usuario (ej. juanito_perez)"
                required
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="contrasena">Contraseña</label>
              <div className={styles.campoPassword}>
                <input
                  id="contrasena"
                  name="contrasena"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button
                  className={styles.verPassword}
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? '◉' : '◎'}
                </button>
              </div>
            </div>

            <div className={styles.opciones}>
              <label className={styles.recordarme}>
                <input type="checkbox" name="recordarme" defaultChecked />
                <span>Recordarme</span>
              </label>
              <a href="#recuperar">¿Olvidaste tu contraseña?</a>
            </div>

            <Button type="submit" variante="bloque">Iniciar sesión</Button>

            <p className={styles.mensaje} role="status" aria-live="polite">{mensaje}</p>
          </form>

          <p className={styles.notaSeguridad}>
            Al iniciar sesión, tus datos estarán protegidos de forma segura
          </p>
        </Tarjeta>
      </main>

      <footer className={styles.pie}>
        © 2026 Huertos.ec — Todos los derechos reservados.
      </footer>
    </div>
  )
}

export default Login
