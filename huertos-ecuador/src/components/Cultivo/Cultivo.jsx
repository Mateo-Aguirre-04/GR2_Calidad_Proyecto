import { calcularFase, fasesTerreno, imagenCultivo } from '../../data/fasesPlanta'
import styles from './Cultivo.module.css'

function Cultivo({ cultivo, ahora, onSelect, selectable }) {
  const fase = calcularFase(cultivo, ahora)
  const { planta, x, y, muerto } = cultivo
  const imagen = imagenCultivo(cultivo, ahora)

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(cultivo)
    }
  }

  const tituloFase = muerto 
    ? `${planta?.nombre} · Marchita`
    : `${planta?.nombre} · Fase ${fase + 1} de ${totalFases(planta)}`

  return (
    <div
      className={styles.cultivo}
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
      title={tituloFase}
      onClick={handleClick}
      role={selectable ? 'button' : undefined}
      aria-pressed={selectable ? 'false' : undefined}
    >
      {imagen ? (
        <img src={imagen} alt={`${planta?.nombre}, fase ${fase + 1}`} />
      ) : `${planta?.nombre} · Fase ${fase + 1} de ${fasesTerreno(planta)}`}
    </div>
  )
}

export default Cultivo