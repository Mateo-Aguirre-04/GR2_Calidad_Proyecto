import { distribucionHuerto, tipoDesdeImagen, areaDeParcela, capacidadParcela } from './parcelas.js'
import { httpError } from './postgres.js'

export async function gardenLayout(db, garden) {
  const row=(await db.query(`SELECT g.area_total,sd.imagen,sd.num_parcelas FROM huerto h
    JOIN gremio g USING(id_gremio) JOIN subdiseño_huerto sd
    ON sd.id_diseño=h.id_diseño AND sd.id_subdiseño=h.id_subdiseño WHERE h.id_huerto=$1`,[garden])).rows[0]
  if(!row) throw httpError(404,'Huerto no encontrado.')
  return distribucionHuerto(row.area_total,tipoDesdeImagen(row.imagen),row.num_parcelas)
}

export async function mappedSection(db,garden,id) {
  const section=(await db.query(`SELECT * FROM zonas_huerto WHERE id_huerto=$1 AND id_zona=$2
    AND zona_mapa IS NOT NULL FOR UPDATE`,[garden,id])).rows[0]
  if(!section) throw httpError(404,'Selecciona una sección existente del huerto.')
  const layout=await gardenLayout(db,garden)
  if(areaDeParcela(layout,section.zona_mapa,section.parcela_mapa)==null) throw httpError(409,'La sección ya no está habilitada en el huerto.')
  return { ...section, layout }
}

export async function validatePlanting(db,garden,cycleId,body) {
  const cycle=(await db.query('SELECT id_zona FROM ciclos_zona WHERE id_ciclo=$1 AND id_huerto=$2',[cycleId,garden])).rows[0]
  if(!cycle) throw httpError(404,'Ciclo no encontrado.')
  const section=await mappedSection(db,garden,cycle.id_zona)
  const cantidad=Number(body.cantidad)
  if(!Number.isSafeInteger(cantidad)||cantidad<1||cantidad>9999) throw httpError(400,'Cantidad de plantas inválida.')
  const m2=areaDeParcela(section.layout,section.zona_mapa,section.parcela_mapa)
  if(cantidad>capacidadParcela(m2,section.layout.maxPlantas)) throw httpError(400,'La cantidad supera la capacidad de la sección.')
  const occupied=(await db.query(`SELECT 1 FROM huerto_planta WHERE id_huerto=$1 AND zona=$2 AND parcela=$3 AND id_estado<>$4 LIMIT 1`,
    [garden,section.zona_mapa,section.parcela_mapa,Number(process.env.HARVEST_STATE_ID||6)])).rows.length
  if(occupied) throw httpError(409,'La sección todavía tiene un cultivo activo.')
  return {section,cantidad}
}

// El mapeo de pantalla es la fuente de secciones; no se inventan otras zonas.
export async function synchronizeSections(db,garden) {
  await db.query('SELECT id_huerto FROM huerto WHERE id_huerto=$1 FOR NO KEY UPDATE',[garden])
  const layout=await gardenLayout(db,garden)
  for(let z=0;z<layout.zonas.length;z++) for(let p=0;p<layout.zonas[z].length;p++) {
    await db.query(`UPDATE zonas_huerto old SET zona_mapa=$2,parcela_mapa=$3
      WHERE old.id_zona=(SELECT min(c.id_zona) FROM ciclos_zona c
        JOIN cultivos_checklist cc USING(id_ciclo,id_huerto) JOIN huerto_planta hp USING(id_huerto,id_planta,fecha_siembra)
        WHERE c.id_huerto=$1 AND hp.zona=$2 AND hp.parcela=$3)
      AND old.zona_mapa IS NULL
      AND NOT EXISTS(SELECT 1 FROM zonas_huerto existing WHERE existing.id_huerto=$1 AND existing.zona_mapa=$2 AND existing.parcela_mapa=$3)
      AND NOT EXISTS(SELECT 1 FROM ciclos_zona c JOIN cultivos_checklist cc USING(id_ciclo,id_huerto)
        JOIN huerto_planta hp USING(id_huerto,id_planta,fecha_siembra)
        WHERE c.id_zona=old.id_zona AND (hp.zona IS DISTINCT FROM $2 OR hp.parcela IS DISTINCT FROM $3))`,[garden,z+1,p+1])
    const section=(await db.query(`INSERT INTO zonas_huerto(id_huerto,nombre,zona_mapa,parcela_mapa)
      VALUES($1,$2,$3,$4) ON CONFLICT(id_huerto,zona_mapa,parcela_mapa) DO UPDATE SET nombre=EXCLUDED.nombre
      RETURNING id_zona::text AS id`,[garden,`Zona ${z+1} · Parcela ${p+1}`,z+1,p+1])).rows[0]
    const crops=(await db.query(`SELECT hp.id_planta,hp.fecha_siembra::text AS fecha_siembra,cc.id_ciclo FROM huerto_planta hp
      LEFT JOIN cultivos_checklist cc USING(id_huerto,id_planta,fecha_siembra)
      WHERE hp.id_huerto=$1 AND hp.zona=$2 AND hp.parcela=$3 ORDER BY hp.fecha_siembra`,[garden,z+1,p+1])).rows
    let cycle=(await db.query('SELECT id_ciclo FROM ciclos_zona WHERE id_zona=$1 ORDER BY id_ciclo DESC LIMIT 1',[section.id])).rows[0]
    // Las secciones vacías empiezan preparación por decisión del miembro.
    // Los cultivos importados reciben solo un ciclo de origen, sin premios inventados.
    if(!cycle&&crops.length) cycle=(await db.query('INSERT INTO ciclos_zona(id_huerto,id_zona) VALUES($1,$2) RETURNING id_ciclo',[garden,section.id])).rows[0]
    for(const crop of crops.filter(c=>!c.id_ciclo)) await db.query(`INSERT INTO cultivos_checklist(id_huerto,id_planta,fecha_siembra,id_ciclo)
      VALUES($1,$2,$3,$4) ON CONFLICT(id_huerto,id_planta,fecha_siembra) DO UPDATE SET id_ciclo=EXCLUDED.id_ciclo
      WHERE cultivos_checklist.id_ciclo IS NULL`,[garden,crop.id_planta,crop.fecha_siembra,cycle.id_ciclo])
    // Asociar riegos históricos por cultivo a su sección, conservando sus premios.
    await db.query(`UPDATE tareas_huerto t SET id_zona=$4 FROM huerto_planta hp
      WHERE (t.id_huerto,t.id_planta,t.fecha_siembra)=(hp.id_huerto,hp.id_planta,hp.fecha_siembra)
      AND hp.id_huerto=$1 AND hp.zona=$2 AND hp.parcela=$3 AND t.codigo_actividad='riego' AND t.id_zona IS NULL`,[garden,z+1,p+1,section.id])
  }
}
