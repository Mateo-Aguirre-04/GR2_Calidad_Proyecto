import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGremio } from '../hooks/useGremio'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import ModalInvitar from '../components/ModalInvitar/ModalInvitar'
import styles from './css/Gremio.module.css'

const PESTANAS = [
  { clave: 'comunidad', titulo: 'Comunidad' },
  { clave: 'miembros',  titulo: 'Miembros' },
  { clave: 'historia',  titulo: 'Historia' },
]

// Únicos niveles dentro de un gremio
const NIVELES = {
  Fundador: '👑',
  Maestro:  '🎖️',
  Oficial:  '🛡️',
  Miembro:  '🌱',
}

const TIPOS_ACTIVIDAD = {
  cosecha: { etiqueta: 'Cosechas', emoji: '🧺' },
  siembra: { etiqueta: 'Siembras', emoji: '🌱' },
  riego:   { etiqueta: 'Riegos',   emoji: '💧' },
  abono:   { etiqueta: 'Abonos',   emoji: '🧪' },
}

const MAX_DESCRIPCION = 120
const MAX_ANUNCIO = 160

// '2026-02-28' -> '2026/02/28' sin pasar por Date (evita desfases de zona horaria)
function formatearFecha(fecha) {
  return fecha ? String(fecha).slice(0, 10).replaceAll('-', '/') : '—'
}

function haceCuanto(fecha) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / (24 * 60 * 60 * 1000))
  if (dias <= 0) return 'Hoy'
  return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`
}

function Gremio() {
  const navigate = useNavigate()
  const { gremio, cargando, guardarPerfil } = useGremio()
  const [pestana, setPestana] = useState('comunidad')
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({ descripcion: '', anuncio: '' })
  const [filtro, setFiltro] = useState('todos')
  const [modalInvitar, setModalInvitar] = useState(false)

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
  const actividades = (gremio?.actividades ?? []).filter((a) => filtro === 'todos' || a.tipo === filtro)

  return (
    <div className="pagina">
      <Header pregunta="" textoEnlace="Regresar" destino="/juego" />

      <main className={styles.contenido}>
        {cargando || !gremio ? (
          <p className={styles.estado} role="status">Cargando gremio...</p>
        ) : (
          <div className={styles.ventana}>
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
                <Button type="button" onClick={() => setModalInvitar(true)}>
                  ✉️ Invitar
                </Button>
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
                        <>
                          <Button onClick={empezarEdicion}>Editar Perfil del Gremio</Button>
                          <Button onClick={() => setModalInvitar(true)}>✉️ Invitar al Gremio</Button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {pestana === 'miembros' && (
                  <>
                    <div className={styles.barraMiembros}>
                      <Button onClick={() => setModalInvitar(true)}>✉️ Invitar a un Jugador</Button>
                    </div>
                    {ranking.length === 0 ? (
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
                    )}
                  </>
                )}

                {pestana === 'historia' && (
                  <>
                    <div className={styles.tablaScroll}>
                      <table className={styles.tabla}>
                        <thead>
                          <tr>
                            <th scope="col">Jugador</th>
                            <th scope="col">Actividad</th>
                            <th scope="col">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actividades.length === 0 ? (
                            <tr>
                              <td colSpan={3} className={styles.vacio}>No hay actividades de este tipo.</td>
                            </tr>
                          ) : (
                            actividades.map((a) => (
                              <tr key={a.id}>
                                <td>{a.jugador}</td>
                                <td>
                                  <span className={`${styles.actividad} ${styles[a.tipo] ?? ''}`}>
                                    <span aria-hidden="true">{TIPOS_ACTIVIDAD[a.tipo]?.emoji}</span> {a.texto}
                                  </span>
                                </td>
                                <td>{haceCuanto(a.fecha)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.filtros} role="group" aria-label="Filtrar actividades">
                      <span>Filtrar:</span>
                      <button
                        type="button"
                        className={`${styles.filtro} ${filtro === 'todos' ? styles.filtroActivo : ''}`}
                        aria-pressed={filtro === 'todos'}
                        onClick={() => setFiltro('todos')}
                      >
                        Todos
                      </button>
                      {Object.entries(TIPOS_ACTIVIDAD).map(([clave, { etiqueta, emoji }]) => (
                        <button
                          key={clave}
                          type="button"
                          className={`${styles.filtro} ${filtro === clave ? styles.filtroActivo : ''}`}
                          aria-pressed={filtro === clave}
                          onClick={() => setFiltro(clave)}
                        >
                          <span aria-hidden="true">{emoji}</span> {etiqueta}
                        </button>
                      ))}
                    </div>
                    <p className={styles.total} role="status">Mostrando {actividades.length} registros</p>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {modalInvitar && (
          <ModalInvitar
            gremioId={gremio?.id}
            gremioNombre={gremio?.nombre}
            onCerrar={() => setModalInvitar(false)}
          />
        )}
      </main>
    </div>
  )
}

export default Gremio
