
import Button from '../Button/Button'
import styles from './TarjetaPlanta.module.css'

function TarjetaPlanta({
  planta,
  variante = 'completa',
  onVerFicha,
  onSeleccionar
}) {
  const { nombre, tipo, region, resumen, imagen } = planta

  const compacta = variante === 'compacta'

  const contenido = (
    <>
      <div className={styles.headerBox}>
        <div className={styles.icono}>
          {imagen
            ? <img src={imagen} alt="" loading="lazy" />
            : <span aria-hidden="true">🌿</span>}
        </div>

        {!compacta && (
          <span className={styles.region}>{region}</span>
        )}
      </div>

      <h3 className={styles.nombrePlanta}>{nombre}</h3>
      <p className={styles.tipo}>{tipo}</p>

      {!compacta && (
        <>
          <div className={styles.cuidados}>
            <p className={styles.desc}>
              <strong className={styles.strong}>
                Cuidados:
              </strong> {resumen}
            </p>
          </div>

          <Button
            variante="bloque"
            onClick={() => onVerFicha?.(planta)}
          >
            Ver Ficha
          </Button>
        </>
      )}
    </>
  )

  if (compacta) {
  return (
    <button
      type="button"
      className={`${styles.tarjeta} ${styles.compacta}`}
      onClick={(e) => {
        e.stopPropagation()
        onSeleccionar?.(planta)
      }}
    >
      {contenido}
    </button>
  )
}

  return (
    <article className={styles.tarjeta}>
      {contenido}
    </article>
  )
}

export default TarjetaPlanta
