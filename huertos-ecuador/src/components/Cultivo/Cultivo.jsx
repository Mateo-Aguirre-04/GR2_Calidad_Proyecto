import styles from './Cultivo.module.css'

const EMOJI_FASE = ['🌱', '🌿', '🪴', '🧺']
const DIA_MS = 86_400_000

// 0, 1 y 2: crecimiento (el tiempo total se divide en tres). 3: cosechada.
function calcularFase({ sembradoEn, cosechado, planta }, ahora) {
  if (cosechado) return 3
  const dias = (ahora - new Date(sembradoEn).getTime()) / DIA_MS
  const progreso = dias / planta.diasCrecimiento
  return Math.min(2, Math.max(0, Math.floor(progreso * 3)))
}

function Cultivo({ cultivo, ahora }) {
  const fase = calcularFase(cultivo, ahora)
  const { planta, x, y } = cultivo
  const imagen = planta.imagenes?.[fase]

  return (
    <div
      className={styles.cultivo}
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
      title={`${planta.nombre} · fase ${fase + 1} de 4`}
    >
      {imagen
        ? <img src={imagen} alt={`${planta.nombre}, fase ${fase + 1}`} />
        : <span aria-hidden="true">{EMOJI_FASE[fase]}</span>}
    </div>
  )
}

export default Cultivo