import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import '../App.css'

const camposIniciales = {
  nombre: '',
  apellido: '',
  usuario: '',
  contrasena: '',
  confirmar: '',
}

function validar(valores, genero, aceptaTerminos) {
  const errores = {}
  if (!valores.nombre.trim()) errores.nombre = 'requerido'
  if (!valores.apellido.trim()) errores.apellido = 'requerido'
  if (!genero) errores.genero = 'Selecciona una opción'
  if (!valores.usuario.trim()) errores.usuario = 'requerido'
  else if (/\s/.test(valores.usuario)) errores.usuario = 'sin espacios'
  if (!valores.contrasena) errores.contrasena = 'requerida'
  else if (valores.contrasena.length < 8) errores.contrasena = 'mínimo 8 caracteres'
  if (!valores.confirmar || valores.confirmar !== valores.contrasena) {
    errores.confirmar = 'contraseñas no coinciden'
  }
  if (!aceptaTerminos) errores.terminos = 'Debes aceptar los términos para continuar'
  return errores
}

function Registro() {
  const [valores, setValores] = useState(camposIniciales)
  const [genero, setGenero] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [errores, setErrores] = useState({})
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)

  function actualizarCampo(event) {
    const { name, value } = event.target
    const nuevosValores = { ...valores, [name]: value }
    setValores(nuevosValores)
    if (intentoEnviar) setErrores(validar(nuevosValores, genero, aceptaTerminos))
  }

  function actualizarGenero(opcion) {
    setGenero(opcion)
    if (intentoEnviar) setErrores(validar(valores, opcion, aceptaTerminos))
  }

  function actualizarTerminos(event) {
    const aceptado = event.target.checked
    setAceptaTerminos(aceptado)
    if (intentoEnviar) setErrores(validar(valores, genero, aceptado))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setIntentoEnviar(true)
    const nuevosErrores = validar(valores, genero, aceptaTerminos)
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length === 0) setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  function campo({ id, label, name, placeholder, type = 'text', autoComplete }) {
    const error = errores[name]
    return (
      <div className={`registro-campo${error ? ' tiene-error' : ''}`}>
        <label htmlFor={id}>{label}</label>
        <div className="registro-input-wrap">
          <input
            id={id}
            name={name}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            value={valores[name]}
            onChange={actualizarCampo}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && <span className="registro-error-dot" aria-hidden="true">!</span>}
        </div>
        {error && <span className="registro-error-text" id={`${id}-error`} role="alert"><span aria-hidden="true">⚠</span> {error}</span>}
      </div>
    )
  }

  return (
    <div className="pagina pagina-registro">
      <Header pregunta="¿Ya tienes una cuenta?" textoEnlace="Iniciar sesión" destino="/" />
      <main className="registro-contenido">
        <section className="registro-tarjeta" aria-labelledby="registro-titulo">
          <p className="registro-eyebrow">CREA TU CUENTA</p>
          <h1 id="registro-titulo">Queremos conocerte</h1>
          <p className="registro-descripcion">Completa tus datos para personalizar tu experiencia.</p>

          <form className="registro-formulario" noValidate onSubmit={handleSubmit}>
            <div className="registro-grid">
              {campo({ id: 'registro-nombre', label: 'Nombre', name: 'nombre', placeholder: 'Escribe tu nombre', autoComplete: 'given-name' })}
              {campo({ id: 'registro-apellido', label: 'Apellido', name: 'apellido', placeholder: 'Escribe tu apellido', autoComplete: 'family-name' })}

              <fieldset className={`registro-genero${errores.genero ? ' tiene-error' : ''}`}>
                <legend>¿Con qué género te identificas?</legend>
                <div className="registro-opciones-genero">
                  {['Mujer', 'Hombre', 'Otro'].map((opcion) => (
                    <button
                      className={`registro-pill${genero === opcion ? ' activo' : ''}`}
                      type="button"
                      key={opcion}
                      aria-pressed={genero === opcion}
                      onClick={() => actualizarGenero(opcion)}
                    >
                      <span className="registro-pill-dot" aria-hidden="true" />{opcion}
                    </button>
                  ))}
                </div>
                {errores.genero && <span className="registro-error-text" role="alert"><span aria-hidden="true">⚠</span> {errores.genero}</span>}
              </fieldset>

              <div className="registro-ancho-completo">
                {campo({ id: 'registro-usuario', label: 'Nombre de usuario', name: 'usuario', placeholder: 'Crea tu nombre de usuario', autoComplete: 'username' })}
              </div>
              {campo({ id: 'registro-contrasena', label: 'Contraseña', name: 'contrasena', placeholder: 'Mínimo 8 caracteres', type: 'password', autoComplete: 'new-password' })}
              {campo({ id: 'registro-confirmar', label: 'Confirmar contraseña', name: 'confirmar', placeholder: 'Repite tu contraseña', type: 'password', autoComplete: 'new-password' })}
            </div>

            <div className={`registro-terminos${errores.terminos ? ' tiene-error' : ''}`}>
              <label htmlFor="registro-acepta-terminos">
                <input id="registro-acepta-terminos" type="checkbox" checked={aceptaTerminos} onChange={actualizarTerminos} />
                <span>Acepto los <a href="#terminos" onClick={(event) => event.preventDefault()}>términos y condiciones</a> y la política de privacidad.</span>
              </label>
              {errores.terminos && <span className="registro-error-text" role="alert">{errores.terminos}</span>}
            </div>

            <div className="registro-submit-wrap">
              {intentoEnviar && Object.keys(errores).length > 0 && <span className="registro-tooltip" role="status">⚠ Revisa los campos marcados</span>}
              <button className="registro-submit" type="submit">Crear mi cuenta</button>
            </div>
          </form>
          <p className="registro-seguridad">Al registrarte, tus datos estarán protegidos de forma segura.</p>
        </section>
      </main>

      {modalAbierto && (
        <div className="registro-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrarModal() }}>
          <section className="registro-modal" role="dialog" aria-modal="true" aria-labelledby="registro-modal-titulo">
            <button className="registro-modal-cerrar" type="button" onClick={cerrarModal} aria-label="Cerrar">×</button>
            <div className="registro-modal-check" aria-hidden="true">✓</div>
            <h2 id="registro-modal-titulo">¡REGISTRO EXITOSO!</h2>
            <p>Gracias por unirte a Huertos.ec. Tu cuenta ha sido creada correctamente.</p>
            <Link className="registro-modal-accion" to="/" onClick={cerrarModal}>COMENZAR</Link>
          </section>
        </div>
      )}
    </div>
  )
}

export default Registro
