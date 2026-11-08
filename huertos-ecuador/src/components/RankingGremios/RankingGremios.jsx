import { useApiData } from '../../hooks/useApiData'

export default function RankingGremios() {
  const {data,cargando,error,recargar}=useApiData('/api/gremios')
  return <section aria-labelledby="ranking-titulo">
    <h2 id="ranking-titulo">Ranking de gremios</h2>
    <button onClick={recargar}>Actualizar ranking</button>
    {cargando&&<p role="status">Consultando puntajes…</p>}
    {error&&<p role="alert">{error}</p>}
    {data&&<table><thead><tr><th>Posición</th><th>Gremio</th><th>Puntos acumulados</th><th>Miembros actuales</th></tr></thead>
      <tbody>{data.map((g,i)=><tr key={g.id}><td>{i+1}</td><td>{g.nombre}</td><td>{g.puntos}</td><td>{g.miembrosCount}</td></tr>)}</tbody></table>}
  </section>
}
