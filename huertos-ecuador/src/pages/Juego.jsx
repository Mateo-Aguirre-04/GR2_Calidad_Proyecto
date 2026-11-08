import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authenticatedFetch } from '../authSession'
import { useHuerto } from '../hooks/useHuerto'
import { usePerfil } from '../hooks/usePerfil'
import { useClima } from '../hooks/useClima'
import { useFaseLunar } from '../hooks/useFaseLunar'
import { useAhora } from '../hooks/useAhora'
import { useRecordatorios } from '../hooks/useRecordatorios'
import { fondoHuerto, capacidadParcela, m2PorParcela } from '../data/parcelasHuerto'
import Parcela from '../components/Parcela/Parcela'
import ModalCantidadSiembra from '../components/ModalCantidadSimebra/ModalCantidadSiembra'
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
  const { pendientes } = useRecordatorios(ahora, usuarioActual?.id)
  const [zona, setZona] = useState(1)
  const [parcelaElegida, setParcelaElegida] = useState(null)

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

  async function confirmarSiembra(cantidadPedida) {
  setLoadingAccion(true)
  setErrorAccion('')
  try {
    const max = capacidadParcela(tipo, plantaSeleccionada)
    const cantidad = Math.min(Math.max(1, Math.trunc(Number(cantidadPedida)) || 1), max)

    const resp = await authenticatedFetch(`/api/huertos/${huerto.id}/sembrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantaId: plantaSeleccionada.id, zona: zonaActual, parcela: parcelaElegida, cantidad }),
    })
    if (!resp.ok) throw new Error((await resp.json()).error || 'No se pudo guardar la siembra.')
    await resp.json()
    recargar()
  } catch (e) {
    setErrorAccion(e.message)
  } finally {
    setLoadingAccion(false)
    cerrarSiembra()
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

  const tipo = huerto.tipo ?? 'surcos'
  const fondo = fondoHuerto(tipo)
  const zonas = huerto.parcelas?.zonas ?? [fondo.parcelas.length]
  const zonaActual = Math.min(zona, zonas.length)
  const habilitadas = fondo.parcelas.slice(0, Math.min(zonas[zonaActual - 1], fondo.parcelas.length))
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
            onSembrar={elegirParcela}
            onCosechar={onCultivoSeleccionado}
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
          maximo={capacidadParcela(tipo, plantaSeleccionada)}
          m2={m2PorParcela(tipo)}
          enviando={loadingAccion}
          onConfirmar={confirmarSiembra}
          onCerrar={cerrarSiembra}
        />
      )}
    </div>
  )
}

export default Juego
