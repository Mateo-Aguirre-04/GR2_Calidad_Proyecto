import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import styles from './css/Registro.module.css'

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
    if (Object.keys(nuevosErrores).length === 0) {
      fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: valores.nombre,
          apellido: valores.apellido,
          usuario: valores.usuario,
          contrasena: valores.contrasena,
          genero,
        }),
      }).catch((err) => console.warn('[Registro] API offline:', err))
      setModalAbierto(true)
    }
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  function campo({ id, label, name, placeholder, type = 'text', autoComplete }) {
    const error = errores[name]
    return (
      <div className={`${styles.campo} ${error ? styles.conError : ''}`}>
        <label htmlFor={id}>{label}</label>
        <div className={styles.inputWrap}>
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
          {error && <span className={styles.errorDot} aria-hidden="true">!</span>}
        </div>
        {error && (
          <span className={styles.errorTexto} id={`${id}-error`} role="alert">
            <span aria-hidden="true">⚠</span> {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="pagina">
      <Header pregunta="¿Ya tienes una cuenta?" textoEnlace="Iniciar sesión" destino="/" />
      <main className={styles.contenido}>
        <Tarjeta ancho={600} aria-labelledby="registro-titulo">
          <p className={styles.eyebrow}>CREA TU CUENTA</p>
          <h1 className={styles.titulo} id="registro-titulo">Queremos conocerte</h1>
          <p className={styles.descripcion}>Completa tus datos para personalizar tu experiencia.</p>

          <form noValidate onSubmit={handleSubmit}>
            <div className={styles.grid}>
              {campo({ id: 'registro-nombre', label: 'Nombre', name: 'nombre', placeholder: 'Escribe tu nombre', autoComplete: 'given-name' })}
              {campo({ id: 'registro-apellido', label: 'Apellido', name: 'apellido', placeholder: 'Escribe tu apellido', autoComplete: 'family-name' })}

              <fieldset className={`${styles.genero} ${errores.genero ? styles.conError : ''}`}>
                <legend>¿Con qué género te identificas?</legend>
                <div className={styles.opcionesGenero}>
                  {['Mujer', 'Hombre', 'Otro'].map((opcion) => (
                    <button
                      className={`${styles.pill} ${genero === opcion ? styles.activo : ''}`}
                      type="button"
                      key={opcion}
                      aria-pressed={genero === opcion}
                      onClick={() => actualizarGenero(opcion)}
                    >
                      <span className={styles.pillDot} aria-hidden="true" />{opcion}
                    </button>
                  ))}
                </div>
                {errores.genero && (
                  <span className={styles.errorTexto} role="alert">
                    <span aria-hidden="true">⚠</span> {errores.genero}
                  </span>
                )}
              </fieldset>

              <div className={styles.anchoCompleto}>
                {campo({ id: 'registro-usuario', label: 'Nombre de usuario', name: 'usuario', placeholder: 'Crea tu nombre de usuario', autoComplete: 'username' })}
              </div>
              {campo({ id: 'registro-contrasena', label: 'Contraseña', name: 'contrasena', placeholder: 'Mínimo 8 caracteres', type: 'password', autoComplete: 'new-password' })}
              {campo({ id: 'registro-confirmar', label: 'Confirmar contraseña', name: 'confirmar', placeholder: 'Repite tu contraseña', type: 'password', autoComplete: 'new-password' })}
            </div>

            <div className={`${styles.terminos} ${errores.terminos ? styles.conError : ''}`}>
              <label htmlFor="registro-acepta-terminos">
                <input id="registro-acepta-terminos" type="checkbox" checked={aceptaTerminos} onChange={actualizarTerminos} />
                <span>Acepto los <a href="#terminos" onClick={(event) => event.preventDefault()}>términos y condiciones</a> y la política de privacidad.</span>
              </label>
              {errores.terminos && <span className={styles.errorTexto} role="alert">{errores.terminos}</span>}
            </div>

            <div className={styles.submitWrap}>
              {intentoEnviar && Object.keys(errores).length > 0 && (
                <span className={styles.tooltip} role="status">⚠ Revisa los campos marcados</span>
              )}
              <Button type="submit" variante="bloque">Crear mi cuenta</Button>
            </div>
          </form>
          <p className={styles.seguridad}>Al registrarte, tus datos estarán protegidos de forma segura.</p>
        </Tarjeta>
      </main>

      {modalAbierto && (
        <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) cerrarModal() }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="registro-modal-titulo">
            <button className={styles.modalCerrar} type="button" onClick={cerrarModal} aria-label="Cerrar">×</button>
            <div className={styles.modalCheck} aria-hidden="true">✓</div>
            <h2 id="registro-modal-titulo">¡REGISTRO EXITOSO!</h2>
            <p>Gracias por unirte a Huertos.ec. Tu cuenta ha sido creada correctamente.</p>
            <Button as={Link} to="/" variante="bloque" onClick={cerrarModal}>COMENZAR</Button>
          </section>
        </div>
      )}
    </div>
  )
}

export default Registro