import { useEffect } from 'react'
import { calcularFase, fasesTerreno, fechaCosecha, imagenCultivo, listaParaCosechar, usarRespaldo } from '../../data/fasesPlanta'
import styles from './ModalInfoCultivo.module.css'

const DIA_MS = 86_400_000
const formatoFecha = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' })

// Información de la planta sembrada en una parcela (los datos vienen de la tabla planta).
function ModalInfoCultivo({ cultivo, zona, parcela, ahora, enviando, onCosechar, onCerrar, disponibilidadCosecha }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  const { planta } = cultivo
  const total = fasesTerreno(planta)
  const fase = calcularFase(cultivo, ahora)
  const nombreFase = planta?.fases?.[fase]?.nombre
  const lista = listaParaCosechar(cultivo, ahora)
  const sembrado = new Date(cultivo.sembradoEn).getTime()
  const cosecha = fechaCosecha(cultivo)
  const progreso = Math.min(100, Math.max(0, ((ahora - sembrado) / (cosecha - sembrado)) * 100))
  const diasFaltan = Math.max(0, Math.ceil((cosecha - ahora) / DIA_MS))
  const imagen = imagenCultivo(cultivo, ahora)

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !enviando) onCerrar() }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="info-cultivo-titulo">
        <button className={styles.cerrar} type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
        <h2 id="info-cultivo-titulo">{planta?.nombre}</h2>
        {planta?.nombreCientifico && <p className={styles.cientifico}>{planta.nombreCientifico}</p>}
        {imagen && <img className={styles.imagen} src={imagen} onError={usarRespaldo} alt={`${planta?.nombre}, fase ${fase + 1}`} />}

        <dl className={styles.datos}>
          <dt>Ubicación</dt><dd>Zona {zona} · Parcela {parcela}</dd>
          <dt>Sembrada</dt><dd>{formatoFecha.format(sembrado)}</dd>
          <dt>Cantidad</dt><dd>{cultivo.cantidad} {cultivo.cantidad === 1 ? 'planta' : 'plantas'}</dd>
          {planta?.ciclo && (<><dt>Ciclo</dt><dd>{planta.ciclo}</dd></>)}
          <dt>Fase</dt><dd>{fase + 1} de {total}{nombreFase ? ` · ${nombreFase}` : ''}</dd>
          <dt>Cosecha</dt><dd>{formatoFecha.format(cosecha)}</dd>
        </dl>

        <div className={styles.barra} role="progressbar" aria-label="Crecimiento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso)}>
          <span style={{ width: `${progreso}%` }} />
        </div>
        <p className={styles.aviso}>
          {lista ? 'Fase visual de cosecha alcanzada. Revisa los requisitos de la actividad.' : `Faltan ${diasFaltan} ${diasFaltan === 1 ? 'día' : 'días'} para la fase visual de cosecha.`}
        </p>
        {disponibilidadCosecha?.motivos?.map(m=><p key={m}>{m}</p>)}

        <button className={styles.cosechar} type="button" disabled={enviando} onClick={() => onCosechar(cultivo)}>
          {enviando ? 'Guardando…' : 'Revisar actividad de cosecha'}
        </button>
      </section>
    </div>
  )
}

export default ModalInfoCultivo
