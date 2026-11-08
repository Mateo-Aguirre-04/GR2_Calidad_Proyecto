import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authenticatedFetch } from '../authSession'
import { useHuerto } from '../hooks/useHuerto'
import { usePerfil } from '../hooks/usePerfil'
import { useClima } from '../hooks/useClima'
import { useFaseLunar } from '../hooks/useFaseLunar'
import { useAhora } from '../hooks/useAhora'
import { useRecordatorios } from '../hooks/useRecordatorios'
import Cultivo from '../components/Cultivo/Cultivo'
import BotonLateral from '../components/BotonLateral/BotonLateral'
import IconoEstado from '../components/IconoEstado/IconoEstado'
import ModalPerfil from '../components/ModalPerfil/ModalPerfil'
import ModalSeleccionPlanta from '../components/ModalSeleccionPlanta/ModalSeleccionPlanta'
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
  { clave: 'siembra', nombre: 'Sembrar',  etiqueta: 'Sembrar',  emoji: '🌰', accion: 'pendiente', pulsar: true },
  { clave: 'cosecha', nombre: 'Cosechar', etiqueta: 'Cosechar', emoji: '🧺', accion: 'pendiente' },
]

const MEDALLAS = { Novato: '🌱', Aprendiz: '🥉', Oficial: '🥈', Maestro: '🥇' }

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
  const { pendientes, lista: listaRecordatorios, completar: completarRecordatorio, error: errorRecordatorios, cargando: cargandoRecordatorios, fuentes, recargar: recargarRecordatorios } = useRecordatorios(usuarioActual?.id)

  // UI state
  const [modal, setModal] = useState(null) // 'perfil' | 'seleccionarPlanta' | null
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [herramientaActiva, setHerramientaActiva] = useState(null) // 'siembra' | 'cosecha'
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null) // plant chosen for planting

  // Handler for lateral button selection
  function seleccionar(boton) {
    if (boton.accion === 'ruta') {
      navigate(boton.destino)
    } else if (boton.accion === 'modal') {
      setModal(boton.clave)
    } else if (boton.clave === 'recordatorios') {
      setModal('recordatorios')
    } else if (boton.clave === 'siembra') {
      setHerramientaActiva('siembra')
      setModal('seleccionarPlanta')
    } else if (boton.clave === 'cosecha') {
      setHerramientaActiva('cosecha')
    }
    // pendiente does nothing
  }

  // Callback when a plant is chosen from the catalog modal
  function onPlantaElegida(planta) {
    setPlantaSeleccionada(planta)
    setModal(null)
  }

  function sembrarEnHuerto(event) {
    if (herramientaActiva !== 'siembra' || !plantaSeleccionada || loadingAccion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))
    onPosicionConfirmada({ x, y })
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
    setLoadingAccion(true)
    setErrorAccion('')
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

  const herramientas = HERRAMIENTAS.map((h) => {
    const lista = pendientes[h.clave] ?? [];
    const extra = lista.length > 1 ? ` (+${lista.length - 1} más)` : '';
    return {
      ...h,
      cantidad: lista.length,
      descripcion: lista.length ? `${lista[0].texto}${extra}` : '',
    };
  });

  return (
    <div className={styles.pantalla} style={{ backgroundImage: `url(/huertos/${huerto.tipo ?? 'surcos'}.png)` }}>
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
      {herramientaActiva === 'siembra' && plantaSeleccionada && (
        <p className={styles.avisoSiembra} role="status">Elige una posición en el huerto para sembrar {plantaSeleccionada.nombre}.</p>
      )}
      <div
        className={styles.huerto}
        onClick={sembrarEnHuerto}
        role={herramientaActiva === 'siembra' && plantaSeleccionada ? 'button' : undefined}
        tabIndex={herramientaActiva === 'siembra' && plantaSeleccionada ? 0 : undefined}
        aria-label={herramientaActiva === 'siembra' && plantaSeleccionada ? `Sembrar ${plantaSeleccionada.nombre} en el huerto` : undefined}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && herramientaActiva === 'siembra' && plantaSeleccionada && !loadingAccion) {
            event.preventDefault()
            onPosicionConfirmada({ x: 50, y: 50 })
          }
        }}
      >
        {huerto.cultivos.map((cultivo) => (
          <Cultivo
            key={cultivo.id}
            cultivo={cultivo}
            ahora={ahora}
            selectable={herramientaActiva === 'cosecha'}
            onSelect={onCultivoSeleccionado}
          />
        ))}
      </div>

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
        <ModalSeleccionPlanta onSeleccionar={onPlantaElegida} onCerrar={() => setModal(null)} />
      )}
      {modal === 'recordatorios' && (
        <div className={styles.recordatoriosOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
          <section className={styles.recordatoriosPanel} role="dialog" aria-modal="true" aria-labelledby="recordatorios-titulo">
            <button className={styles.recordatoriosCerrar} type="button" onClick={() => setModal(null)} aria-label="Cerrar recordatorios">×</button>
            <h2 id="recordatorios-titulo">Recordatorios del huerto</h2>
            <p>Se calculan con los registros del huerto, el calendario lunar y el pronóstico disponible.</p>
            {errorRecordatorios && <p role="alert">{errorRecordatorios} <button type="button" onClick={recargarRecordatorios}>Reintentar</button></p>}
            {errorAccion && <p role="alert">{errorAccion}</p>}
            {cargandoRecordatorios && <p role="status">Consultando condiciones actuales…</p>}
            {!cargandoRecordatorios && !errorRecordatorios && listaRecordatorios.length === 0 && <p>No hay recordatorios activos por ahora.</p>}
            <ul className={styles.recordatoriosLista}>
              {listaRecordatorios.map((recordatorio) => (
                <li key={recordatorio.id}>
                  <strong>{recordatorio.tipo.replaceAll('_', ' ')}</strong>
                  <span>{recordatorio.texto}</span>
                  <small>Fuente: {recordatorio.fuente}</small>
                  {recordatorio.accion && <button type="button" onClick={async () => {
                    setErrorAccion('')
                    try { await completarRecordatorio(recordatorio) } catch (error) { setErrorAccion(error.message) }
                  }}>Registrar actividad</button>}
                </li>
              ))}
            </ul>
            <footer>{Object.entries(fuentes).map(([key, value]) => <small key={key}>{key}: {value} · </small>)}</footer>
          </section>
        </div>
      )}
    </div>
  )
}

export default Juego
