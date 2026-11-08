import { requireMember, requireUser, httpError, sendError, cropResponse } from './postgres.js'
import { validId } from './taskParticipation.js'
import { completeTask } from './taskCompletion.js'
import { readChecklist } from './checklist.js'
import { requestOnce, requestKey } from './checklistRequests.js'
import { wateringInput } from './watering.js'
import { loadEnvironment, catalogDays, localDate, lunarWindow, harvestReminder } from './checklistEnvironment.js'
import { taskDetails, availability, assertAvailable, sowingReasons, RITUAL_REQUIRED } from './checklistRules.js'

const DAY=86400000
const PARTS=['hojas','flores','frutos','semillas','raices']
const HARVEST=()=>Number(process.env.HARVEST_STATE_ID || 6)
const cropKey=c=>`${c.plantaId}:${c.fechaSiembra}`
function cropInput(body) {
  return wateringInput({claveSolicitud:'00000000-0000-4000-8000-000000000000',cultivos:[body]}).cultivos[0]
}
async function member(db,user,garden) { validId(garden,'huerto');await requireMember(db,user,garden) }
async function cropExists(db,garden,crop) {
  const row=(await db.query(`SELECT hp.*,hp.fecha_siembra::text AS fecha_exacta,p.ciclo_cultivo,p.nombre_comun,p.fases,p.imagen_muerta
    FROM huerto_planta hp JOIN planta p USING(id_planta)
    WHERE hp.id_huerto=$1 AND hp.id_planta=$2 AND hp.fecha_siembra=$3 FOR KEY SHARE OF hp`,[garden,crop.plantaId,crop.fechaSiembra])).rows[0]
  if(!row) throw httpError(404,'Cultivo no encontrado en este huerto.')
  return row
}
async function createTask(db,garden,code,key,options={}) {
  const {rows}=await db.query(`INSERT INTO tareas_huerto(id_huerto,codigo_actividad,clave_generacion,modalidad,
    id_planta,fecha_siembra,id_ciclo,id_lote,programada_para,responsable_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING RETURNING id_tarea::text AS id`,
  [garden,code,key,options.modalidad || 'individual',options.plantaId || null,options.fechaSiembra || null,
    options.cicloId || null,options.loteId || null,options.programadaPara || null,options.responsable || null])
  if(rows[0]) return rows[0].id
  return (await db.query(`SELECT id_tarea::text AS id FROM tareas_huerto WHERE id_huerto=$1
    AND (clave_generacion=$2 OR (codigo_actividad=$3 AND id_planta=$4 AND fecha_siembra=$5))
    ORDER BY id_tarea LIMIT 1`,[garden,key,code,options.plantaId || null,options.fechaSiembra || null])).rows[0]?.id
}

export async function synchronize(db,user,garden,env) {
  await member(db,user,garden)
  if(env.zonaHoraria) await db.query(`INSERT INTO checklist_configuracion(id_huerto,zona_horaria)
    VALUES($1,$2) ON CONFLICT DO NOTHING`,[garden,env.zonaHoraria])
  const cycles=(await db.query(`SELECT c.id_ciclo::text AS id FROM ciclos_zona c WHERE c.id_huerto=$1
    AND NOT (EXISTS(SELECT 1 FROM cultivos_checklist cc WHERE cc.id_ciclo=c.id_ciclo)
      AND NOT EXISTS(SELECT 1 FROM tareas_huerto s WHERE s.id_ciclo=c.id_ciclo AND s.codigo_actividad='siembra'))
    ORDER BY c.id_ciclo`,[garden])).rows
  for(const cycle of cycles) {
    await createTask(db,garden,'retiro_maleza',`maleza:${cycle.id}`,{cicloId:cycle.id,programadaPara:env.ahora})
    const weed=(await db.query(`SELECT completada_en FROM tareas_huerto WHERE id_ciclo=$1 AND codigo_actividad='retiro_maleza'`,[cycle.id])).rows[0]
    if(weed?.completada_en) await createTask(db,garden,'preparacion_tierra',`preparacion:${cycle.id}`,
      {cicloId:cycle.id,modalidad:'grupal',programadaPara:weed.completada_en})
  }
  const crops=(await db.query(`SELECT hp.id_planta::text AS "plantaId",hp.fecha_siembra::text AS "fechaSiembra",p.ciclo_cultivo,
    cc.id_ciclo::text AS "cicloId" FROM huerto_planta hp JOIN planta p USING(id_planta)
    LEFT JOIN cultivos_checklist cc USING(id_huerto,id_planta,fecha_siembra)
    WHERE hp.id_huerto=$1 AND hp.id_estado<>$2 ORDER BY hp.id_planta,hp.fecha_siembra`,[garden,HARVEST()])).rows
  for(const crop of crops) {
    await createTask(db,garden,'senaletica',`senaletica:${cropKey(crop)}`,{...crop,programadaPara:crop.fechaSiembra})
    const days=catalogDays(crop.ciclo_cultivo)
    await createTask(db,garden,'cosecha',`cosecha:${cropKey(crop)}`,{...crop,
      programadaPara:days?new Date(new Date(crop.fechaSiembra).getTime()+days*DAY):null})
  }
  if(env.zonaHoraria && env.amanecer) {
    const details=await taskDetails(db,garden,null,env)
    for(const task of details.filter(t=>t.codigo_actividad==='cosecha'&&!t.completada_en)) {
      const state=await availability(db,task,env)
      if(!state.motivos.length || state.motivos.every(reason=>reason===RITUAL_REQUIRED)) {
        await createTask(db,garden,'ritual_agradecimiento',`ritual:${localDate(env.ahora,env.zonaHoraria)}`,
          {modalidad:'grupal',programadaPara:env.amanecer})
        break
      }
    }
  }
}

export async function panel(db,user,garden,env) {
  const tasks=await readChecklist(db,user,garden)
  const details=await taskDetails(db,garden,null,env)
  const byId=new Map(details.map(task=>[task.id,task]))
  const enriched=[]
  for(const task of tasks) {
    const raw=byId.get(task.id)
    const state=await availability(db,raw,env)
    enriched.push({...task,disponibilidad:state,
      recordatorioActivo:!task.completado&&(!task.programadaPara||(env.zonaHoraria
        ?localDate(task.programadaPara,env.zonaHoraria)<=localDate(env.ahora,env.zonaHoraria)
        :new Date(task.programadaPara)<=new Date(env.ahora))),
      cultivo:task.cultivo?{...task.cultivo,parteCosecha:raw.parte_cosecha}:null,
      zona:raw.id_zona?{id:raw.id_zona,nombre:raw.zona_nombre,cicloId:raw.ciclo_contexto}:null,
      loteId:raw.id_lote?String(raw.id_lote):null,confirmaciones:raw.confirmaciones,
      responsableId:raw.responsable_id?String(raw.responsable_id):null})
  }
  const zones=(await db.query(`SELECT z.id_zona::text AS id,z.nombre,c.id_ciclo::text AS "cicloId",
    p.completada_en AS "preparadaEn",
    (EXISTS(SELECT 1 FROM cultivos_checklist cc WHERE cc.id_ciclo=c.id_ciclo)
      AND NOT EXISTS(SELECT 1 FROM cultivos_checklist cc JOIN huerto_planta hp USING(id_huerto,id_planta,fecha_siembra)
        WHERE cc.id_ciclo=c.id_ciclo AND (hp.id_estado<>$2 OR cc.conservado_tras_cosecha))) AS "requiereNuevoCiclo"
    FROM zonas_huerto z LEFT JOIN ciclos_zona c ON c.id_zona=z.id_zona
      AND NOT EXISTS(SELECT 1 FROM ciclos_zona newer WHERE newer.id_zona=c.id_zona AND newer.id_ciclo>c.id_ciclo)
    LEFT JOIN tareas_huerto p ON p.id_ciclo=c.id_ciclo AND p.codigo_actividad='preparacion_tierra'
    WHERE z.id_huerto=$1 ORDER BY z.id_zona,c.id_ciclo`,[garden,HARVEST()])).rows
  const reminders=zones.filter(z=>z.preparadaEn&&!z.requiereNuevoCiclo).map(z=>({tipo:'siembra',zonaId:z.id,cicloId:z.cicloId,
    nombre:z.nombre,programadaPara:new Date(new Date(z.preparadaEn).getTime()+15*DAY),
    motivos:sowingReasons(z.preparadaEn,env)}))
  if(env.zonaHoraria) {
    const watersByCrop=new Map()
    const waters=(await db.query(`SELECT DISTINCT id_planta::text AS planta,fecha_siembra::text AS siembra,
      (completada_en AT TIME ZONE $2)::date::text AS fecha FROM tareas_huerto
      WHERE id_huerto=$1 AND codigo_actividad='riego' AND completada_en IS NOT NULL
      AND (completada_en AT TIME ZONE $2)::date >= (($3::timestamptz AT TIME ZONE $2)::date-2)`,[garden,env.zonaHoraria,env.ahora])).rows
    for(const water of waters) {
      const key=`${water.planta}:${water.siembra}`
      if(!watersByCrop.has(key))watersByCrop.set(key,[])
      watersByCrop.get(key).push(water.fecha)
    }
    for(const task of details.filter(t=>t.codigo_actividad==='cosecha'&&!t.completada_en&&Number(t.id_estado)!==HARVEST())) {
      const plan=harvestReminder(task,env,watersByCrop.get(`${task.id_planta}:${task.fecha_exacta}`) || [])
      if(plan)reminders.push({tipo:'riego_previo_cosecha',cultivo:{huertoId:garden,plantaId:String(task.id_planta),fechaSiembra:task.fecha_exacta},...plan})
    }
  }
  const lots=(await db.query(`SELECT id_lote::text AS id,id_tarea_cosecha::text AS "cosechaId",
    secado_iniciado_en AS "secadoIniciadoEn",modalidad,responsable_id::text AS "responsableId"
    FROM lotes_cosecha WHERE id_huerto=$1 ORDER BY id_lote`,[garden])).rows
  const crops=(await db.query(`SELECT hp.id_planta::text AS "plantaId",hp.fecha_siembra::text AS "fechaSiembra",
    cc.id_ciclo::text AS "cicloId",c.id_zona::text AS "zonaId",cc.parte_cosecha AS "parteCosecha",
    COALESCE(cc.conservado_tras_cosecha,false) AS "conservadoTrasCosecha",cc.finalizado_en AS "finalizadoEn",
    (hp.id_estado<>$2 OR COALESCE(cc.conservado_tras_cosecha,false)) AS activo
    FROM huerto_planta hp LEFT JOIN cultivos_checklist cc USING(id_huerto,id_planta,fecha_siembra)
    LEFT JOIN ciclos_zona c ON c.id_ciclo=cc.id_ciclo WHERE hp.id_huerto=$1 ORDER BY hp.fecha_siembra,hp.id_planta`,[garden,HARVEST()])).rows
  return {tareas:enriched,zonas:zones,lotes:lots,cultivos:crops,recordatorios:reminders,
    contexto:{ahora:env.ahora,zonaHoraria:env.zonaHoraria,clima:env.clima,climaVerificado:!!env.clima,amanecer:env.amanecer,
      ventanasLunares:env.zonaHoraria?{nueva:lunarWindow(env.ahora,env.zonaHoraria,[0]),
        crecienteOLlena:lunarWindow(env.ahora,env.zonaHoraria,[1,2]),menguante:lunarWindow(env.ahora,env.zonaHoraria,[3])}:null}}
}

export async function createZone(db,user,garden,body,env) {
  await member(db,user,garden)
  if(typeof body?.nombre!=='string'||!body.nombre.trim()||body.nombre.trim().length>100) throw httpError(400,'Indica un nombre de zona de hasta 100 caracteres.')
  const zone=(await db.query(`INSERT INTO zonas_huerto(id_huerto,nombre) VALUES($1,$2)
    ON CONFLICT(id_huerto,nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_zona::text AS id,nombre`,[garden,body.nombre.trim()])).rows[0]
  return zone
}
export async function startCycle(db,user,garden,body,env) {
  await member(db,user,garden)
  validId(body?.zonaId,'zona')
  return requestOnce(db,user,garden,body.claveSolicitud,'ciclo',{zonaId:body.zonaId},async()=>{
    const zone=(await db.query('SELECT id_zona FROM zonas_huerto WHERE id_zona=$1 AND id_huerto=$2 FOR UPDATE',[body.zonaId,garden])).rows[0]
    if(!zone) throw httpError(404,'Zona no encontrada.')
    const previous=(await db.query('SELECT id_ciclo FROM ciclos_zona WHERE id_zona=$1 ORDER BY id_ciclo DESC LIMIT 1',[body.zonaId])).rows[0]
    if(previous) {
      const crops=(await db.query(`SELECT hp.id_estado,cc.conservado_tras_cosecha,cc.id_ciclo FROM cultivos_checklist cc
        JOIN ciclos_zona c ON c.id_ciclo=cc.id_ciclo
        JOIN huerto_planta hp ON (hp.id_huerto,hp.id_planta,hp.fecha_siembra)=(cc.id_huerto,cc.id_planta,cc.fecha_siembra)
        WHERE c.id_zona=$1`,[body.zonaId])).rows
      if(!crops.some(c=>String(c.id_ciclo)===String(previous.id_ciclo))||crops.some(c=>Number(c.id_estado)!==HARVEST()||c.conservado_tras_cosecha)) {
        throw httpError(409,'La zona todavía tiene un ciclo en curso o cultivos activos, incluidos los conservados tras una cosecha parcial.')
      }
    }
    const cycle=(await db.query(`INSERT INTO ciclos_zona(id_zona,id_huerto) VALUES($1,$2) RETURNING id_ciclo::text AS id`,[body.zonaId,garden])).rows[0]
    await createTask(db,garden,'retiro_maleza',`maleza:${cycle.id}`,{cicloId:cycle.id,programadaPara:env.ahora})
    return {cicloId:cycle.id,zonaId:body.zonaId}
  })
}
export async function configureCrop(db,user,garden,body) {
  await member(db,user,garden)
  const crop=cropInput(body)
  if(!PARTS.includes(body.parteCosecha)) throw httpError(400,'Elige hojas, flores, frutos, semillas o raices.')
  const raw=await cropExists(db,garden,crop)
  if(Number(raw.id_estado)===HARVEST()) throw httpError(409,'El cultivo ya fue cosechado.')
  const existing=(await db.query('SELECT parte_cosecha,id_ciclo FROM cultivos_checklist WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3',
    [garden,crop.plantaId,crop.fechaSiembra])).rows[0]
  if(existing?.parte_cosecha&&existing.parte_cosecha!==body.parteCosecha) throw httpError(409,'La parte de cosecha de este ciclo ya fue registrada.')
  let cycleId=existing?.id_ciclo || null
  if(body.zonaId!==undefined) {
    validId(body.zonaId,'zona')
    const zone=(await db.query('SELECT id_zona FROM zonas_huerto WHERE id_zona=$1 AND id_huerto=$2 FOR UPDATE',[body.zonaId,garden])).rows[0]
    if(!zone)throw httpError(404,'Zona no encontrada en este huerto.')
    if(cycleId) {
      const assigned=(await db.query('SELECT id_zona::text AS id FROM ciclos_zona WHERE id_ciclo=$1',[cycleId])).rows[0]
      if(assigned.id!==body.zonaId)throw httpError(409,'El cultivo ya pertenece a otra zona; no se puede mover para liberar su ciclo.')
    } else {
      const last=(await db.query('SELECT id_ciclo FROM ciclos_zona WHERE id_zona=$1 ORDER BY id_ciclo DESC LIMIT 1',[body.zonaId])).rows[0]
      if(last) {
        const tasks=(await db.query('SELECT 1 FROM tareas_huerto WHERE id_ciclo=$1 LIMIT 1',[last.id_ciclo])).rows
        if(tasks.length)throw httpError(409,'Asigna cultivos anteriores a una zona sin una jornada de preparación ya iniciada.')
        cycleId=last.id_ciclo
      } else {
        cycleId=(await db.query('INSERT INTO ciclos_zona(id_zona,id_huerto) VALUES($1,$2) RETURNING id_ciclo',[body.zonaId,garden])).rows[0].id_ciclo
      }
    }
  }
  const configured=await db.query(`INSERT INTO cultivos_checklist(id_huerto,id_planta,fecha_siembra,parte_cosecha,id_ciclo) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(id_huerto,id_planta,fecha_siembra) DO UPDATE SET parte_cosecha=EXCLUDED.parte_cosecha
      ,id_ciclo=COALESCE(cultivos_checklist.id_ciclo,EXCLUDED.id_ciclo)
    WHERE (cultivos_checklist.parte_cosecha IS NULL OR cultivos_checklist.parte_cosecha=EXCLUDED.parte_cosecha)
      AND (cultivos_checklist.id_ciclo IS NULL OR EXCLUDED.id_ciclo IS NULL OR cultivos_checklist.id_ciclo=EXCLUDED.id_ciclo)
    RETURNING id_ciclo::text AS "cicloId"`,[garden,crop.plantaId,crop.fechaSiembra,body.parteCosecha,cycleId])
  if(!configured.rowCount)throw httpError(409,'La parte o la zona de este cultivo ya fue registrada.')
  return {...crop,parteCosecha:body.parteCosecha,cicloId:configured.rows[0].cicloId}
}
export async function schedule(db,user,garden,body,env) {
  await member(db,user,garden)
  if(!['abono_organico','limpieza_huerto'].includes(body?.actividad)) throw httpError(400,'Solo se programan abono orgánico y jornadas de limpieza.')
  if(typeof body.programadaPara!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(body.programadaPara)||!Number.isFinite(Date.parse(body.programadaPara))) throw httpError(400,'Envía una fecha programada con zona horaria.')
  const crop=body.actividad==='abono_organico'?cropInput(body.cultivo):null
  const key=requestKey(body.claveSolicitud)
  return requestOnce(db,user,garden,key,'programar',{actividad:body.actividad,programadaPara:body.programadaPara,cultivo:crop},async()=>{
    if(crop) {
      const raw=await cropExists(db,garden,crop)
      if(Number(raw.id_estado)===HARVEST()) throw httpError(409,'El cultivo ya fue cosechado.')
    }
    const id=await createTask(db,garden,body.actividad,crop?`abono:${cropKey(crop)}`:`limpieza:${key}`,
      {...crop,modalidad:crop?'individual':'grupal',programadaPara:body.programadaPara})
    return {id}
  })
}
export async function sow(db,user,garden,body,env) {
  await member(db,user,garden)
  validId(body?.cicloId,'ciclo');validId(body?.plantaId,'planta')
  if(!PARTS.includes(body.parteCosecha)||![body.x,body.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100)) throw httpError(400,'Indica la parte de cosecha y coordenadas x,y entre 0 y 100.')
  if(body.confirmaciones?.ritualAmanecer!==true) throw httpError(400,'Confirma que realizaste el ritual de siembra al amanecer.')
  const content={cicloId:body.cicloId,plantaId:body.plantaId,parteCosecha:body.parteCosecha,x:body.x,y:body.y,ritualAmanecer:true}
  return requestOnce(db,user,garden,body.claveSolicitud,'siembra',content,async()=>{
    await db.query(`SELECT z.id_zona FROM zonas_huerto z JOIN ciclos_zona c USING(id_zona)
      WHERE c.id_ciclo=$1 AND c.id_huerto=$2 FOR UPDATE OF z`,[body.cicloId,garden])
    const exhausted=(await db.query(`SELECT EXISTS(SELECT 1 FROM cultivos_checklist WHERE id_ciclo=$1)
      AND NOT EXISTS(SELECT 1 FROM cultivos_checklist cc JOIN huerto_planta hp USING(id_huerto,id_planta,fecha_siembra)
        WHERE cc.id_ciclo=$1 AND (hp.id_estado<>$2 OR cc.conservado_tras_cosecha)) AS ok`,[body.cicloId,HARVEST()])).rows[0].ok
    if(exhausted) throw httpError(409,'Este ciclo ya fue cosechado. Inicia una nueva preparación de la zona.')
    const prepared=(await db.query(`SELECT p.completada_en FROM ciclos_zona c JOIN tareas_huerto p USING(id_ciclo)
      WHERE c.id_ciclo=$1 AND c.id_huerto=$2 AND p.codigo_actividad='preparacion_tierra'
      AND NOT EXISTS(SELECT 1 FROM ciclos_zona newer WHERE newer.id_zona=c.id_zona AND newer.id_ciclo>c.id_ciclo)
      FOR SHARE OF c,p`,[body.cicloId,garden])).rows[0]
    const reasons=sowingReasons(prepared?.completada_en,env)
    if(reasons.length) throw httpError(409,reasons.join(' '))
    const plant=(await db.query('SELECT * FROM planta WHERE id_planta=$1',[body.plantaId])).rows[0]
    if(!plant) throw httpError(404,'Planta no encontrada.')
    const raw=(await db.query(`INSERT INTO huerto_planta(id_huerto,id_planta,fecha_siembra,cantidad,id_estado,observaciones)
      VALUES($1,$2,$3,1,1,$4) RETURNING *,fecha_siembra::text AS fecha_exacta`,[garden,body.plantaId,env.ahora,JSON.stringify({x:body.x,y:body.y,cosechado:false})])).rows[0]
    const crop={plantaId:body.plantaId,fechaSiembra:raw.fecha_exacta,cicloId:body.cicloId}
    await db.query(`INSERT INTO cultivos_checklist(id_huerto,id_planta,fecha_siembra,id_ciclo,parte_cosecha)
      VALUES($1,$2,$3,$4,$5)`,[garden,crop.plantaId,crop.fechaSiembra,crop.cicloId,body.parteCosecha])
    const id=await createTask(db,garden,'siembra',`siembra:${cropKey(crop)}`,{...crop,responsable:user,programadaPara:env.ahora})
    const receipt=await completeTask(db,user,garden,id,async()=>{
      await db.query('UPDATE tareas_huerto SET confirmaciones=$2::jsonb WHERE id_tarea=$1',[id,JSON.stringify({ritualAmanecer:true})])
    },env.ahora)
    await createTask(db,garden,'senaletica',`senaletica:${cropKey(crop)}`,{...crop,programadaPara:env.ahora})
    const days=catalogDays(plant.ciclo_cultivo)
    await createTask(db,garden,'cosecha',`cosecha:${cropKey(crop)}`,{...crop,programadaPara:days?new Date(new Date(env.ahora).getTime()+days*DAY):null})
    return {cultivo:cropResponse({...plant,...raw}),comprobante:receipt}
  })
}

export async function finish(db,user,garden,taskId,body,env) {
  await member(db,user,garden)
  let fresh=false
  let details
  const result=await completeTask(db,user,garden,taskId,async()=>{
    details=(await taskDetails(db,garden,taskId,env))[0]
    if(details.codigo_actividad==='cosecha') {
      const current=(await db.query(`SELECT id_estado FROM huerto_planta
        WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3 FOR NO KEY UPDATE`,[garden,String(details.id_planta),details.fecha_exacta])).rows[0]
      if(Number(current?.id_estado)===HARVEST()) throw httpError(409,'El cultivo ya fue cosechado.')
    }
    await assertAvailable(db,details,env,body)
    fresh=true
  },env.ahora)
  if(fresh&&details.codigo_actividad==='cosecha') {
    // El estado operativo y los puntos se guardan junto con la finalización.
    const crop={plantaId:String(details.id_planta),fechaSiembra:details.fecha_exacta}
    const raw=await cropExists(db,garden,crop)
    if(Number(raw.id_estado)===HARVEST()) throw httpError(409,'El cultivo ya fue cosechado.')
    let metadata={}
    try {metadata=JSON.parse(raw.observaciones)} catch { /* Observaciones legadas. */ }
    const preserve=body.confirmaciones.conservarCultivo
    await db.query(`UPDATE huerto_planta SET id_estado=$4,observaciones=$5,modified_at=now()
      WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3`,[garden,crop.plantaId,crop.fechaSiembra,
      preserve?raw.id_estado:HARVEST(),JSON.stringify({...metadata,cosechado:!preserve,cosechaParcial:preserve})])
    await db.query(`UPDATE cultivos_checklist SET conservado_tras_cosecha=$4,finalizado_en=$5
      WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3`,[garden,crop.plantaId,crop.fechaSiembra,preserve,preserve?null:env.ahora])
    await db.query('INSERT INTO lotes_cosecha(id_huerto,id_tarea_cosecha) VALUES($1,$2) ON CONFLICT DO NOTHING',[garden,taskId])
  }
  if(fresh&&details.codigo_actividad==='retiro_maleza'&&details.id_ciclo) {
    await createTask(db,garden,'preparacion_tierra',`preparacion:${details.id_ciclo}`,
      {cicloId:String(details.id_ciclo),modalidad:'grupal',programadaPara:env.ahora})
  }
  return result
}

export async function finalizeCrop(db,user,garden,body,env) {
  await member(db,user,garden)
  const crop=cropInput(body)
  if(body.cultivoFinalizado!==true)throw httpError(400,'Confirma que el cultivo terminó y ya no ocupa la zona.')
  await db.query(`SELECT id_estado FROM huerto_planta WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3 FOR NO KEY UPDATE`,
    [garden,crop.plantaId,crop.fechaSiembra])
  const raw=await cropExists(db,garden,crop)
  let metadata={}
  try{metadata=JSON.parse(raw.observaciones)}catch{/* Observaciones legadas. */}
  await db.query(`UPDATE huerto_planta SET id_estado=$4,observaciones=$5,modified_at=now()
    WHERE id_huerto=$1 AND id_planta=$2 AND fecha_siembra=$3`,[garden,crop.plantaId,crop.fechaSiembra,HARVEST(),JSON.stringify({...metadata,cosechado:true,cultivoFinalizado:true})])
  const closed=(await db.query(`INSERT INTO cultivos_checklist(id_huerto,id_planta,fecha_siembra,finalizado_en)
    VALUES($1,$2,$3,$4) ON CONFLICT(id_huerto,id_planta,fecha_siembra) DO UPDATE
    SET conservado_tras_cosecha=false,finalizado_en=COALESCE(cultivos_checklist.finalizado_en,EXCLUDED.finalizado_en)
    RETURNING finalizado_en AS "finalizadoEn"`,[garden,crop.plantaId,crop.fechaSiembra,env.ahora])).rows[0]
  return {...crop,...closed,puntosOtorgados:0}
}

export async function startDrying(db,user,garden,body,env) {
  await member(db,user,garden)
  validId(body?.loteId,'lote')
  if(!['individual','grupal'].includes(body.modalidad)||body.aLaSombra!==true) throw httpError(400,'Elige la modalidad y confirma el inicio del secado a la sombra.')
  const lot=(await db.query('SELECT * FROM lotes_cosecha WHERE id_lote=$1 AND id_huerto=$2 FOR UPDATE',[body.loteId,garden])).rows[0]
  if(!lot) throw httpError(404,'Lote no encontrado.')
  if(lot.modalidad&&(lot.modalidad!==body.modalidad||String(lot.responsable_id)!==String(user))) throw httpError(409,'Este lote ya tiene otro inicio de secado registrado.')
  if(!lot.modalidad) await db.query('UPDATE lotes_cosecha SET modalidad=$2,secado_iniciado_en=$3,responsable_id=$4 WHERE id_lote=$1',[body.loteId,body.modalidad,env.ahora,user])
  const start=lot.secado_iniciado_en || env.ahora
  const id=await createTask(db,garden,'secado_almacenamiento',`secado:${body.loteId}`,{modalidad:body.modalidad,loteId:body.loteId,
    responsable:body.modalidad==='individual'?user:null,programadaPara:new Date(new Date(start).getTime()+10*DAY)})
  await db.query('INSERT INTO participantes_tarea(id_tarea,id_usuario) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,user])
  await db.query("UPDATE tareas_huerto SET confirmaciones=confirmaciones || '{\"aLaSombra\":true}'::jsonb WHERE id_tarea=$1",[id])
  return {id,loteId:body.loteId,modalidad:body.modalidad,secadoIniciadoEn:start}
}

export function workflowHandler(db,runTransaction,operation,{read=false,environment=loadEnvironment}={}) {
  return async(req,res)=>{
    try {
      const user=requireUser(req),garden=validId(req.params.huertoId,'huerto')
      const env=await environment(db,user,garden)
      const execute=client=>operation(client,user,garden,req,env)
      const result=read?await execute(db):await runTransaction(execute)
      res.set('Cache-Control','no-store').json(result)
    } catch(error){sendError(res,error)}
  }
}
