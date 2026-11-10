import { imagenCosecha, imagenCultivo, usarRespaldo } from '../../data/fasesPlanta'
import { iconoHuerto } from '../../data/iconosHuerto'
import { DURACION_RIEGO_MS } from '../../data/herramientasHuerto'
import styles from './Parcela.module.css'

// Máximo de imágenes dibujadas por parcela (el total real se muestra en ×N).
const MAX_IMAGENES = 48
// Tope de tamaño de una planta, en % del ancho del fondo (evita plantas gigantes en surcos).
const LADO_MAXIMO = 4

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
function Parcela({ numero, rect, tierra, relacion = 1, cultivo, ahora, modo, deshabilitada, cosechando = false, regando = false, onSembrar, onCosechar, onRegar, onVerInfo }) {
  const [x, y, ancho, alto] = rect
  // Si `tierra` falta o no es [x, y, ancho, alto], se usa toda la parcela.
  const tierraValida = Array.isArray(tierra) && tierra.length === 4 && tierra.every((n) => Number.isFinite(n))
  const [tx, ty, tw, th] = tierraValida ? tierra : rect
  const muerta = Boolean(cultivo?.muerto)
  const ocupada = Boolean(cultivo) && !muerta
  // Al cosechar sale la fase 5; en el terreno nunca pasa de la fase 4.
  const animando = ocupada && cosechando
  const imagen = !ocupada ? '' : animando ? imagenCosecha(cultivo.planta) : imagenCultivo(cultivo, ahora)
  const cosechar = ocupada && modo === 'cosecha'
  const regar = ocupada && modo === 'riego' && Boolean(onRegar)
  // La herramienta selecciona una parcela ocupada. El servidor decide si puede cosecharse.
  // Sin herramienta, la parcela ocupada muestra información y la libre permite sembrar.
  const accion = cosechar
    ? () => onCosechar(cultivo)
    : regar
      ? () => onRegar(cultivo)
      : ocupada
        ? () => onVerInfo(cultivo)
        : () => onSembrar(numero)

  const etiqueta = ocupada
    ? `Parcela ${numero}: ${cultivo.planta?.nombre} (${cultivo.cantidad} plantas)${cosechar ? '. Cosechar' : regar ? '. Regar' : '. Ver información'}`
    : `Parcela ${numero}: libre. ${modo?'Sin plantas para esta herramienta':'Sembrar'}`

  // Una imagen por planta, repartidas en cuadrícula SOBRE la tierra. Medidas en "% del ancho
  // de la imagen" para que el sprite sea cuadrado en pantalla.
  const cantidad = Math.max(1, Math.trunc(Number(cultivo?.cantidad)) || 1)
  const visibles = ocupada && imagen ? Math.min(cantidad, MAX_IMAGENES) : 0
  const thAncho = th / relacion // alto de la tierra expresado en % del ancho de la imagen
  const { cols, filas } = mejorCuadricula(Math.max(visibles, 1), tw / thAncho)
  const celdaW = tw / cols
  const celdaH = thAncho / filas
  // Tierra grande (surcos, camadas...): la planta cabe entera en su celda.
  // Tierra fina (boca de botella, maceta): la raíz queda en la tierra y la planta crece hacia arriba,
  // pero nunca más ancha que su celda de tierra.
  const tierraFina = th / alto < 0.5
  const lado = Math.min(LADO_MAXIMO, celdaW * 0.95, tierraFina ? thAncho * 3 : celdaH * 0.95)

  const plantas = Array.from({ length: visibles }, (_, i) => {
    const fila = Math.floor(i / cols)
    const enFila = fila === filas - 1 ? visibles - fila * cols : cols // última fila centrada
    const col = i - fila * cols
    const cx = ((cols - enFila) / 2 + col + 0.5) * celdaW
    const base = (fila + 1) * celdaH - (celdaH - Math.min(lado, celdaH)) / 2 // base dentro de la celda
    return { cx, base }
  })

  return (
    <button
      type="button"
      className={`${styles.parcela} ${ocupada ? styles.ocupada : styles.libre} ${cosechar ? styles.cosechable : ''} ${regar ? styles.regable : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${ancho}%`, height: `${alto}%`, overflow: 'visible' }}
      onClick={accion}
      disabled={deshabilitada||(Boolean(modo)&&!ocupada)}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {visibles > 0 && (
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
              onError={usarRespaldo}
              className={animando ? styles.cosechando : undefined}
              style={{
                // Posición explícita: no depende del CSS de .parcela img.
                position: 'absolute',
                inset: 'auto',
                margin: 0,
                padding: 0,
                maxWidth: 'none',
                maxHeight: 'none',
                left: `${((cx - lado / 2) / tw) * 100}%`,
                top: `${((base - lado) / thAncho) * 100}%`,
                width: `${(lado / tw) * 100}%`,
                height: `${(lado / thAncho) * 100}%`,
                objectFit: 'contain',
                objectPosition: 'bottom',
                // Pequeño desfase para que las plantas no salten todas a la vez.
                animationDelay: animando ? `${(i % 8) * 40}ms` : undefined,
              }}
            />
          ))}
        </span>
      )}
      {animando && (
        <span className={styles.textoCosecha} aria-hidden="true">
          +{cultivo.cantidad} <img className={styles.iconoCosecha} src={iconoHuerto('herramientas', 'cosechar')} alt="" />
        </span>
      )}
      {ocupada && regando && (
        <span
          className={styles.riego}
          aria-hidden="true"
          style={{
            left: `${((tx - x) / ancho) * 100}%`,
            top: `${((ty - y) / alto) * 100}%`,
            width: `${(tw / ancho) * 100}%`,
            height: `${(th / alto) * 100}%`,
            '--duracion-riego': `${DURACION_RIEGO_MS}ms`,
          }}
        >
          <span className={styles.tierraHumeda} />
          <img className={styles.regadera} src={iconoHuerto('herramientas', 'regar')} alt="" />
          <span className={styles.gotas}>
            {Array.from({ length: 18 }, (_, i) => (
              <span
                key={i}
                className={styles.gota}
                style={{
                  left: `${12 + (i % 6) * 15}%`,
                  top: `${12 + Math.floor(i / 6) * 28}%`,
                  '--retraso-gota': `${((i * 3) % 7) * 50}ms`,
                }}
              />
            ))}
          </span>
          <span className={styles.textoRiego}>Regado</span>
        </span>
      )}
      {ocupada && !animando && <span className={styles.cantidad}>×{cultivo.cantidad}</span>}
    </button>
  )
}

export default Parcela
