import { useState } from 'react'
import styles from './IconoEstado.module.css'

function IconoEstado({ id, src, emoji, etiqueta, descripcion }) {
  const [fallo, setFallo] = useState(false)
  const idTooltip = `tooltip-${id}`

  return (
    <div className={styles.contenedor} tabIndex={0} aria-describedby={idTooltip}>
      <div className={styles.circulo}>
        {fallo
          ? <span aria-hidden="true">{emoji}</span>
          : <img src={src} alt="" onError={() => setFallo(true)} />}

        <span id={idTooltip} role="tooltip" className={styles.tooltip}>
          {descripcion}
        </span>
      </div>
      <span className={styles.etiqueta}>{etiqueta}</span>
    </div>
  )
}

export default IconoEstado