import { useState } from 'react'
import { cultivosDelChecklist } from '../../data/cultivosChecklist'
import styles from './PanelActividades.module.css'

export default function ModalRiego({checklist,conClave,ocupado,onCerrar,error,mensaje,cultivosVista=[]}) {
  const [seleccion,setSeleccion]=useState('')
  const cultivos=cultivosDelChecklist(checklist).filter(c=>c.activo)
  const secciones=(checklist.panel?.zonas||[]).filter(s=>cultivos.some(c=>c.zonaId===s.id))
  const seccion=secciones.find(s=>s.id===seleccion)
  const nombres=new Map(cultivosVista.map(c=>[c.id,c.planta?.nombre||'Cultivo']))
  return <div className={styles.overlay}><section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="riego-titulo" aria-busy={ocupado}>
    <button className={styles.cerrar} disabled={ocupado} onClick={onCerrar} aria-label="Cerrar riego">×</button>
    <h2 id="riego-titulo">Regar plantas</h2>
    <p>Selecciona una sección con plantas de tu huerto. Cada riego otorga 5 puntos por sección.</p>
    {error&&<p role="alert">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
    {checklist.error&&<p role="alert">{checklist.error}<button onClick={checklist.recargar}>Reintentar consulta</button></p>}
    {checklist.cargando&&<p role="status">Actualizando plantas…</p>}
    {!checklist.cargando&&!checklist.error&&!secciones.length&&<p>No hay secciones con plantas activas para regar.</p>}
    {!!secciones.length&&<>
      <label>Sección con plantas<select value={seleccion} disabled={ocupado} onChange={e=>setSeleccion(e.target.value)}>
        <option value="">Selecciona una sección</option>{secciones.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select></label>
      {seccion&&<ul>{cultivos.filter(c=>c.zonaId===seccion.id).map(c=><li key={`${c.plantaId}:${c.fechaSiembra}`}>
        {nombres.get(`${c.plantaId}:${c.fechaSiembra}`)||'Cultivo'} · Siembra: {new Date(c.fechaSiembra).toLocaleDateString('es-EC')}
      </li>)}</ul>}
      <button disabled={ocupado||checklist.cargando||!seccion} onClick={()=>conClave('riego',{zonaId:seccion.id},b=>checklist.registrarRiegos(b.zonaId,b.claveSolicitud))}>
        {ocupado?'Guardando riego…':'Regar esta sección · 5 puntos'}
      </button>
    </>}
  </section></div>
}
