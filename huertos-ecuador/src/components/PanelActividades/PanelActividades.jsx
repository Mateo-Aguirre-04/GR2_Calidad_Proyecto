import { useState } from 'react'
import styles from './PanelActividades.module.css'

const TEXTOS={ritualAmanecer:'Realicé el ritual al amanecer',cultivoListo:'El cultivo está listo',rocioSeco:'El rocío está seco',
  seco:'El lote está seco',empacado:'Está empacado',etiquetado:'Está etiquetado',almacenado:'Está almacenado'}
const PARTES=['hojas','flores','frutos','semillas','raices']

function Tarea({tarea,checklist,ejecutar,ocupado,nombreCultivo}) {
  const [confirmaciones,setConfirmaciones]=useState({})
  const state=tarea.disponibilidad
  const requeridas=state?.confirmacionesRequeridas||[]
  const lista=requeridas.every(c=>confirmaciones[c]===true)
    && (!state?.decisionesRequeridas?.includes('conservarCultivo')||typeof confirmaciones.conservarCultivo==='boolean')
  return <article className={styles.tarea}>
    <strong>{tarea.actividad.nombre} · {tarea.actividad.puntos} puntos</strong>
    {tarea.actividad.codigo==='ritual_agradecimiento'&&<p>Actividad opcional del día 15. No es un requisito para cosechar.</p>}
    <p>{tarea.zona?.nombre || 'Jornada del huerto'}{nombreCultivo&&` · ${nombreCultivo}`}
      {tarea.programadaPara && ` · ${new Date(tarea.programadaPara).toLocaleString('es-EC')}`}</p>
    {tarea.completado ? <p>Completada</p> : <>
      {state?.motivos?.map(m=><p key={m}>{m}</p>)}
      {tarea.modalidad==='grupal'&&!tarea.yaInscrito && <button disabled={ocupado} onClick={()=>ejecutar(()=>checklist.inscribirse(tarea.id))}>Inscribirme en la jornada</button>}
      {requeridas.map(c=><label key={c}><input type="checkbox" checked={confirmaciones[c]===true} disabled={ocupado}
        onChange={e=>setConfirmaciones({...confirmaciones,[c]:e.target.checked})}/>{TEXTOS[c]||c}</label>)}
      {state?.decisionesRequeridas?.includes('conservarCultivo') && <label>Después de cosechar
        <select value={String(confirmaciones.conservarCultivo??'')} disabled={ocupado}
          onChange={e=>setConfirmaciones({...confirmaciones,conservarCultivo:e.target.value===''?undefined:e.target.value==='true'})}>
          <option value="">Elige una opción</option><option value="true">Conservar la planta</option><option value="false">Finalizar el cultivo y liberar la sección</option>
        </select></label>}
      <button disabled={ocupado||!state?.puedeCompletar||!lista||(tarea.modalidad==='grupal'&&!tarea.yaInscrito)}
        onClick={()=>ejecutar(()=>checklist.completar(tarea.id,confirmaciones))}>Completar actividad</button>
    </>}
  </article>
}

export default function PanelActividades({checklist,ejecutar,conClave,ocupado,seleccionInicial,onCerrar,error,mensaje,cultivosVista=[],vistaInicial='recordatorios',onRegar}) {
  const [vista,setVista]=useState(vistaInicial)
  const [seccionId,setSeccionId]=useState(seleccionInicial||'')
  const [actividad,setActividad]=useState('riego')
  const [fecha,setFecha]=useState('')
  const [cultivoId,setCultivoId]=useState('')
  const [historial,setHistorial]=useState(false)
  const sections=checklist.panel?.zonas||[]
  const section=sections.find(s=>s.id===seccionId)
  const crops=checklist.cultivos.filter(c=>c.activo)
  const ocupadas=new Set(crops.map(c=>c.zonaId).filter(Boolean))
  const nombres=Object.fromEntries(cultivosVista.map(c=>[c.id,c.planta?.nombre||'Cultivo']))
  const selectedCrop=crops.find(c=>`${c.plantaId}:${c.fechaSiembra}`===cultivoId)
  const tasks=checklist.tareas.filter(t=>(historial||!t.completado)&&(!seccionId||!t.zona||t.zona.id===seccionId))
  const recordatorios=checklist.recordatorios.filter(r=>r.recordatorioActivo||r.anticipado).filter(r=>!seccionId||!r.zonaId||r.zonaId===seccionId)
  async function programar(e) {
    e.preventDefault()
    const body={actividad,programadaPara:new Date(fecha).toISOString(),
      ...(actividad==='riego'?{zonaId:seccionId}:{}),...(actividad==='abono_organico'?{cultivo:selectedCrop}:{})}
    await conClave('programar',body,datos=>checklist.programar(datos))
  }
  return <div className={styles.overlay}><section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="actividades-titulo" aria-busy={ocupado}>
    <button className={styles.cerrar} disabled={ocupado} onClick={onCerrar} aria-label="Cerrar actividades">×</button>
    <h2 id="actividades-titulo">Actividades y recordatorios</h2>
    {error&&<p role="alert">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
    {checklist.error&&<p role="alert">{checklist.error}<button onClick={checklist.recargar}>Reintentar consulta</button></p>}
    {checklist.cargando&&<p role="status">Actualizando actividades…</p>}
    <nav className={styles.acciones} aria-label="Vista de actividades">
      <button aria-pressed={vista==='recordatorios'} onClick={()=>setVista('recordatorios')}>Recordatorios</button>
      <button aria-pressed={vista==='tareas'} onClick={()=>setVista('tareas')}>Actividades</button>
    </nav>
    <label>Sección del huerto<select value={seccionId} onChange={e=>setSeccionId(e.target.value)} disabled={ocupado}>
      <option value="">Todas las secciones</option>{sections.map(s=><option key={s.id} value={s.id}>{s.nombre} · {ocupadas.has(s.id)?'con plantas':'vacía'}</option>)}</select></label>
    {vista==='recordatorios'?<>
      <h3>Recordatorios</h3>
      {!recordatorios.length&&!checklist.cargando&&!checklist.error&&<p>No tienes recordatorios pendientes con las condiciones actuales.</p>}
      <ul>{recordatorios.map((r,i)=><li className={styles.recordatorio} key={`${r.tipo}:${r.tareaId||r.zonaId||i}`}>
        <strong>{r.nombre}</strong><p>{r.texto}</p>
        {r.cultivo&&<p>{nombres[`${r.cultivo.plantaId}:${r.cultivo.fechaSiembra}`]||'Cultivo'} · Siembra: {new Date(r.cultivo.fechaSiembra).toLocaleDateString('es-EC')}</p>}
        <button disabled={ocupado} onClick={()=>{if(['riego_diario','riego_semanal','riego'].includes(r.tipo))onRegar();else {setSeccionId(r.zonaId||'');setVista('tareas')}}}>
          {['riego_diario','riego_semanal','riego'].includes(r.tipo)?'Ir a regar':'Ver actividad y requisitos'}
        </button>
      </li>)}</ul>
    </>:<>
    {!section&&<p>Para preparar la tierra, elige arriba una sección marcada como «vacía».</p>}
    {section&&ocupadas.has(section.id)&&<p>Esta sección tiene plantas. Para iniciar una nueva preparación, primero debe quedar libre.</p>}
    {section&&<div className={styles.acciones}>
      {(!section.cicloId||section.requiereNuevoCiclo)&&<button disabled={ocupado} onClick={()=>conClave('ciclo',{zonaId:section.id},b=>checklist.iniciarCiclo(b.zonaId,b.claveSolicitud))}>{section.cicloId?'Iniciar otro ciclo de preparación':'Iniciar preparación de la sección'}</button>}
    </div>}
    <details><summary>Programar una actividad</summary><form onSubmit={programar}>
      <label>Actividad<select value={actividad} disabled={ocupado} onChange={e=>setActividad(e.target.value)}>
        <option value="riego">Riego de sección</option><option value="abono_organico">Abono orgánico</option><option value="limpieza_huerto">Limpieza grupal</option></select></label>
      {actividad==='abono_organico'&&<label>Cultivo<select value={cultivoId} disabled={ocupado} required onChange={e=>setCultivoId(e.target.value)}>
        <option value="">Selecciona el cultivo</option>{crops.map(c=><option key={`${c.plantaId}:${c.fechaSiembra}`} value={`${c.plantaId}:${c.fechaSiembra}`}>{nombres[`${c.plantaId}:${c.fechaSiembra}`]||'Cultivo'} · {sections.find(s=>s.id===c.zonaId)?.nombre||'Sin sección'} · Siembra: {new Date(c.fechaSiembra).toLocaleDateString('es-EC')}</option>)}</select></label>}
      <label>Fecha y hora ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" required disabled={ocupado} value={fecha} onChange={e=>setFecha(e.target.value)}/></label>
      <button disabled={ocupado||(actividad==='riego'&&!section)||(actividad==='abono_organico'&&!selectedCrop)}>Programar</button>
    </form></details>
    <details><summary>Configurar cultivos existentes</summary>{crops.map(c=><ConfigurarCultivo key={`${c.plantaId}:${c.fechaSiembra}`} cultivo={c} checklist={checklist} ejecutar={ejecutar} ocupado={ocupado} sections={sections} nombre={nombres[`${c.plantaId}:${c.fechaSiembra}`]}/>)}</details>
    <h3>Tareas</h3><label><input type="checkbox" checked={historial} onChange={e=>setHistorial(e.target.checked)}/>Mostrar también las completadas</label>
    {tasks.map(t=><Tarea key={t.id} tarea={t} checklist={checklist} ejecutar={ejecutar} ocupado={ocupado} nombreCultivo={nombres[`${t.cultivo?.plantaId}:${t.cultivo?.fechaSiembra}`]}/>)}
    <h3>Lotes de cosecha</h3>{checklist.panel?.lotes?.map(l=><Lote key={l.id} lote={l} checklist={checklist} ejecutar={ejecutar} ocupado={ocupado}/>)}
    </>}
  </section></div>
}

function ConfigurarCultivo({cultivo,checklist,ejecutar,ocupado,sections,nombre}) {
  const [parte,setParte]=useState(cultivo.parteCosecha||'')
  const [seccion,setSeccion]=useState(cultivo.zonaId||'')
  const [finalizar,setFinalizar]=useState(false)
  return <div className={styles.tarea}><p>{nombre||'Cultivo'} · {sections.find(s=>s.id===cultivo.zonaId)?.nombre||'Ubicación pendiente'} · Siembra: {new Date(cultivo.fechaSiembra).toLocaleDateString('es-EC')}</p>
    <label>Parte de cosecha<select value={parte} disabled={ocupado||!!cultivo.parteCosecha} onChange={e=>setParte(e.target.value)}><option value="">Selecciona</option>{PARTES.map(p=><option key={p}>{p}</option>)}</select></label>
    {!cultivo.zonaId&&<label>Sección física del cultivo<select value={seccion} disabled={ocupado} onChange={e=>setSeccion(e.target.value)}><option value="">Selecciona la ubicación real</option>{sections.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
    <button disabled={ocupado||!parte||(!cultivo.zonaId&&!seccion)||(!!cultivo.parteCosecha&&!!cultivo.zonaId)} onClick={()=>ejecutar(()=>checklist.configurarCultivo({...cultivo,parteCosecha:parte,...(seccion?{zonaId:seccion}:{})}))}>Guardar configuración del cultivo</button>
    <label><input type="checkbox" checked={finalizar} onChange={e=>setFinalizar(e.target.checked)}/>Confirmo que este cultivo terminó y dejó libre la sección</label>
    <button disabled={ocupado||!finalizar} onClick={()=>ejecutar(()=>checklist.finalizarCultivo({...cultivo,cultivoFinalizado:true}))}>Finalizar cultivo sin puntos</button>
  </div>
}

function Lote({lote,checklist,ejecutar,ocupado}) {
  const [modalidad,setModalidad]=useState('individual')
  const [sombra,setSombra]=useState(false)
  return <div className={styles.tarea}><strong>Lote {lote.id}</strong>{lote.secadoIniciadoEn?<p>Secado iniciado: {new Date(lote.secadoIniciadoEn).toLocaleString('es-EC')}</p>:<>
    <label>Modalidad<select value={modalidad} onChange={e=>setModalidad(e.target.value)}><option value="individual">Individual</option><option value="grupal">Grupal</option></select></label>
    <label><input type="checkbox" checked={sombra} onChange={e=>setSombra(e.target.checked)}/>Inicié el secado a la sombra</label>
    <button disabled={ocupado||!sombra} onClick={()=>ejecutar(()=>checklist.iniciarSecado(lote.id,modalidad,true))}>Registrar inicio del secado</button></>}</div>
}
