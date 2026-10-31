import Button from '../Button/Button'
import styles from './TarjetaPlanta.module.css'

function TarjetaPlanta({ planta, onVerFicha }) {
  const { nombre, tipo, region, resumen, imagen } = planta

  return (
    <article className={styles.tarjeta}>
      <div className={styles.headerBox}>
        <div className={styles.icono}>
          {imagen
            ? <img src={imagen} alt="" loading="lazy" />
            : <span aria-hidden="true">🌿</span>}
        </div>
        <span className={styles.region}>{region}</span>
      </div>

      <h3 className={styles.nombrePlanta}>{nombre}</h3>
      <p className={styles.tipo}>{tipo}</p>

      <div className={styles.cuidados}>
        <p className={styles.desc}>
          <strong className={styles.strong}>Cuidados:</strong> {resumen}
        </p>
      </div>

      <Button variante="bloque" onClick={() => onVerFicha(planta)}>
        Ver Ficha
      </Button>
    </article>
  )
}

export default TarjetaPlanta