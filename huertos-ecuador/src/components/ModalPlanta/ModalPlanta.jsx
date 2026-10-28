import { useEffect, useState } from 'react'
import styles from './ModalPlanta.module.css'

function ModalPlanta({ planta, onCerrar }) {
  const fases = planta.fases ?? []
  const [pestana, setPestana] = useState('fases') // 'fases' | 'cuidados'

  useEffect(() => {
    function alPulsar(e) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div className={styles.ventana}>
        {/* Pestañas tipo carpeta */}
        <div className={styles.pestanas} role="tablist" aria-label="Información de la planta">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'fases'}
            className={`${styles.pestana} ${pestana === 'fases' ? styles.activa : ''}`}
            onClick={() => setPestana('fases')}
          >
            Fases
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'cuidados'}
            className={`${styles.pestana} ${pestana === 'cuidados' ? styles.activa : ''}`}
            onClick={() => setPestana('cuidados')}
          >
            Cuidados
          </button>
        </div>

        <section
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-planta-titulo"
        >
          <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>

          <div className={styles.contenido}>
            <header className={styles.encabezado}>
              <h2 id="modal-planta-titulo">{planta.nombre}</h2>
              <p>{planta.tipo} · {planta.region}</p>
            </header>

            <div role="tabpanel" className={styles.panel}>
              {pestana === 'fases' ? (
                fases.length === 0 ? (
                  <p className={styles.vacio}>Esta planta aún no tiene fases registradas.</p>
                ) : (
                  <ul className={styles.fases}>
                    {fases.map((f, i) => (
                      <li key={f.nombre} className={styles.fase}>
                        <div className={styles.foto}>
                          {f.imagen
                            ? <img src={f.imagen} alt={`${planta.nombre} en fase de ${f.nombre}`} loading="lazy" />
                            : <span aria-hidden="true">🌱</span>}
                        </div>
                        <span className={styles.faseNombre}>{i + 1}. {f.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className={styles.texto}>
                  {planta.descripcion || planta.cuidados || 'Sin descripción disponible.'}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ModalPlanta