import { Link } from 'react-router-dom'

function Header({ pregunta, textoEnlace, destino }) {
  return (
    <header className="barra-superior">
      <Link className="marca" to="/" aria-label="Huertos.ec, inicio">
        <span className="icono-planta" aria-hidden="true">🌱</span>
        <span>Huertos Ec.</span>
      </Link>

      <nav className="enlace-registro" aria-label="Navegación de cuenta">
        <span>{pregunta}</span>
        <Link className="boton-pixel" to={destino}>{textoEnlace}</Link>
      </nav>
    </header>
  )
}

export default Header