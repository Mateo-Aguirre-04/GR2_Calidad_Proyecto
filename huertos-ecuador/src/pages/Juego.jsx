import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useHuerto } from '../hooks/useHuerto'
import { usePerfil } from '../hooks/usePerfil'
import { useClima } from '../hooks/useClima'
import { useFaseLunar } from '../hooks/useFaseLunar'
import { useAhora } from '../hooks/useAhora'
import { useChecklist } from '../hooks/useChecklist'
import { fondoHuerto, capacidadParcela, distribucionHuerto } from '../data/parcelasHuerto'
import { cultivosDelChecklist } from '../data/cultivosChecklist'
import { DURACION_RIEGO_MS, HERRAMIENTAS_HUERTO } from '../data/herramientasHuerto'
import { iconoHuerto } from '../data/iconosHuerto'
import { DURACION_COSECHA_MS } from '../data/fasesPlanta'
import Parcela from '../components/Parcela/Parcela'
import ModalCantidadSiembra from '../components/ModalCantidadSimebra/ModalCantidadSiembra'
import BotonLateral from '../components/BotonLateral/BotonLateral'
import IconoHerramienta from '../components/BotonLateral/IconoHerramienta'
import IconoEstado from '../components/IconoEstado/IconoEstado'
import ModalPerfil from '../components/ModalPerfil/ModalPerfil'
import ModalSeleccionPlanta from '../components/ModalSeleccionPlanta/ModalSeleccionPlanta'
import ModalInfoCultivo from '../components/ModalInfoCultivo/ModalInfoCultivo'
import ModalCosechaHerramienta from '../components/ModalCosechaHerramienta/ModalCosechaHerramienta'
import PanelActividades from '../components/PanelActividades/PanelActividades'
import PanelAjustes from '../components/PanelAjustes/PanelAjustes'
import styles from './css/Juego.module.css'

// accion: 'ruta' navega, 'modal' abre un modal, 'panel' abre el panel lateral, 'pendiente' aún sin definir.
// Las descripciones son fijas, no vienen de la base.
const BOTONES = [
  { clave: 'ajustes',       nombre: 'Ajustes',       etiqueta: 'Ajustes',       icono: { src: iconoHuerto('herramientas', 'ajustes') }, descripcion: 'Cambia las opciones de tu cuenta y del juego.', accion: 'panel' },
  { clave: 'foro',          nombre: 'Foro',          etiqueta: 'Foro',          icono: { src: iconoHuerto('herramientas', 'foro') }, descripcion: 'Conversa con otros jardineros.',               accion: 'ruta', destino: '/foro' },
  { clave: 'gremio',        nombre: 'Gremio',        etiqueta: 'Gremio',        icono: { src: iconoHuerto('herramientas', 'gremio') }, descripcion: 'Mira a tu gremio y su ranking.',               accion: 'ruta', destino: '/gremio' },
  { clave: 'catalogo',      nombre: 'Catálogo',      etiqueta: 'Catálogo',      icono: { src: iconoHuerto('herramientas', 'catalogo') }, descripcion: 'Consulta las plantas disponibles.',            accion: 'ruta', destino: '/catalogo-plantas' },
  { clave: 'recordatorios', nombre: 'Recordatorios', etiqueta: 'Recordatorios', icono: { src: iconoHuerto('herramientas', 'recordatorios') }, descripcion: 'Revisa tus tareas pendientes.',                accion: 'pendiente' },
]

const MEDALLAS = { Novato: 'novato', Aprendiz: 'aprendiz', Oficial: 'oficial', Maestro: 'maestro' }

function Juego() {
  const navigate = useNavigate()
  const [usuarioActual] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario_actual')) } catch { return null }
  })
  const { huerto, cargando, error: errorHuerto, recargar } = useHuerto()
  const { perfil, guardarDescripcion, recargar: recargarPerfil } = usePerfil(usuarioActual?.id)
  const clima = useClima(huerto?.ubicacion)
  const luna = useFaseLunar()
  const ahora = useAhora()
  const checklist = useChecklist(huerto?.id)
  const [zona, setZona] = useState(1)
  const [parcelaElegida, setParcelaElegida] = useState(null)

  const [modal, setModal] = useState(null) // 'perfil' | 'seleccionarPlanta' | 'cantidad' | 'recordatorios' | null
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [herramientaActiva, setHerramientaActiva] = useState(null) // 'riego' | 'cosecha'
  const [cultivoParaCosecha,setCultivoParaCosecha]=useState(null)
  const cursorHerramienta=useRef(null)
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null)
  const [cultivoInfo, setCultivoInfo] = useState(null) // cultivo cuya información se muestra
  const [cosechaAnimada,setCosechaAnimada] = useState(null)
  const [riegoAnimado,setRiegoAnimado] = useState(null)
  const [ajustesAbierto, setAjustesAbierto] = useState(false)

  const [mensajeAccion,setMensajeAccion]=useState('')
  const [seccionPanel,setSeccionPanel]=useState('')
  const [vistaPanel,setVistaPanel]=useState('recordatorios')
  const solicitudes=useRef(new Map())
  const enCurso=useRef(false)

  // Esc cancela la herramienta activa (Regar/Cosechar) y la cosecha que se está confirmando.
  // No interrumpe una acción que ya se está guardando.
  useEffect(() => {
    if (!herramientaActiva && !cultivoParaCosecha) return
    function cancelar(event) {
      if (event.key !== 'Escape' || enCurso.current) return
      if (cultivoParaCosecha) setCultivoParaCosecha(null)
      else if (modal || cultivoInfo) return
      setHerramientaActiva(null)
      setMensajeAccion('')
    }
    window.addEventListener('keydown', cancelar)
    return () => window.removeEventListener('keydown', cancelar)
  }, [herramientaActiva, cultivoParaCosecha, modal, cultivoInfo])

  async function ejecutar(operation) {
    if(enCurso.current) return
    enCurso.current=true
    setLoadingAccion(true)
    setErrorAccion('')
    setMensajeAccion('')
    try {
      const result=await operation()
      const receipt=result.comprobante||result
      const premio=result.puntosOtorgados??receipt.recompensas?.find(r=>String(r.usuarioId)===String(usuarioActual.id))?.puntos
      setMensajeAccion(premio!=null?`Actividad guardada. Sumaste ${premio} puntos.`:'Acción guardada.')
      const cosecha=checklist.tareas.find(t=>t.id===receipt.id&&t.actividad.codigo==='cosecha')
      if(cosecha) {
        setModal(null)
        setCultivoParaCosecha(null)
        setCosechaAnimada(`${cosecha.cultivo.plantaId}:${cosecha.cultivo.fechaSiembra}`)
        await new Promise(resolve=>setTimeout(resolve,DURACION_COSECHA_MS))
        setCosechaAnimada(null)
      }
      recargar()
      recargarPerfil()
      return result
    } catch(error) { setErrorAccion(error.message); return null }
    finally {enCurso.current=false;setLoadingAccion(false)}
  }
  async function conClave(tipo,datos,operation) {
    const identidad=JSON.stringify([huerto?.id,tipo,datos])
    if(!solicitudes.current.has(identidad)) solicitudes.current.set(identidad,crypto.randomUUID())
    return ejecutar(async()=>{
      const result=await operation({...datos,claveSolicitud:solicitudes.current.get(identidad)})
      solicitudes.current.delete(identidad)
      return result
    })
  }

  function seleccionar(boton) {
    if(enCurso.current) return
    setErrorAccion('')
    setMensajeAccion('')
    if (boton.accion === 'ruta') {
      navigate(boton.destino)
    } else if (boton.clave === 'ajustes') {
      setAjustesAbierto(abierto => !abierto)
    } else if (boton.accion === 'modal') {
      setModal(boton.clave)
    } else if (boton.clave === 'recordatorios') {
      setSeccionPanel('')
      setVistaPanel('recordatorios')
      setModal('recordatorios')
    } else if (boton.clave === 'riego') {
      setModal(null)
      setCultivoInfo(null)
      setCultivoParaCosecha(null)
      setHerramientaActiva(actual=>actual==='riego'?null:'riego')
    } else if (boton.clave === 'cosecha') {
      setModal(null)
      setCultivoInfo(null)
      setCultivoParaCosecha(null)
      setHerramientaActiva(actual=>actual==='cosecha'?null:'cosecha')
    }
  }

  function elegirParcela(numero) {
    setParcelaElegida(numero)
    setModal('seleccionarPlanta')
  }

  function onPlantaElegida(planta) {
    setPlantaSeleccionada(planta)
    setModal('cantidad')
  }

  function cerrarSiembra() {
    setModal(null)
    setParcelaElegida(null)
    setPlantaSeleccionada(null)
  }

  async function confirmarSiembra(cantidadPedida,cuidados) {
    const section=checklist.panel?.zonas?.find(s=>s.zona===zonaActual&&s.parcela===parcelaElegida)
    if(!section?.cicloId) {setErrorAccion('Carga las actividades y prepara esta sección antes de sembrar.');return}
    const max=capacidadParcela(areaParcela(parcelaElegida),distribucion.maxPlantas,plantaSeleccionada)
    const cantidad=Math.min(Math.max(1,Math.trunc(Number(cantidadPedida))||1),max)
    const result=await conClave('siembra',{cicloId:section.cicloId,plantaId:String(plantaSeleccionada.id),cantidad,...cuidados},b=>checklist.sembrar(b))
    if(result) cerrarSiembra()
  }

  async function regarParcela(cultivo) {
    if(enCurso.current)return
    const section=checklist.panel?.zonas?.find(s=>s.zona===cultivo.zona&&s.parcela===cultivo.parcela)
    if(!section) {setErrorAccion('Todavía no se cargó la sección de esta parcela. Espera a que terminen de cargar las actividades.');return}
    await conClave('riego',{zonaId:section.id},async b=>{
      const result=await checklist.registrarRiegos(b.zonaId,b.claveSolicitud)
      // La animación confirma un riego guardado y mantiene bloqueados los clics repetidos.
      setRiegoAnimado(cultivo.id)
      try {
        await new Promise(resolve=>setTimeout(resolve,DURACION_RIEGO_MS))
      } finally {setRiegoAnimado(null)}
      return result
    })
  }

  function onCultivoSeleccionado(cultivo) {
    if(enCurso.current) return
    setCultivoInfo(null)
    setErrorAccion('')
    setCultivoParaCosecha(cultivo)
  }

  function moverCursor(event) {
    const cursor=cursorHerramienta.current
    if(!cursor)return
    if(event.pointerType==='touch') {cursor.style.display='none';return}
    cursor.style.display='block'
    cursor.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0) translate(-25%,-25%)`
  }
  function ocultarCursor() {
    if(cursorHerramienta.current)cursorHerramienta.current.style.display='none'
  }

  if (!usuarioActual) return <Navigate to="/" replace />
  if (errorHuerto) return <p role="alert">No pudimos cargar tu huerto. Inténtalo nuevamente. <button onClick={recargar}>Reintentar</button></p>

  if (cargando || !huerto) {
    return <p className={styles.cargando} role="status">Cargando huerto...</p>
  }

  const seccionesDelChecklist=new Set(cultivosDelChecklist(checklist).filter(c=>c.activo).map(c=>c.zonaId))
  const riegosPendientes = new Set(checklist.recordatorios.filter(r=>['riego','riego_diario','riego_semanal'].includes(r.tipo)
    &&r.recordatorioActivo&&seccionesDelChecklist.has(r.zonaId)).map(r=>r.zonaId)).size
  const herramientas = HERRAMIENTAS_HUERTO.map(h => {
    const activa=h.clave===herramientaActiva
    return {...h,activo:activa,cantidad:h.clave==='riego'?riegosPendientes:0,
      nombre:activa?`Cancelar ${h.clave==='riego'?'riego':'cosecha'}`:h.nombre,
      etiqueta:activa?`Cancelar ${h.clave==='riego'?'riego':'cosecha'}`:h.etiqueta,
      descripcion:activa?'Pulsa otra vez o Esc para volver al cursor normal.':h.descripcion}
  })
  const iconoActivo=HERRAMIENTAS_HUERTO.find(h=>h.clave===herramientaActiva)?.icono
  const mostrarCursor=!!iconoActivo&&!modal&&!cultivoInfo&&!cultivoParaCosecha
  const tareaCosecha=cultivoParaCosecha&&checklist.tareas.find(t=>t.actividad.codigo==='cosecha'&&!t.completado
    &&`${t.cultivo?.plantaId}:${t.cultivo?.fechaSiembra}`===cultivoParaCosecha.id)

  const tipo = huerto.tipo ?? 'surcos'
  const fondo = fondoHuerto(tipo)
  // El backend envía zonas = [[m² de cada parcela], ...]; si no llega (o es el formato viejo), se calcula aquí.
  const distribucion = Array.isArray(huerto.parcelas?.zonas?.[0])
    ? huerto.parcelas
    : distribucionHuerto(huerto.areaTotal, tipo)
  const zonas = distribucion.zonas
  const zonaActual = Math.min(zona, zonas.length)
  const habilitadas = fondo.parcelas.slice(0, zonas[zonaActual - 1].length)
  const areaParcela = (numero) => zonas[zonaActual - 1]?.[numero - 1] ?? distribucion.m2PorParcela
  // Último cultivo no cosechado de cada parcela (los cultivos llegan ordenados por fecha)
  const cultivoEn = (numero) =>
    huerto.cultivos.filter((c) => c.zona === zonaActual && c.parcela === numero && !c.cosechado).at(-1)

  return (
    <div className={`${styles.pantalla} ${mostrarCursor?styles.modoHerramienta:''}`}
      style={{ '--fondo': `url(/huertos/${tipo}.png)` }}
      onPointerMove={moverCursor} onPointerLeave={ocultarCursor}>
      {mensajeAccion && <p className={styles.avisoSiembra} role="status">{mensajeAccion}</p>}
      {errorAccion && <p className={styles.avisoSiembra} role="alert">{errorAccion}</p>}
      {/* Jugador (arriba a la izquierda): abre el perfil */}
      <button type="button" className={styles.jugador} onClick={() => setModal('perfil')} aria-label="Abrir mi perfil">
        <span className={styles.avatar}>
          <img src={perfil?.avatar || iconoHuerto('jugador', 'avatar_predeterminado')} alt="" />
        </span>
        <span className={styles.placa}>
          <span className={styles.nombre}>{perfil?.nombre ?? '...'} · {perfil?.puntuacion ?? 0} puntos</span>
          <img className={styles.medalla} src={iconoHuerto('jugador', MEDALLAS[perfil?.rango] ?? 'medalla_generica')} alt={perfil?.rango ? `Rango: ${perfil.rango}` : 'Medalla'} />
        </span>
      </button>

      {/* Clima y fase lunar */}
      <div className={styles.estados}>
        <IconoEstado
          id="clima"
          src={iconoHuerto('clima', clima.clave)}
          emoji={clima.emoji}
          etiqueta={clima.temperatura !== null ? `${clima.etiqueta} (${clima.temperatura}°C)` : clima.etiqueta}
          descripcion={clima.descripcion}
        />
        <IconoEstado
          id="luna"
          src={iconoHuerto('luna', luna.clave)}
          emoji={luna.emoji}
          etiqueta={`${luna.etiqueta} (${luna.iluminacion}%)`}
          descripcion={luna.descripcion}
        />
      </div>

      <div className={styles.escenario}
        style={{ '--relacion': fondo.relacion, backgroundImage: `url(/huertos/${tipo}.png)` }}>
        {habilitadas.map((rect, i) => (
          <Parcela
            key={`${zonaActual}-${i}`}
            numero={i + 1}
            rect={rect}
            relacion={fondo.relacion}
            tierra={fondo.tierra?.[i]}
            cultivo={cultivoEn(i + 1)}
            ahora={ahora}
            modo={herramientaActiva}
            deshabilitada={loadingAccion}
            cosechando={cosechaAnimada != null && cultivoEn(i + 1)?.id === cosechaAnimada}
            regando={riegoAnimado != null && cultivoEn(i + 1)?.id === riegoAnimado}
            onSembrar={elegirParcela}
            onRegar={regarParcela}
            onCosechar={onCultivoSeleccionado}
            onVerInfo={setCultivoInfo}
          />
        ))}
      </div>
      {mostrarCursor&&<span ref={cursorHerramienta} className={styles.cursorHerramienta} aria-hidden="true">
        <IconoHerramienta icono={iconoActivo}/>
      </span>}

      {zonas.length > 1 && (
        <nav className={styles.zonas} aria-label="Zonas del huerto">
          <button type="button" onClick={() => setZona(zonaActual - 1)} disabled={zonaActual === 1} aria-label="Zona anterior"><img src={iconoHuerto('navegacion', 'flecha_izquierda')} alt="" /></button>
          <span>Zona {zonaActual} de {zonas.length}</span>
          <button type="button" onClick={() => setZona(zonaActual + 1)} disabled={zonaActual === zonas.length} aria-label="Zona siguiente"><img src={iconoHuerto('navegacion', 'flecha_derecha')} alt="" /></button>
        </nav>
      )}

      {/* Botones laterales */}
      <nav className={styles.lateral} aria-label="Menú del juego">
        <div className={styles.principales}>
          {BOTONES.map((b) => (
            <BotonLateral key={b.clave} boton={b} onSeleccionar={seleccionar} />
          ))}
        </div>
        <div className={styles.herramientas}>
          {herramientas.map((b) => (
            <BotonLateral key={b.clave} boton={b} onSeleccionar={seleccionar} tooltipArriba activo={b.activo} />
          ))}
        </div>
      </nav>

      {/* Modales */}
      {modal === 'perfil' && perfil && (
        <ModalPerfil
          perfil={perfil}
          onGuardar={guardarDescripcion}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal === 'seleccionarPlanta' && (
        <ModalSeleccionPlanta onSeleccionar={onPlantaElegida} onCerrar={cerrarSiembra} />
      )}
      {modal === 'cantidad' && plantaSeleccionada && (
        <ModalCantidadSiembra
          planta={plantaSeleccionada}
          zona={zonaActual}
          parcela={parcelaElegida}
          maximo={capacidadParcela(areaParcela(parcelaElegida), distribucion.maxPlantas, plantaSeleccionada)}
          m2={areaParcela(parcelaElegida)}
          enviando={loadingAccion}
          error={errorAccion}
          onConfirmar={confirmarSiembra}
          onCerrar={cerrarSiembra}
        />
      )}
      {cultivoInfo && (
        <ModalInfoCultivo
          cultivo={cultivoInfo}
          zona={cultivoInfo.zona}
          parcela={cultivoInfo.parcela}
          ahora={ahora}
          enviando={loadingAccion}
          onCosechar={cultivo=>{setCultivoInfo(null);setHerramientaActiva('cosecha');setMensajeAccion(`Selecciona la parcela de ${cultivo.planta?.nombre||'este cultivo'} con la herramienta Cosechar.`)}}
          disponibilidadCosecha={checklist.tareas.find(t=>t.actividad.codigo==='cosecha'&&`${t.cultivo?.plantaId}:${t.cultivo?.fechaSiembra}`===cultivoInfo.id)?.disponibilidad}
          onCerrar={() => setCultivoInfo(null)}
        />
      )}
      {modal === 'recordatorios' && <PanelActividades checklist={checklist} ejecutar={ejecutar} conClave={conClave}
        vistaInicial={vistaPanel} onRegar={()=>{setModal(null);setHerramientaActiva('riego')}}
        onCosechar={t=>{const section=checklist.panel?.zonas?.find(s=>s.id===t.zona?.id);if(section?.zona)setZona(section.zona);setModal(null);setHerramientaActiva('cosecha')}}
        cultivosVista={huerto.cultivos}
        ocupado={loadingAccion} seleccionInicial={seccionPanel} error={errorAccion} mensaje={mensajeAccion}
        onCerrar={()=>setModal(null)}/>}
      {cultivoParaCosecha&&<ModalCosechaHerramienta key={cultivoParaCosecha.id}
        cultivo={cultivoParaCosecha} tarea={tareaCosecha} cargando={checklist.cargando}
        ocupado={loadingAccion} error={errorAccion}
        onConfirmar={confirmaciones=>ejecutar(()=>checklist.completar(tareaCosecha.id,confirmaciones))}
        onCerrar={()=>setCultivoParaCosecha(null)}/>}

      <PanelAjustes abierto={ajustesAbierto} onCerrar={() => setAjustesAbierto(false)} />
    </div>
  )
}

export default Juego
