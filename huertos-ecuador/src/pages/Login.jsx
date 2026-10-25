import { useState } from 'react'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import styles from './css/Login.module.css'

function Login() {
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mensaje, setMensaje] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setMensaje('Interfaz de inicio de sesión')
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
                placeholder="Escribe tu usuario o correo"
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