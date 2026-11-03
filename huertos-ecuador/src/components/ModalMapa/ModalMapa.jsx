import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import Button from '../Button/Button'
import styles from './ModalMapa.module.css'

const icono = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const CENTRO_INICIAL = [-0.1807, -78.4678] // Quito

function AlHacerClic({ onElegir }) {
  useMapEvents({
    click(e) {
      onElegir({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function VolarA({ posicion }) {
  const map = useMap()
  useEffect(() => {
    if (posicion?.lat && posicion?.lng) {
      map.flyTo([posicion.lat, posicion.lng], 15, { duration: 1.2 })
    }
  }, [posicion, map])
  return null
}

function formatearDireccion(nominatimData) {
  if (!nominatimData) return ''
  const addr = nominatimData.address || {}
  const lugar = addr.neighbourhood || addr.suburb || addr.road || ''
  const ciudad = addr.city || addr.town || addr.village || addr.county || ''
  const provincia = addr.state || ''

  const partes = [lugar, ciudad, provincia].filter(Boolean)
  if (partes.length > 0) return `${partes.join(', ')} (Ecuador)`
  return nominatimData.display_name?.split(',').slice(0, 3).join(',') || 'Ecuador'
}

function ModalMapa({ inicial, onConfirmar, onCerrar }) {
  const [posicion, setPosicion] = useState(inicial ? { lat: inicial.lat, lng: inicial.lng } : null)
  const [direccion, setDireccion] = useState(inicial?.direccion || '')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')

  // Geocodificación inversa: obtener nombre legible de lat/lng en JSON
  async function consultarGeocodificacionInversa(lat, lng) {
    try {
      setAviso('Obteniendo dirección...')
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      })
      if (!res.ok) throw new Error('Error en geocodificación inversa')
      const data = await res.json()
      const dirTexto = formatearDireccion(data)
      setDireccion(dirTexto)
      setAviso('')
    } catch {
      setDireccion(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
      setAviso('')
    }
  }

  function handleElegirPunto(coords) {
    setPosicion(coords)
    consultarGeocodificacionInversa(coords.lat, coords.lng)
  }

  // Geocodificación directa: buscar texto y obtener coordenadas en JSON
  async function handleBuscar(e) {
    e.preventDefault()
    const query = busqueda.trim()
    if (!query) return

    setBuscando(true)
    setAviso('')
    setResultados([])

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ec&format=json&limit=5`
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      })
      if (!res.ok) throw new Error('Error en búsqueda')
      const data = await res.json()

      if (data.length === 0) {
        setAviso('No se encontraron ubicaciones con ese nombre en Ecuador.')
      } else {
        setResultados(data)
      }
    } catch {
      setAviso('No se pudo conectar al servicio de geocodificación.')
    } finally {
      setBuscando(false)
    }
  }

  function seleccionarResultado(item) {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    const pos = { lat, lng }
    setPosicion(pos)
    setDireccion(item.display_name?.split(',').slice(0, 3).join(',') || item.display_name)
    setResultados([])
    setBusqueda('')
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setAviso('Tu navegador no permite obtener la ubicación')
      return
    }
    setAviso('Obteniendo tu ubicación actual...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        handleElegirPunto(coords)
      },
      () => setAviso('No se pudo obtener tu ubicación')
    )
  }

  function confirmarUbicacion() {
    if (!posicion) return
    onConfirmar({
      lat: posicion.lat,
      lng: posicion.lng,
      direccion: direccion || `${posicion.lat.toFixed(4)}, ${posicion.lng.toFixed(4)}`,
    })
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-mapa-titulo">
        <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
        <h2 id="modal-mapa-titulo">Ubicación del Huerto</h2>
        <p className={styles.ayuda}>Escribe una ciudad/cantón o haz clic directamente en el mapa</p>

        {/* Buscador con Geocodificación directa Nominatim */}
        <div className={styles.buscadorWrap}>
          <form className={styles.buscadorForm} onSubmit={handleBuscar}>
            <input
              className={styles.inputBusqueda}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cantón o ciudad (ej. Ambato, Pelileo, Quito)..."
            />
            <button className={styles.btnBuscar} type="submit" disabled={buscando || !busqueda.trim()}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {resultados.length > 0 && (
            <ul className={styles.listaResultados} role="listbox">
              {resultados.map((r, i) => (
                <li
                  key={i}
                  className={styles.itemResultado}
                  role="option"
                  onClick={() => seleccionarResultado(r)}
                >
                  📍 {r.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mapa interactivo React Leaflet */}
        <div className={styles.mapa}>
          <MapContainer
            center={posicion ? [posicion.lat, posicion.lng] : CENTRO_INICIAL}
            zoom={posicion ? 15 : 12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AlHacerClic onElegir={handleElegirPunto} />
            <VolarA posicion={posicion} />
            {posicion && <Marker position={[posicion.lat, posicion.lng]} icon={icono} />}
          </MapContainer>
        </div>

        {/* Datos geocodificados resultantes en JSON */}
        {posicion && (
          <div className={styles.infoGeocodificacion}>
            {direccion && <p className={styles.direccion}>📍 {direccion}</p>}
            <p className={styles.coords}>
              Coordenadas: {posicion.lat.toFixed(5)}, {posicion.lng.toFixed(5)}
            </p>
          </div>
        )}

        {aviso && <p className={styles.aviso} role="status">⚠ {aviso}</p>}

        <div className={styles.acciones}>
          <Button variante="bloque" onClick={usarMiUbicacion}>
            Mi ubicación
          </Button>
          <Button variante="bloque" disabled={!posicion} onClick={confirmarUbicacion}>
            Confirmar
          </Button>
        </div>
      </section>
    </div>
  )
}

export default ModalMapa
