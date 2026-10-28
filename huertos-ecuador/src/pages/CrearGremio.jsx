import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import Button from '../components/Button/Button'
import ModalMapa from '../components/ModalMapa/ModalMapa'
import MapaMiniatura from '../components/MapaMiniatura/MapaMiniatura'
import styles from './css/CrearGremio.module.css'

const TIPOS_SUELO = ['Arcilloso', 'Arenoso', 'Limoso', 'Franco', 'Humífero']
const TIPOS_RIEGO = ['Manual', 'Goteo', 'Aspersión', 'Lluvia / secano']

function CrearGremio() {
  const navigate = useNavigate()
  const inputFoto = useRef(null)

  const [valores, setValores] = useState({
    nombre: '',
    area: '',
    suelo: '',
    riego: '',
  })
  const [ubicacion, setUbicacion] = useState(null) // { lat, lng }
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [foto, setFoto] = useState(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState('')

  function actualizar(e) {
    const { name, value } = e.target
    setValores((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!ubicacion) return setError('Selecciona la ubicación del huerto')
    if (!aceptaTerminos) return setError('Debes aceptar los términos')
    setError('')

    const datos = new FormData()
    datos.append('nombre', valores.nombre)
    datos.append('area', valores.area)
    datos.append('suelo', valores.suelo)
    datos.append('riego', valores.riego)
    datos.append('lat', ubicacion.lat)
    datos.append('lng', ubicacion.lng)
    if (foto) datos.append('foto', foto)

    // aquí envías `datos` a tu API
    console.log([...datos.entries()])
  }

  return (
    <div className="pagina">
      <Header pregunta="¡Hasta pronto!" textoEnlace="Cerrar sesión" destino="/" />

      <main className={styles.contenido}>
        <Tarjeta ancho={600} aria-labelledby="registro-gremio">
          <p className={styles.eyebrow}>CREAR MI GREMIO</p>
          <h1 className={styles.titulo} id="registro-gremio">Cuestionario de Huerto</h1>

          <form className={styles.formulario} onSubmit={handleSubmit}>
            {/* Ubicación: ahora abre el modal con el mapa */}
            <div className={styles.anchoCompleto}>
                <span className={styles.etiqueta}>Ubicación</span>
                <div className={`${styles.mapa} ${error && !ubicacion ? styles.mapaError : ''}`}>
                    {ubicacion ? (
                    <>
                        <MapaMiniatura posicion={ubicacion} />
                        <span className={styles.coordenadas}>
                        {ubicacion.lat.toFixed(4)}, {ubicacion.lng.toFixed(4)}
                        </span>
                    </>
                    ) : (
                    <div className={styles.vacio}>
                        <span className={styles.pin} aria-hidden="true">📍</span>
                        <span className={styles.mapaTexto}>Seleccionar</span>
                    </div>
                    )}

                    {/* Capa transparente que recibe el clic y abre el modal */}
                    <button
                    type="button"
                    className={styles.abrirMapa}
                    onClick={() => setMapaAbierto(true)}
                    aria-label={ubicacion ? 'Cambiar ubicación del huerto' : 'Seleccionar ubicación del huerto'}
                    />
                </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor="nombre">Nombre del gremio</label>
              <input
                id="nombre"
                name="nombre"
                value={valores.nombre}
                onChange={actualizar}
                placeholder="Mi gremio"
                required
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="area">Área total</label>
              <div className={styles.conUnidad}>
                <input
                  id="area"
                  name="area"
                  type="number"
                  min="1"
                  value={valores.area}
                  onChange={actualizar}
                  required
                />
                <span className={styles.unidad}>m²</span>
              </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor="suelo">Tipo de suelo</label>
              <select id="suelo" name="suelo" value={valores.suelo} onChange={actualizar} required>
                <option value="" disabled>Selecciona</option>
                {TIPOS_SUELO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="riego">Tipo de riego</label>
              <select id="riego" name="riego" value={valores.riego} onChange={actualizar} required>
                <option value="" disabled>Selecciona</option>
                {TIPOS_RIEGO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Foto */}
            <div className={`${styles.campo} ${styles.anchoCompleto}`}>
              <span className={styles.etiqueta}>Foto del espacio</span>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFoto(e.target.files[0] ?? null)}
              />
              <div className={styles.fila}>
                <Button onClick={() => inputFoto.current.click()}>Subir imagen</Button>
                <span className={styles.archivo}>{foto ? foto.name : 'Ningún archivo'}</span>
              </div>
            </div>

            <label className={`${styles.terminos} ${styles.anchoCompleto}`}>
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
              />
              <span>Acepto los términos y condiciones</span>
            </label>

            {error && (
              <p className={`${styles.error} ${styles.anchoCompleto}`} role="alert">⚠ {error}</p>
            )}

            <div className={`${styles.acciones} ${styles.anchoCompleto}`}>
              <Button variante="bloque" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" variante="bloque">Enviar</Button>
            </div>
          </form>

          <p className={styles.nota}>Formulario para iniciar tu huerto.</p>
        </Tarjeta>
      </main>

      {/* Modal del mapa */}
      {mapaAbierto && (
        <ModalMapa
          inicial={ubicacion}
          onCerrar={() => setMapaAbierto(false)}
          onConfirmar={(pos) => {
            setUbicacion(pos)
            setError('')
            setMapaAbierto(false)
          }}
        />
      )}
    </div>
  )
}

export default CrearGremio