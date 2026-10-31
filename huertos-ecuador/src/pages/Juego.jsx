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
  { clave: 'riego',   nombre: 'Regar',    emoji: '🚿', accion: 'pendiente' },
  { clave: 'siembra', nombre: 'Sembrar',  emoji: '🌰', accion: 'pendiente' },
  { clave: 'cosecha', nombre: 'Cosechar', emoji: '🧺', accion: 'pendiente' },
]


const MEDALLAS = { Novato: '🌱', Aprendiz: '🥉', Oficial: '🥈', Maestro: '🥇' }

function Juego() {
    const navigate = useNavigate()
    const { huerto, cargando } = useHuerto()
    const { perfil, guardarDescripcion } = usePerfil()
    const clima = useClima(huerto?.ubicacion)
    const luna = useFaseLunar()
    const ahora = useAhora()
    const [modal, setModal] = useState(null) // 'perfil' | 'ajustes' | ... | null
    const { pendientes } = useRecordatorios(ahora)

  function seleccionar(boton) {
    if (boton.accion === 'ruta') navigate(boton.destino)
    else if (boton.accion === 'modal') setModal(boton.clave)
    // 'pendiente': todavía no hace nada
  }

  if (cargando || !huerto) {
    return <p className={styles.cargando} role="status">Cargando huerto...</p>
  }

  const herramientas = HERRAMIENTAS
  .filter((h) => pendientes[h.clave]?.length > 0)
  .map((h) => {
    const lista = pendientes[h.clave]
    const extra = lista.length > 1 ? ` (+${lista.length - 1} más)` : ''
    return { ...h, cantidad: lista.length, descripcion: `${lista[0].texto}${extra}` }
  })

  return (
    <div
      className={styles.pantalla}
      style={{ backgroundImage: `url(/fondos/${huerto.tipo}.png)` }}
    >
      {/* Jugador (arriba a la izquierda): abre el perfil */}
      <button
        type="button"
        className={styles.jugador}
        onClick={() => setModal('perfil')}
        aria-label="Abrir mi perfil"
      >
        <span className={styles.avatar}>
          {perfil?.avatar
            ? <img src={perfil.avatar} alt="" />
            : <span aria-hidden="true">🧑‍🌾</span>}
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
        etiqueta={clima.etiqueta}
        descripcion={`Clima actual en tu huerto: ${clima.etiqueta.toLowerCase()}.`}
        />
        <IconoEstado
        id="luna"
        key={luna.clave}
        src={`/luna/${luna.clave}.png`}
        emoji={luna.emoji}
        etiqueta={luna.etiqueta}
        descripcion={`Fase lunar de hoy: ${luna.etiqueta.toLowerCase()}. Influye en la siembra.`}
        />
      </div>

      {/* Huerto: una planta por cada registro de la base */}
      <div className={styles.huerto}>
        {huerto.cultivos.map((cultivo) => (
          <Cultivo key={cultivo.id} cultivo={cultivo} ahora={ahora} />
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

      {modal === 'perfil' && perfil && (
        <ModalPerfil
          perfil={perfil}
          onGuardar={guardarDescripcion}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default Juego