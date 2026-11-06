import { useEffect, useState } from 'react'
import Button from '../Button/Button'
import styles from './ModalPerfil.module.css'

const MAX_DESCRIPCION = 120

function ModalPerfil({ perfil, onGuardar, onCerrar }) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(perfil.descripcion)

  useEffect(() => {
    function alPulsar(e) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  const datos = [
    { etiqueta: 'Nombre', valor: perfil.nombre },
    { etiqueta: 'Gremio', valor: perfil.gremio },
    { etiqueta: 'Rango', valor: perfil.rango },
    { etiqueta: 'Puntuación', valor: `${perfil.puntuacion} puntos` },
    { etiqueta: 'Posición Gremio', valor: `${perfil.posicionGremio}º` },
  ]

  function empezarEdicion() {
    setBorrador(perfil.descripcion)
    setEditando(true)
  }

  function guardar() {
    onGuardar(borrador.trim())
    setEditando(false)
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-perfil-titulo"
      >
        <header className={styles.encabezado}>
          <span className={styles.logo} aria-hidden="true">🌱</span>
          <h2 id="modal-perfil-titulo">Mi Perfil</h2>
          <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.cuerpo}>
          {/* Panel izquierdo */}
          <div className={styles.panel}>
            <div className={styles.avatar}>
              {perfil.avatar
                ? <img src={perfil.avatar} alt={`Avatar de ${perfil.nombre}`} />
                : <span aria-hidden="true">🧑‍🌾</span>}
            </div>

            <h3 className={styles.tituloDesc}>Descripción:</h3>

            {editando ? (
              <>
                <textarea
                  className={styles.textarea}
                  value={borrador}
                  maxLength={MAX_DESCRIPCION}
                  onChange={(e) => setBorrador(e.target.value)}
                  aria-label="Descripción"
                  rows={3}
                />
                <span className={styles.contador}>{borrador.length}/{MAX_DESCRIPCION}</span>
              </>
            ) : (
              <p className={styles.descripcion}>{perfil.descripcion || 'Sin descripción.'}</p>
            )}
          </div>

          {/* Panel derecho */}
          <dl className={`${styles.panel} ${styles.datos}`}>
            {datos.map(({ etiqueta, valor }) => (
              <div key={etiqueta} className={styles.dato}>
                <dt>{etiqueta}:</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.pie}>
          {editando ? (
            <>
              <Button onClick={guardar}>Guardar</Button>
              <Button onClick={() => setEditando(false)}>Cancelar</Button>
            </>
          ) : (
            <Button onClick={empezarEdicion}>✎ Editar descripción</Button>
          )}
        </div>
      </section>
    </div>
  )
}

export default ModalPerfil