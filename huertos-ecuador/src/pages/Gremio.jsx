import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGremio } from '../hooks/useGremio'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import styles from './css/Gremio.module.css'

const PESTANAS = [
  { clave: 'comunidad', titulo: 'Comunidad' },
  { clave: 'miembros',  titulo: 'Miembros' },
]

// Únicos niveles dentro de un gremio
const NIVELES = {
  Fundador: '👑',
  Maestro:  '🎖️',
  Oficial:  '🛡️',
  Miembro:  '🌱',
}

const MAX_DESCRIPCION = 120
const MAX_ANUNCIO = 160

// '2026-02-28' -> '2026/02/28' sin pasar por Date (evita desfases de zona horaria)
function formatearFecha(fecha) {
  return fecha ? String(fecha).slice(0, 10).replaceAll('-', '/') : '—'
}

function Gremio() {
  const navigate = useNavigate()
  const { gremio, cargando, error, reintentar, guardarPerfil } = useGremio()
  const [pestana, setPestana] = useState('comunidad')
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({ descripcion: '', anuncio: '' })
  const [invitacion, setInvitacion] = useState('')
  const [errorInvitacion, setErrorInvitacion] = useState('')
  async function crearInvitacion() {
    try {
      const res = await fetch(`/api/gremios/${gremio.id}/invitacion`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la invitación.')
      setInvitacion(data.codigo)
      setErrorInvitacion('')
    } catch (err) { setErrorInvitacion(err.message) }
  }

  function empezarEdicion() {
    setBorrador({ descripcion: gremio.descripcion ?? '', anuncio: gremio.anuncio ?? '' })
    setEditando(true)
  }

  function guardar() {
    guardarPerfil({ descripcion: borrador.descripcion.trim(), anuncio: borrador.anuncio.trim() })
    setEditando(false)
  }

  const titulo = PESTANAS.find((p) => p.clave === pestana).titulo
  const miembros = gremio?.miembros ?? []
  const enLinea = miembros.filter((m) => m.enLinea).length
  const ranking = [...miembros].sort((a, b) => b.puntos - a.puntos)

  return (
    <div className="pagina">
      <Header pregunta="" textoEnlace="Regresar" destino="/juego" />

      <main className={styles.contenido}>
        {error && <div role="alert"><p>{error}</p><Button onClick={reintentar}>Reintentar</Button></div>}
        {gremio?.fuente === 'mock' && <p role="status">Modo demostración: datos locales, sin conexión a PostgreSQL.</p>}
        {cargando ? (
          <p className={styles.estado} role="status">Cargando gremio...</p>
        ) : (
          gremio && <div className={styles.ventana}>
            <div className={styles.pestanas} role="tablist" aria-label="Secciones del gremio">
              {PESTANAS.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  role="tab"
                  id={`tab-${p.clave}`}
                  aria-selected={pestana === p.clave}
                  aria-controls="panel-gremio"
                  className={`${styles.pestana} ${pestana === p.clave ? styles.activa : ''}`}
                  onClick={() => setPestana(p.clave)}
                >
                  {p.titulo}
                </button>
              ))}
            </div>

            <section className={styles.tarjeta} aria-labelledby="gremio-titulo">
              <header className={styles.encabezado}>
                <span className={styles.logo} aria-hidden="true">
                  {gremio.emblema ? <img src={gremio.emblema} alt="" /> : '🦁'}
                </span>
                <h1 id="gremio-titulo">
                  {titulo} - Gremio: {gremio.nombre} - (En línea: {enLinea} / {miembros.length})
                </h1>
                <button
                  className={styles.cerrar}
                  type="button"
                  onClick={() => navigate('/juego')}
                  aria-label="Cerrar y volver al juego"
                >
                  ×
                </button>
              </header>

              <div id="panel-gremio" role="tabpanel" aria-labelledby={`tab-${pestana}`}>
                {pestana === 'comunidad' && (
                  <>
                    <div className={styles.cuerpo}>
                      <div className={styles.emblema}>
                        {gremio.emblema
                          ? <img src={gremio.emblema} alt={`Emblema de ${gremio.nombre}`} />
                          : <span aria-hidden="true">🦁</span>}
                      </div>

                      <dl className={styles.datos}>
                        <div className={styles.dato}>
                          <dt>Nombre:</dt>
                          <dd className={styles.nombre}>{gremio.nombre}</dd>
                        </div>

                        <div className={styles.dato}>
                          <dt>Descripción:</dt>
                          <dd>
                            {editando ? (
                              <>
                                <textarea
                                  className={styles.textarea}
                                  value={borrador.descripcion}
                                  maxLength={MAX_DESCRIPCION}
                                  onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
                                  aria-label="Descripción del gremio"
                                  rows={2}
                                />
                                <span className={styles.contador}>{borrador.descripcion.length}/{MAX_DESCRIPCION}</span>
                              </>
                            ) : (
                              <>
                                {gremio.descripcion || 'Sin descripción.'}{' '}
                                <button type="button" className={styles.editar} onClick={empezarEdicion}>
                                  (Edit) <span aria-hidden="true">✎</span>
                                </button>
                              </>
                            )}
                          </dd>
                        </div>

                        <div className={styles.dato}>
                          <dt>Fama:</dt>
                          <dd>{gremio.nivel ? `Rango ${gremio.rango} (Nivel ${gremio.nivel})` : '—'}</dd>
                        </div>

                        <div className={styles.dato}>
                          <dt>Clasificación:</dt>
                          <dd>{gremio.clasificacion ? `${gremio.clasificacion}º (Posición global)` : '—'}</dd>
                        </div>

                        <div className={styles.dato}>
                          <dt>Creado en:</dt>
                          <dd>{formatearFecha(gremio.creadoEn)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className={styles.anuncios}>
                      <h2>Anuncios del Gremio</h2>
                      {gremio.fuente === 'postgres' && <div>
                        <p>Código de invitación: {invitacion || gremio.codigo || 'Sin invitación vigente'}</p>
                        <Button onClick={crearInvitacion}>Generar invitación</Button>
                        {errorInvitacion && <p role="alert">{errorInvitacion}</p>}
                      </div>}
                      {editando ? (
                        <>
                          <textarea
                            className={styles.textarea}
                            value={borrador.anuncio}
                            maxLength={MAX_ANUNCIO}
                            onChange={(e) => setBorrador((b) => ({ ...b, anuncio: e.target.value }))}
                            aria-label="Anuncio del gremio"
                            rows={3}
                          />
                          <span className={styles.contador}>{borrador.anuncio.length}/{MAX_ANUNCIO}</span>
                        </>
                      ) : (
                        <p>{gremio.anuncio || 'No hay anuncios por ahora.'}</p>
                      )}
                    </div>

                    <div className={styles.pie}>
                      {editando ? (
                        <>
                          <Button onClick={guardar}>Guardar</Button>
                          <Button onClick={() => setEditando(false)}>Cancelar</Button>
                        </>
                      ) : (
                        <Button onClick={empezarEdicion}>Editar Perfil del Gremio</Button>
                      )}
                    </div>
                  </>
                )}

                {pestana === 'miembros' && (
                  ranking.length === 0 ? (
                    <p className={styles.vacio}>Este gremio aún no tiene miembros.</p>
                  ) : (
                    <div className={styles.tablaScroll}>
                      <table className={styles.tabla}>
                        <thead>
                          <tr>
                            <th scope="col">Ranking</th>
                            <th scope="col">Nivel</th>
                            <th scope="col">En línea</th>
                            <th scope="col">Jugador</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.map((m, i) => (
                            <tr key={m.id}>
                              <td>{i + 1}</td>
                              <td className={styles.nivel}>
                                <span aria-hidden="true">{NIVELES[m.nivel] ?? NIVELES.Miembro}</span> {m.nivel}
                              </td>
                              <td>
                                <span className={`${styles.punto} ${m.enLinea ? styles.conectado : ''}`} aria-hidden="true" />
                                {m.enLinea ? 'en línea' : 'desconectado'}
                              </td>
                              <td>{m.nombre}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default Gremio
