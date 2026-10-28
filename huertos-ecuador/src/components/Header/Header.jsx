import { Link } from 'react-router-dom'
import Button from '../Button/Button'
import styles from './Header.module.css'

function Header({ pregunta, textoEnlace, destino }) {
  return (
    <header className={styles.barra}>
      <Link className={styles.marca} to="/" aria-label="Huertos.ec, inicio">
        <span className={styles.iconoPlanta} aria-hidden="true">🌱</span>
        <span className={styles.nombreMarca}>Huertos Ec.</span>
      </Link>

      <nav className={styles.cuenta} aria-label="Navegación de cuenta">
        <span className={styles.pregunta}>{pregunta}</span>
        <Button as={Link} to={destino}>{textoEnlace}</Button>
      </nav>
    </header>
  )
}

export default Header