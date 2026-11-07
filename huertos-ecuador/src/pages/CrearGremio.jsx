import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import Button from '../components/Button/Button'
import ModalMapa from '../components/ModalMapa/ModalMapa'
import MapaMiniatura from '../components/MapaMiniatura/MapaMiniatura'
import styles from './css/CrearGremio.module.css'

function CrearGremio() {
  const navigate = useNavigate()
  const [configuracion, setConfiguracion] = useState({ suelos: [], riegos: [] })
  const inputFoto = useRef(null)

  const [valores, setValores] = useState({
    nombre: '',
    area: '',
    suelo: '',
    riego: '',
  })
  const [ubicacion, setUbicacion] = useState(null) // { lat, lng, direccion }
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [foto, setFoto] = useState(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Si ya pertenece a un gremio, redirigir al juego
  useEffect(() => {
    try {
      const raw = localStorage.getItem('usuario_actual')
      if (raw) {
        const u = JSON.parse(raw)
        if (u.gremioId) {
          navigate('/juego', { replace: true })
        }
      }
    } catch {}
  }, [navigate])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/gremios/configuracion', { signal: controller.signal, credentials: 'include' })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data })
      .then(setConfiguracion)
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [])


  function actualizar(e) {
    const { name, value } = e.target
    setValores((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!ubicacion) return setError('Selecciona la ubicación del huerto en el mapa')
    if (!aceptaTerminos) return setError('Debes aceptar los términos y condiciones')
    setError('')
    setEnviando(true)

    try {
      let usuarioId = null
      try {
        const raw = localStorage.getItem('usuario_actual')
        if (raw) {
          const u = JSON.parse(raw)
          usuarioId = u.id || u.id_usuario
        }
      } catch {}

      const cuerpo = {
        nombre: valores.nombre,
        area: parseFloat(valores.area),
        suelo: valores.suelo,
        riego: valores.riego,
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        direccion: ubicacion.direccion || 'Ecuador',
        usuarioId,
      }

      const res = await fetch('/api/gremios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })

      const data = await res.json()
      if (res.ok) {
        const gremioGuardado = {
          id: data.gremio.id,
          codigo: data.gremio.codigo,
          nombre: valores.nombre,
          areaTotal: parseFloat(valores.area),
          ubicacion: { lat: ubicacion.lat, lng: ubicacion.lng },
          direccion: ubicacion.direccion || 'Ecuador',
        }
        localStorage.setItem('gremio_activo', JSON.stringify(gremioGuardado))
        localStorage.setItem('huerto_activo_id', String(data.gremio.huerto?.id ?? gremioGuardado.id))
        navigate('/juego')
      } else {
        setError(data.error || 'Error al registrar el gremio')
      }
    } catch {
      setError('No se pudo guardar el gremio en el servidor. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pagina">
      <Header pregunta="¡Hasta pronto!" textoEnlace="Cerrar sesión" destino="/" />

      <main className={styles.contenido}>
        <Tarjeta ancho={600} aria-labelledby="registro-gremio">
          <p className={styles.eyebrow}>CREAR MI GREMIO</p>
          <h1 className={styles.titulo} id="registro-gremio">Cuestionario de Huerto</h1>

          <form className={styles.formulario} onSubmit={handleSubmit}>
            {/* Ubicación: abre el modal con el mapa y geocodificación */}
            <div className={styles.anchoCompleto}>
              <span className={styles.etiqueta}>Ubicación Geocodificada</span>
              <div className={`${styles.mapa} ${error && !ubicacion ? styles.mapaError : ''}`}>
                {ubicacion ? (
                  <>
                    <MapaMiniatura posicion={ubicacion} />
                    <span className={styles.coordenadas}>
                      {ubicacion.direccion
                        ? `${ubicacion.direccion} (${ubicacion.lat.toFixed(3)}, ${ubicacion.lng.toFixed(3)})`
                        : `${ubicacion.lat.toFixed(4)}, ${ubicacion.lng.toFixed(4)}`}
                    </span>
                  </>
                ) : (
                  <div className={styles.vacio}>
                    <span className={styles.pin} aria-hidden="true">📍</span>
                    <span className={styles.mapaTexto}>Buscar o seleccionar en mapa</span>
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
                {configuracion.suelos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={styles.campo}>
              <label htmlFor="riego">Tipo de riego</label>
              <select id="riego" name="riego" value={valores.riego} onChange={actualizar} required>
                <option value="" disabled>Selecciona</option>
                {configuracion.riegos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={`${styles.campo} ${styles.anchoCompleto}`}>
              <label htmlFor="descripcion">Descripción</label>
              <input
                id="descripcion"
                name="descripcion"
                value={valores.descripcion}
                onChange={actualizar}
                placeholder="Descripción de mi gremio"
                required
              />
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
              <Button variante="bloque" onClick={() => navigate(-1)} disabled={enviando}>Cancelar</Button>
              <Button type="submit" variante="bloque" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Enviar'}
              </Button>
            </div>
          </form>

          <p className={styles.nota}>Formulario para iniciar tu huerto comunitario.</p>
        </Tarjeta>
      </main>

      {/* Modal del mapa con Geocodificación y Leaflet */}
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
