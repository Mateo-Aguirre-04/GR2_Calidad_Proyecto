import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useHuerto } from '../hooks/useHuerto'
import { usePerfil } from '../hooks/usePerfil'
import { useClima } from '../hooks/useClima'
import { useFaseLunar } from '../hooks/useFaseLunar'
import { useAhora } from '../hooks/useAhora'
import { useChecklist } from '../hooks/useChecklist'
import { fondoHuerto, capacidadParcela, distribucionHuerto } from '../data/parcelasHuerto'
import { DURACION_COSECHA_MS, listaParaCosechar } from '../data/fasesPlanta'
import Parcela from '../components/Parcela/Parcela'
import ModalCantidadSiembra from '../components/ModalCantidadSimebra/ModalCantidadSiembra'
import BotonLateral from '../components/BotonLateral/BotonLateral'
import IconoEstado from '../components/IconoEstado/IconoEstado'
import ModalPerfil from '../components/ModalPerfil/ModalPerfil'
import ModalSeleccionPlanta from '../components/ModalSeleccionPlanta/ModalSeleccionPlanta'
import ModalInfoCultivo from '../components/ModalInfoCultivo/ModalInfoCultivo'
import styles from './css/Juego.module.css'

// accion: 'ruta' navega, 'modal' abre un modal, 'pendiente' aún sin definir.
// Las descripciones son fijas, no vienen de la base.
const BOTONES = [
  { clave: 'ajustes',       nombre: 'Ajustes',       etiqueta: 'Ajustes',       emoji: '⚙️', descripcion: 'Cambia las opciones de tu cuenta y del juego.', accion: 'pendiente' },
  { clave: 'foro',          nombre: 'Foro',          etiqueta: 'Foro',          emoji: '💬', descripcion: 'Conversa con otros jardineros.',               accion: 'pendiente' },
  { clave: 'gremio',        nombre: 'Gremio',        etiqueta: 'Gremio',        emoji: '🛡️', descripcion: 'Mira a tu gremio y su ranking.',               accion: 'ruta', destino: '/gremio' },
  { clave: 'catalogo',      nombre: 'Catálogo',      etiqueta: 'Catálogo',      emoji: '📖', descripcion: 'Consulta las plantas disponibles.',            accion: 'ruta', destino: '/catalogo-plantas' },
  { clave: 'recordatorios', nombre: 'Recordatorios', etiqueta: 'Recordatorios', emoji: '🔔', descripcion: 'Revisa tus tareas pendientes.',                accion: 'pendiente' },
]

const HERRAMIENTAS = [
  { clave: 'riego',   nombre: 'Regar',    etiqueta: 'Regar',    emoji: '🚿', accion: 'pendiente' },
  { clave: 'cosecha', nombre: 'Cosechar', etiqueta: 'Cosechar', emoji: '🧺', accion: 'pendiente' },
]

const MEDALLAS = { Novato: '🌱', Aprendiz: '🥉', Oficial: '🥈', Maestro: '🥇' }

const PRESENTACION_RECORDATORIOS = {
  siembra: ['🌙', 'Siembra', 'Mañana se abre la ventana lunar para sembrar.'],
  riego: ['💧', 'Riego', 'Revisa qué cultivos necesitan agua hoy.'],
  riego_previo_cosecha: ['💧', 'Riego para cosecha', 'Riega dos días antes de la fecha posible de cosecha.'],
  cosecha: ['🌾', 'Cosecha', 'Revisa la madurez, el riego y las condiciones antes de cosechar.'],
  cosecha_clima: ['☀️', 'Clima para cosechar', 'Hoy hay sol y no se registra lluvia.'],
  cosecha_rocio: ['💧', 'Rocío', 'Comprueba que el rocío se haya secado antes de recolectar.'],
  cosecha_lunar: ['🌙', 'Fase lunar', 'Mañana comienza la fase lunar adecuada para esta cosecha.'],
  retiro_maleza: ['🌱', 'Retirar maleza', 'Revisa la fase lunar y el pronóstico del tiempo.'],
  preparacion_tierra: ['🪴', 'Preparar la tierra', 'La zona está lista para preparar después de retirar la maleza.'],
  secado_almacenamiento: ['🧺', 'Secado', 'El secado llegó al día 10; revisa si ya puedes almacenar.'],
  limpieza_huerto: ['🧹', 'Limpiar el huerto', 'Una jornada de limpieza está programada.'],
  abono_organico: ['🌿', 'Aplicar abono', 'Hay abono orgánico programado para un cultivo.'],
  senaletica: ['🪧', 'Señalética', 'Organiza las zonas con su señalética.'],
  ritual_agradecimiento: ['🙏', 'Agradecimiento', 'Recuerda el ritual de la jornada de cosecha.'],
  ritual_mensual: ['🙏', 'Ritual mensual', 'Mañana es 15: realiza el ritual de agradecimiento a la Pachamama.'],
}

function resumirRecordatorios(recordatorios) {
  const unicos = new Map()
  for (const recordatorio of recordatorios) {
    const presentacion = PRESENTACION_RECORDATORIOS[recordatorio.tipo]
    if (!presentacion) continue
    const clave = `${recordatorio.tipo}:${recordatorio.texto || ''}`
    if (!unicos.has(clave)) {
      const anticipados = {
        riego_previo_cosecha: recordatorio.texto,
        retiro_maleza: 'Mañana se aproxima la luna nueva; revisa el pronóstico.',
        secado_almacenamiento: 'Mañana se cumplen 10 días de secado.',
        limpieza_huerto: 'Mañana: jornada de limpieza programada.',
        abono_organico: 'Mañana: aplicación de abono programada.',
        senaletica: 'Mañana: organiza las zonas con señalética.',
        ritual_agradecimiento: 'Mañana: ritual de agradecimiento programado.',
      }
      const descripcion = recordatorio.anticipado
        ? (anticipados[recordatorio.tipo] || presentacion[2])
        : presentacion[2]
      unicos.set(clave, { recordatorio, presentacion, descripcion })
    }
  }
  return [...unicos.values()]
}

function Juego() {
  const navigate = useNavigate()
  const [usuarioActual] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario_actual')) } catch { return null }
  })
  const { huerto, cargando, error: errorHuerto, recargar } = useHuerto()
  const { perfil, guardarDescripcion } = usePerfil(usuarioActual?.id)
  const clima = useClima(huerto?.ubicacion)
  const luna = useFaseLunar()
  const ahora = useAhora()
  const checklist = useChecklist(huerto?.id)
  const [zona, setZona] = useState(1)
  const [parcelaElegida, setParcelaElegida] = useState(null)

  // UI state
  const [modal, setModal] = useState(null) // 'perfil' | 'seleccionarPlanta' | null
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [herramientaActiva, setHerramientaActiva] = useState(null) // 'siembra' | 'cosecha'
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null) // plant chosen for planting
  const [cultivoInfo, setCultivoInfo] = useState(null) // cultivo cuya información se muestra
  const [cosechaAnimada, setCosechaAnimada] = useState(null) // id del cultivo que se está cosechando

  // Handler for lateral button selection
  function seleccionar(boton) {
    if (boton.accion === 'ruta') {
      navigate(boton.destino)
    } else if (boton.accion === 'modal') {
      setModal(boton.clave)
    } else if (boton.clave === 'recordatorios') {
      setModal('recordatorios')
    } else if (boton.clave === 'riego') {
      setHerramientaActiva('riego')
    } else if (boton.clave === 'cosecha') {
      setHerramientaActiva('cosecha')
    }
    // pendiente does nothing
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

  // Las posiciones de cultivo son porcentajes dentro del huerto.
  async function onPosicionConfirmada({ x, y }) {
    if (!plantaSeleccionada) return
    setLoadingAccion(true)
    setErrorAccion('')
    try {
      const resp = await authenticatedFetch(`/api/huertos/${huerto.id}/sembrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantaId: plantaSeleccionada.id, x, y }),
      })
      if (!resp.ok) throw new Error((await resp.json()).error || 'No se pudo guardar la siembra.')
      await resp.json()
      recargar()
    } catch (e) {
      setErrorAccion(e.message)
    } finally {
      setLoadingAccion(false)
      setModal(null)
      setHerramientaActiva(null)
      setPlantaSeleccionada(null)
    }
  }

  // Callback when a mature crop is selected for harvest
  async function onCultivoSeleccionado(cultivo) {
    const separadorFecha = String(cultivo.id).indexOf(':')
    const fechaSiembra = separadorFecha >= 0 ? String(cultivo.id).slice(separadorFecha + 1) : null
    if (herramientaActiva === 'riego') {
      setLoadingAccion(true)
      setErrorAccion('')
      try {
        if (!fechaSiembra) throw new Error('No se encontró la fecha exacta del cultivo.')
        await checklist.registrarRiegos([{ plantaId: String(cultivo.plantaId), fechaSiembra }], crypto.randomUUID())
        recargar()
      } catch (e) { setErrorAccion(e.message) }
      finally { setLoadingAccion(false); setHerramientaActiva(null) }
      return
    }
    if (!listaParaCosechar(cultivo, Date.now())) {
      setErrorAccion(`${cultivo.planta?.nombre ?? 'La planta'} aún no está en la fase de cosecha.`)
      return
    }
    setLoadingAccion(true)
    setErrorAccion('')
    setCultivoInfo(null) // cierra el modal para que se vea la animación
    try {
      const resp = await authenticatedFetch(`/api/huertos/${huerto.id}/cosechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cultivoId: cultivo.id }),
      })
      if (!resp.ok) throw new Error((await resp.json()).error || 'No se pudo guardar la cosecha.')
      await resp.json()
      recargar()
    } catch (e) {
      setErrorAccion(e.message)
    } finally {
      setLoadingAccion(false)
      setHerramientaActiva(null)
    }
  }

  if (!usuarioActual) return <Navigate to="/" replace />
  if (errorHuerto) return <p role="alert">No pudimos cargar tu huerto. Inténtalo nuevamente. <button onClick={recargar}>Reintentar</button></p>

  if (cargando || !huerto) {
    return <p className={styles.cargando} role="status">Cargando huerto...</p>
  }

  const listaRecordatorios = checklist.recordatorios || []
  const recordatoriosVisibles = resumirRecordatorios(listaRecordatorios)
  const listaTareas = checklist.tareas || []
  const herramientas = HERRAMIENTAS.map(h => ({ ...h, cantidad: h.clave === 'riego' ? listaTareas.filter(t => t.actividad?.codigo === 'riego' && t.disponibilidad?.puedeCompletar).length : 0 }))

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
    <div className={styles.pantalla} style={{ '--fondo': `url(/huertos/${tipo}.png)` }}>
      {errorAccion && <p className={styles.avisoSiembra} role="alert">{errorAccion}</p>}
      {/* Jugador (arriba a la izquierda): abre el perfil */}
      <button type="button" className={styles.jugador} onClick={() => setModal('perfil')} aria-label="Abrir mi perfil">
        <span className={styles.avatar}>
          {perfil?.avatar ? <img src={perfil.avatar} alt="" /> : <span aria-hidden="true">🧑‍🌾</span>}
        </span>
        <span className={styles.placa}>
          <span className={styles.nombre}>{perfil?.nombre ?? '...'}</span>
          <span aria-hidden="true">{MEDALLAS[perfil?.rango] ?? '🏅'}</span>
        </span>
      </button>

      {/* Clima y fase lunar */}
      <div className={styles.estados}>
        <IconoEstado
          id="clima"
          key={clima.clave}
          src={`/clima/${clima.clave}.png`}
          emoji={clima.emoji}
          etiqueta={clima.temperatura !== null ? `${clima.etiqueta} (${clima.temperatura}°C)` : clima.etiqueta}
          descripcion={clima.descripcion}
        />
        <IconoEstado
          id="luna"
          key={luna.clave}
          src={`/luna/${luna.clave}.png`}
          emoji={luna.emoji}
          etiqueta={`${luna.etiqueta} (${luna.iluminacion}%)`}
          descripcion={luna.descripcion}
        />
      </div>

      {/* Huerto: render each cultivo */}
      <div className={styles.escenario} style={{ '--relacion': fondo.relacion, backgroundImage: `url(/huertos/${tipo}.png)` }}>
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
            onSembrar={elegirParcela}
            onCosechar={onCultivoSeleccionado}
            onVerInfo={setCultivoInfo}
          />
        ))}
      </div>

      {zonas.length > 1 && (
        <nav className={styles.zonas} aria-label="Zonas del huerto">
          <button type="button" onClick={() => setZona(zonaActual - 1)} disabled={zonaActual === 1} aria-label="Zona anterior">◀</button>
          <span>Zona {zonaActual} de {zonas.length}</span>
          <button type="button" onClick={() => setZona(zonaActual + 1)} disabled={zonaActual === zonas.length} aria-label="Zona siguiente">▶</button>
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
            <BotonLateral key={b.clave} boton={b} onSeleccionar={seleccionar} tooltipArriba />
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
          onCosechar={onCultivoSeleccionado}
          onCerrar={() => setCultivoInfo(null)}
        />
      )}
      {modal === 'recordatorios' && (
        <div className={styles.recordatoriosOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
          <section className={styles.recordatoriosPanel} role="dialog" aria-modal="true" aria-labelledby="recordatorios-titulo">
            <button className={styles.recordatoriosCerrar} type="button" onClick={() => setModal(null)} aria-label="Cerrar recordatorios">×</button>
            <header className={styles.recordatoriosEncabezado}>
              <span className={styles.recordatoriosIcono} aria-hidden="true">🌿</span>
              <div>
                <h2 id="recordatorios-titulo">Cuidados del huerto</h2>
                <p>Un resumen de lo que puedes atender.</p>
              </div>
            </header>
            {checklist.error && <p className={styles.recordatoriosEstado} role="alert">No se pudieron cargar los cuidados.</p>}
            {checklist.cargando && <p className={styles.recordatoriosEstado} role="status">Cargando cuidados…</p>}
            {!checklist.cargando && !checklist.error && recordatoriosVisibles.length === 0 && <p className={styles.recordatoriosEstado}>No hay cuidados pendientes por ahora.</p>}
            <ul className={styles.recordatoriosLista}>
              {recordatoriosVisibles.map(({ recordatorio, presentacion, descripcion }, index) => (
                <li key={`${recordatorio.tipo}-${recordatorio.zonaId || recordatorio.tareaId || index}`}>
                  <span className={styles.recordatoriosTarjetaIcono} aria-hidden="true">{presentacion[0]}</span>
                  <div className={styles.recordatoriosTexto}>
                    <strong>{presentacion[1]}</strong>
                    <span>{descripcion}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

export default Juego