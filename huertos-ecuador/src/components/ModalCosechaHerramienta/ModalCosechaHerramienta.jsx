import { useState } from 'react'
import styles from './ModalCosechaHerramienta.module.css'

export default function ModalCosechaHerramienta({cultivo,tarea,cargando,ocupado,error,onConfirmar,onCerrar}) {
  const [cultivoListo,setCultivoListo]=useState(false)
  const [rocioSeco,setRocioSeco]=useState(false)
  const [conservar,setConservar]=useState('')
  const disponibilidad=tarea?.disponibilidad
  const puedeCosechar=!!tarea&&!cargando&&!ocupado&&disponibilidad?.puedeCompletar
    &&cultivoListo&&rocioSeco&&conservar!==''
  function enviar(event) {
    event.preventDefault()
    if(puedeCosechar)onConfirmar({cultivoListo,rocioSeco,conservarCultivo:conservar==='true'})
  }
  return <div className={styles.overlay}>
    <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cosecha-herramienta-titulo" onSubmit={enviar}>
      <button className={styles.cerrar} type="button" disabled={ocupado} onClick={onCerrar} aria-label="Cerrar cosecha">×</button>
      <h2 id="cosecha-herramienta-titulo">Cosechar {cultivo.planta?.nombre||'cultivo'}</h2>
      <p>Zona {cultivo.zona} · Parcela {cultivo.parcela}</p>
      {cargando&&<p role="status">Comprobando los requisitos de cosecha…</p>}
      {!cargando&&!tarea&&<p>Este cultivo no tiene una tarea de cosecha pendiente.</p>}
      {disponibilidad?.motivos?.map(m=><p className={styles.motivo} key={m}>{m}</p>)}
      {error&&<p role="alert" className={styles.motivo}>{error}</p>}
      {tarea&&<>
        <label><input type="checkbox" checked={cultivoListo} disabled={ocupado}
          onChange={e=>setCultivoListo(e.target.checked)}/>El cultivo está listo</label>
        <label><input type="checkbox" checked={rocioSeco} disabled={ocupado}
          onChange={e=>setRocioSeco(e.target.checked)}/>El rocío está seco</label>
        <label>Después de cosechar
          <select value={conservar} disabled={ocupado} onChange={e=>setConservar(e.target.value)}>
            <option value="">Elige una opción</option>
            <option value="true">Conservar la planta</option>
            <option value="false">Finalizar el cultivo y liberar la sección</option>
          </select>
        </label>
        <button className={styles.confirmar} type="submit" disabled={!puedeCosechar}>
          {ocupado?'Guardando cosecha…':`Cosechar · ${tarea.actividad.puntos} puntos`}
        </button>
      </>}
    </form>
  </div>
}
