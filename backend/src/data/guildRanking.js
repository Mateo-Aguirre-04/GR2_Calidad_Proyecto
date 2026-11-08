import { requireUser,sendError } from './postgres.js'

export async function readGuildRanking(db) {
  return (await db.query(`SELECT g.id_gremio::text AS id,g.nombre_gremio AS nombre,
    g.area_total AS "areaTotal",g.puntos_gremio AS puntos,g.latitud,g.longitud,g.created_at AS "creadoEn",
    count(m.id_usuario)::int AS "miembrosCount" FROM gremio g LEFT JOIN miembro_gremio m USING(id_gremio)
    GROUP BY g.id_gremio ORDER BY g.puntos_gremio DESC,g.id_gremio`)).rows
}
export const guildRankingHandler=db=>async(req,res)=>{
  try {
    requireUser(req)
    const rows=await readGuildRanking(db)
    res.set('Cache-Control','no-store').json(rows.map(g=>({...g,ubicacion:{lat:Number(g.latitud),lng:Number(g.longitud)}})))
  } catch(error) {sendError(res,error)}
}
