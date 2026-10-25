import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import Button from '../Button/Button'
import styles from './ModalMapa.module.css'

// Vite no resuelve solo las imágenes del marcador, hay que indicarlas
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
    if (posicion) map.flyTo([posicion.lat, posicion.lng], 16)
  }, [posicion, map])
  return null
}

function ModalMapa({ inicial, onConfirmar, onCerrar }) {
  const [posicion, setPosicion] = useState(inicial)
  const [aviso, setAviso] = useState('')

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setAviso('Tu navegador no permite obtener la ubicación')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicion({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAviso('')
      },
      () => setAviso('No se pudo obtener tu ubicación')
    )
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-mapa-titulo">
        <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">×</button>
        <h2 id="modal-mapa-titulo">Ubicación del huerto</h2>
        <p className={styles.ayuda}>Toca el mapa para colocar el marcador</p>

        <div className={styles.mapa}>
          <MapContainer
            center={inicial ? [inicial.lat, inicial.lng] : CENTRO_INICIAL}
            zoom={inicial ? 16 : 12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AlHacerClic onElegir={setPosicion} />
            <VolarA posicion={posicion} />
            {posicion && <Marker position={[posicion.lat, posicion.lng]} icon={icono} />}
          </MapContainer>
        </div>

        {aviso && <p className={styles.aviso} role="alert">⚠ {aviso}</p>}
        {posicion && (
          <p className={styles.coords}>{posicion.lat.toFixed(5)}, {posicion.lng.toFixed(5)}</p>
        )}

        <div className={styles.acciones}>
          <Button variante="bloque" onClick={usarMiUbicacion}>Mi ubicación</Button>
          <Button variante="bloque" disabled={!posicion} onClick={() => onConfirmar(posicion)}>
            Confirmar
          </Button>
        </div>
      </section>
    </div>
  )
}

export default ModalMapa