import { useState } from 'react'
import Header from '../components/Header'
import '../App.css'

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
      <main className="contenido">
        <section className="tarjeta" aria-labelledby="titulo">
          <p className="bienvenida">BIENVENIDO DE NUEVO</p>
          <h1 id="titulo">Inicia Sesión</h1>
          <p className="descripcion">Ingresa tus credenciales para acceder a tu cuenta.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="usuario">Nombre de usuario</label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              placeholder="Escribe tu usuario o correo"
              required
            />
            <label htmlFor="constrasena">Contraseña</label>
            <div className="campo-password">
              <input
              id="contrasena"
              name="contrasena"
              type={mostrarPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
              />
              <button
              className="ver-password"
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? '◉' : '◎'}
              </button>
            </div>

            <div className="opciones">
              <label className="recordarme">
                <input type="checkbox" name="recordarme" defaultChecked />
                <span className='span'>Recordarme</span>
              </label>
              <a href="#recuperar">¿Olvidaste tu contraseña?</a>
            </div>

            <button className="boton-principal" type="submit">
              Iniciar sesión
            </button>

            <p className="mensaje" role="status" aria-live="polite">{mensaje}</p>
          </form>

          <p className="nota-seguridad">Al iniciar sesión, tus datos estarán protegidos de forma segura </p>
        </section>
      </main>

      <footer className="pie">
        © 2026 Huertos.ec — Todos los derechos reservados.
      </footer>
    </div>
  )
}
export default Login