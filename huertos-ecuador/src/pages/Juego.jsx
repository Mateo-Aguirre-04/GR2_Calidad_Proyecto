import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import ModalMapa from '../components/ModalMapa/ModalMapa'
import ModalSeleccionPlanta from '../components/ModalSeleccionPlanta/ModalSeleccionPlanta'
import styles from './css/Juego.module.css'

// accion: 'ruta' navega, 'modal' abre un modal, 'pendiente' aún sin definir.
// Las descripciones son fijas, no vienen de la base.
const BOTONES = [
  { clave: 'ajustes',       nombre: 'Ajustes',       etiqueta: 'Ajustes',       emoji: '⚙️', descripcion: 'Cambia las opciones de tu cuenta y del juego.', accion: 'pendiente' },
  { clave: 'foro',          nombre: 'Foro',          etiqueta: 'Foro',          emoji: '💬', descripcion: 'Conversa con otros jardineros.',               accion: 'pendiente' },
  { clave: 'gremio',        nombre: 'Gremio',        etiqueta: 'Gremio',        emoji: '🛡️', descripcion: 'Mira a tu gremio y su ranking.',               accion: 'pendiente' },
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
  const { huerto, cargando, recargar } = useHuerto()
  const { perfil, guardarDescripcion } = usePerfil()
  const clima = useClima(huerto?.ubicacion)
  const luna = useFaseLunar()
  const ahora = useAhora()
  const { pendientes } = useRecordatorios(ahora)

  // UI state
  const [modal, setModal] = useState(null) // 'perfil' | 'seleccionarPlanta' | 'mapa' | null
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [herramientaActiva, setHerramientaActiva] = useState(null) // 'siembra' | 'cosecha'
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null) // plant chosen for planting

  // Handler for lateral button selection
  function seleccionar(boton) {
    if (boton.accion === 'ruta') {
      navigate(boton.destino)
    } else if (boton.accion === 'modal') {
      setModal(boton.clave)
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
    setModal('mapa')
  }

  // Callback when map location is confirmed
  async function onUbicacionConfirmada({ lat, lng }) {
    if (!plantaSeleccionada) return
    setLoadingAccion(true)
    try {
      const resp = await fetch(`/api/huertos/${huerto.id}/sembrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantaId: plantaSeleccionada.id, x: lat, y: lng }),
      })
      if (!resp.ok) throw new Error('Error al sembrar')
      await resp.json()
      recargar()
    } catch (e) {
      console.warn(e)
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
    try {
      const resp = await fetch(`/api/huertos/${huerto.id}/cosechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cultivoId: cultivo.id }),
      })
      if (!resp.ok) throw new Error('Error al cosechar')
      await resp.json()
      recargar()
    } catch (e) {
      console.warn(e)
    } finally {
      setLoadingAccion(false)
      setHerramientaActiva(null)
    }
  }

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
    <div className={styles.pantalla} style={{ backgroundImage: `url(/fondos/${huerto.tipo}.png)` }}>
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
      <div className={styles.huerto}>
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
      {modal === 'mapa' && (
        <ModalMapa
          inicial={null}
          onConfirmar={onUbicacionConfirmada}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default Juego
