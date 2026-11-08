import styles from './Cultivo.module.css'

const DIA_MS = 86_400_000

// Fases 0 a 3: Crecimiento (cuatro etapas).
// Fase 4: Cosechado / Maduración lista.
// Fase 5: Marchita / Muerta (withered).
export function calcularFase({ sembradoEn, cosechado, muerto, planta }, ahora) {
  if (muerto) return 5
  if (cosechado) return 4
  const dias = (ahora - new Date(sembradoEn).getTime()) / DIA_MS
  const diasTotal = planta?.diasCrecimiento || 60
  const progreso = dias / diasTotal
  // Crecimiento entre fase 0 y 3 (o 4 si ya alcanzó el tiempo de madurez)
  return Math.min(4, Math.max(0, Math.floor(progreso * 4)))
}

function Cultivo({ cultivo, ahora, onSelect, selectable }) {
  const fase = calcularFase(cultivo, ahora)
  const { planta, x, y, muerto } = cultivo

  // La imagen 6 es la planta marchita/muerta; si no, toma la fase de crecimiento
  const imagen = muerto && planta?.imagenMuerta
    ? planta.imagenMuerta
    : (planta?.imagenes?.[fase] || (fase === 5 ? planta?.imagenMuerta : undefined))

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(cultivo)
    }
  }

  const tituloFase = muerto 
    ? `${planta?.nombre} · Marchita`
    : `${planta?.nombre} · Fase ${fase + 1} de 5`

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
      ) : null}
    </div>
  )
}

export default Cultivo
