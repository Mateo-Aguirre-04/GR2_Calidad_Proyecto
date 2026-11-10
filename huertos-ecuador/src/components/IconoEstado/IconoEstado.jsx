import { useState } from 'react'
import styles from './IconoEstado.module.css'

function IconoEstado({ id, src, emoji, etiqueta, descripcion }) {
  const [srcFallido, setSrcFallido] = useState(null)
  const idTooltip = `tooltip-${id}`

  return (
    <div className={styles.contenedor} tabIndex={0} aria-describedby={idTooltip}>
      <div className={styles.circulo}>
        {!src || srcFallido === src
          ? <span aria-hidden="true">{emoji}</span>
          : <img key={src} src={src} alt="" onError={() => setSrcFallido(src)} />}

        <span id={idTooltip} role="tooltip" className={styles.tooltip}>
          {descripcion}
        </span>
      </div>
      <span className={styles.etiqueta}>{etiqueta}</span>
    </div>
  )
}

export default IconoEstado
