import { useApiData } from '../../hooks/useApiData'
import Button from '../Button/Button'
import styles from './RankingGremios.module.css'

export default function RankingGremios() {
  const { data, cargando, error, recargar } = useApiData('/api/gremios')
  return (
    <section className={styles.ranking} aria-labelledby="ranking-titulo">
      <div className={styles.barra}>
        <h2 id="ranking-titulo">Ranking de gremios</h2>
        <Button onClick={recargar} disabled={cargando}>Actualizar ranking</Button>
      </div>

      {cargando && <p className={styles.estado} role="status">Consultando puntajes…</p>}
      {error && <p className={styles.estado} role="alert">{error}</p>}

      {data && (
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">Posición</th>
                <th scope="col">Gremio</th>
                <th scope="col">Puntos acumulados</th>
                <th scope="col">Miembros actuales</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td className={styles.vacio} colSpan={4}>Todavía no hay gremios.</td></tr>
              ) : data.map((g, i) => (
                <tr key={g.id}>
                  <td className={i < 3 ? styles.podio : undefined}>{i + 1}</td>
                  <td>{g.nombre}</td>
                  <td>{g.puntos}</td>
                  <td>{g.miembrosCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
