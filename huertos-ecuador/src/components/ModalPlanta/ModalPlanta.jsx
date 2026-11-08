import { useEffect, useState } from 'react'
import styles from './ModalPlanta.module.css'

import iconoSueloLocal from '../../assets/iconos/suelo.png'
import iconoAmbienteLocal from '../../assets/iconos/ambiente.png'
import iconoAbonoLocal from '../../assets/iconos/abono.png'
import iconoExtrasLocal from '../../assets/iconos/extras.png'

const BUCKET_ICONS_BASE = 'https://aceafqbfposisfmjxgkj.supabase.co/storage/v1/object/public/huertos-assets/iconos'

// Iconos y etiquetas servidos desde el bucket de Supabase con respaldo local en PNG
const CATEGORIAS = [
  { clave: 'suelo',    etiqueta: 'Suelo',    icono: `${BUCKET_ICONS_BASE}/suelo.png?v=4`,    fallback: iconoSueloLocal },
  { clave: 'ambiente', etiqueta: 'Ambiente', icono: `${BUCKET_ICONS_BASE}/ambiente.png?v=4`, fallback: iconoAmbienteLocal },
  { clave: 'abono',    etiqueta: 'Abono',    icono: `${BUCKET_ICONS_BASE}/abono.png?v=4`,    fallback: iconoAbonoLocal },
  { clave: 'extras',   etiqueta: 'Extras',   icono: `${BUCKET_ICONS_BASE}/extras.png?v=4`,   fallback: iconoExtrasLocal },
]

function ModalPlanta({ planta, onCerrar }) {
  // En el modal del catálogo solo se muestran las fases activas hasta Cosecha (marchita queda oculta)
  const fases = (planta.fases ?? []).filter(
    (f) => !f.muerta && f.nombre?.toLowerCase() !== 'marchita'
  )
  const cuidados = planta.cuidados ?? {}
  const [pestana, setPestana] = useState('fases') // 'fases' | 'cuidados'

  // Solo las categorías que tienen texto
  const categorias = CATEGORIAS
    .map((c) => ({ ...c, textos: [].concat(cuidados[c.clave] ?? []) }))
    .filter((c) => c.textos.length > 0)

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
              ) : categorias.length === 0 ? (
                <p className={styles.vacio}>Sin cuidados registrados.</p>
              ) : (
                <ul className={styles.listaCuidados}>
                  {categorias.map(({ clave, etiqueta, icono, fallback, textos }) => (
                    <li key={clave} className={styles.fila}>
                      <div className={styles.iconoCuidado}>
                        <img
                          src={icono}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            if (fallback && e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback
                            }
                          }}
                        />
                      </div>
                      <div className={styles.info}>
                        <span className={styles.etiqueta}>{etiqueta}</span>
                        <ul className={styles.textos}>
                          {textos.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ModalPlanta
