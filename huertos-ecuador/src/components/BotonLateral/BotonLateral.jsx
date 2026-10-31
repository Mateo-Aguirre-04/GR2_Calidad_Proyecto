import styles from './BotonLateral.module.css'

function BotonLateral({ boton, onSeleccionar, tooltipArriba = false }) {
  const { clave, etiqueta, descripcion, emoji, nombre, cantidad } = boton
  const idTooltip = `tooltip-${clave}`

  return (
    <div className={styles.contenedor}>
      <button
        type="button"
        className={`${styles.boton} ${cantidad ? styles.aviso : ''}`}
        onClick={() => onSeleccionar(boton)}
        aria-label={cantidad ? `${nombre} (${cantidad} pendientes)` : nombre}
        aria-describedby={idTooltip}
      >
        <span aria-hidden="true">{emoji}</span>
        {cantidad > 0 && <span className={styles.contador} aria-hidden="true">{cantidad}</span>}
      </button>

      {etiqueta && <span className={styles.etiqueta}>{etiqueta}</span>}

      <span
        id={idTooltip}
        role="tooltip"
        className={`${styles.tooltip} ${tooltipArriba ? styles.arriba : ''}`}
      >
        {descripcion}
      </span>
    </div>
  )
}

export default BotonLateral