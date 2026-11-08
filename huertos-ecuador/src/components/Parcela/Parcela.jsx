import { calcularFase } from '../Cultivo/Cultivo'
import styles from './Parcela.module.css'

// Máximo de imágenes dibujadas por parcela (el total real se muestra en ×N).
const MAX_IMAGENES = 48

// Elige columnas/filas para repartir n plantas en una zona de proporción (ancho / alto) = aspecto.
function mejorCuadricula(n, aspecto) {
  let mejor = { cols: 1, filas: n, lado: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const filas = Math.ceil(n / cols)
    const lado = Math.min(aspecto / cols, 1 / filas)
    if (lado > mejor.lado) mejor = { cols, filas, lado }
  }
  return mejor
}

// rect   = [x, y, ancho, alto] de la parcela (clicable), en % de la imagen del fondo.
// tierra = [x, y, ancho, alto] de la tierra de esa parcela, en % de la imagen del fondo.
// relacion = ancho / alto de la imagen (para pasar % de alto a % de ancho).
function Parcela({ numero, rect, tierra, relacion = 1, cultivo, ahora, modo, deshabilitada, onSembrar, onCosechar }) {
  const [x, y, ancho, alto] = rect
  // Si `tierra` falta o no es [x, y, ancho, alto], se usa toda la parcela.
  const tierraValida = Array.isArray(tierra) && tierra.length === 4 && tierra.every((n) => Number.isFinite(n))
  const [tx, ty, tw, th] = tierraValida ? tierra : rect
  const muerta = Boolean(cultivo?.muerto)
  const ocupada = Boolean(cultivo) && !muerta
  const fase = cultivo ? calcularFase(cultivo, ahora) : null
  const imagen = muerta ? cultivo.planta?.imagenMuerta : cultivo?.planta?.imagenes?.[fase]

  const cosechar = ocupada && modo === 'cosecha'
  // Una planta muerta no ocupa la parcela: se puede volver a sembrar encima.
  const accion = cosechar ? () => onCosechar(cultivo) : !ocupada ? () => onSembrar(numero) : null

  const etiqueta = ocupada
    ? `Parcela ${numero}: ${cultivo.planta?.nombre} (${cultivo.cantidad} plantas)${cosechar ? '. Cosechar' : ''}`
    : `Parcela ${numero}: libre. Sembrar`

  // Plantas: una imagen por planta, plantadas SOBRE la tierra (no sobre el recipiente).
  // Medidas en "% del ancho de la imagen" para que el sprite sea cuadrado en pantalla.
  const cantidad = Math.max(1, Math.trunc(Number(cultivo?.cantidad)) || 1)
  const visibles = ocupada ? Math.min(cantidad, MAX_IMAGENES) : 0
  const thAncho = th / relacion // alto de la tierra expresado en % del ancho de la imagen
  const { cols, filas } = mejorCuadricula(Math.max(visibles, 1), tw / thAncho)
  const celdaW = tw / cols
  const celdaH = thAncho / filas
  // Tamaño natural de una planta (no depende de cuántas haya): la mayor que la tierra permite,
  // con un tope para que en terrenos enormes (surcos) no salga gigante. Solo se achica si no caben.
  const natural = Math.min(tw * 0.6, thAncho * 2.4, 4)
  const lado = Math.min(natural, celdaW * 1.4, celdaH * 2.4)

  const plantas = Array.from({ length: visibles }, (_, i) => {
    const fila = Math.floor(i / cols)
    const enFila = fila === filas - 1 ? visibles - fila * cols : cols // última fila centrada
    const col = i - fila * cols
    const cx = ((cols - enFila) / 2 + col + 0.5) * celdaW // en % del ancho de la imagen, dentro de la tierra
    const base = (fila + 0.75) * celdaH // la base de la planta pisa la parte baja de su celda
    return { cx, base }
  })

  return (
    <button
        type="button"
        className={`${styles.parcela} ${ocupada ? styles.ocupada : styles.libre} ${cosechar ? styles.cosechable : ''}`}
        style={{ left: `${x}%`, top: `${y}%`, width: `${ancho}%`, height: `${alto}%`, overflow: 'visible' }}
        onClick={accion ?? undefined}
        disabled={deshabilitada || !accion}
        aria-label={etiqueta}
        title={etiqueta}
      >
      {imagen && visibles > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${((tx - x) / ancho) * 100}%`,
            top: `${((ty - y) / alto) * 100}%`,
            width: `${(tw / ancho) * 100}%`,
            height: `${(th / alto) * 100}%`,
            pointerEvents: 'none',
          }}
        >
          {plantas.map(({ cx, base }, i) => (
            <img
              key={i}
              src={imagen}
              alt=""
              style={{
                // Tamaño y posición explícitos (esquina superior izquierda): no dependen de que el CSS
                // de .parcela img (inset, height, transform...) deje las propiedades en su valor inicial.
                position: 'absolute',
                inset: 'auto',
                margin: 0,
                padding: 0,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: 'none',
                left: `${((cx - lado / 2) / tw) * 100}%`,
                top: `${((base - lado) / thAncho) * 100}%`,
                width: `${(lado / tw) * 100}%`,
                height: `${(lado / thAncho) * 100}%`,
                objectFit: 'contain',
                objectPosition: 'bottom',
              }}
            />
          ))}
        </span>
      )}
        {ocupada && <span className={styles.cantidad}>×{cultivo.cantidad}</span>}
    </button>
  )
}

export default Parcela