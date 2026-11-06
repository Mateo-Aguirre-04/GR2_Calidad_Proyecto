import styles from './Tarjeta.module.css'

function Tarjeta({ ancho = 400, children, ...props }) {
  return (
    <section
      {...props}
      className={styles.tarjeta}
      style={{ '--ancho': `${ancho}px` }}
    >
      {children}
    </section>
  )
}

export default Tarjeta