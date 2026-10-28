import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const icono = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapaMiniatura({ posicion }) {
  const centro = [posicion.lat, posicion.lng]

  return (
    <MapContainer
      // key fuerza a recrear el mapa cuando cambia el punto
      key={`${posicion.lat}-${posicion.lng}`}
      center={centro}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={centro} icon={icono} interactive={false} />
    </MapContainer>
  )
}

export default MapaMiniatura