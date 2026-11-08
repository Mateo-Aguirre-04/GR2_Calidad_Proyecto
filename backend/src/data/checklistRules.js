import { catalogDays, daysBetween, localDate, localMinutes, lunarWindow, sunny } from './checklistEnvironment.js'
import { httpError } from './postgres.js'

export const confirmations = {
  siembra: ['ritualAmanecer'], cosecha: ['cultivoListo','rocioSeco'],
  ritual_agradecimiento: ['ritualAmanecer'],
  secado_almacenamiento: ['seco','empacado','etiquetado','almacenado'],
}
export const RITUAL_REQUIRED='Falta completar el ritual de agradecimiento de esta jornada de cosecha.'
export async function taskDetails(db,garden,id=null,env={}) {
  return (await db.query(`SELECT t.*,t.id_tarea::text AS id,t.fecha_siembra::text AS fecha_exacta,
      hp.id_estado,p.ciclo_cultivo,cc.parte_cosecha,z.id_zona::text,z.nombre AS zona_nombre,
      COALESCE(t.id_ciclo,cc.id_ciclo)::text AS ciclo_contexto,
      NOT EXISTS(SELECT 1 FROM ciclos_zona newer WHERE newer.id_zona=c.id_zona AND newer.id_ciclo>c.id_ciclo) AS ciclo_vigente,
      EXISTS(SELECT 1 FROM huerto_planta occupied WHERE occupied.id_huerto=t.id_huerto
        AND occupied.zona=z.zona_mapa AND occupied.parcela=z.parcela_mapa AND occupied.id_estado<>$5) AS seccion_ocupada,
      l.secado_iniciado_en,prep.completada_en AS preparada_en,
      maleza.completada_en AS maleza_retirada_en,
      EXISTS(SELECT 1 FROM tareas_huerto r WHERE r.id_huerto=t.id_huerto AND r.id_zona=z.id_zona
        AND r.codigo_actividad='riego' AND (r.completada_en AT TIME ZONE $3)::date=(($4::timestamptz AT TIME ZONE $3)::date-2)) AS regada_dos_dias,
      EXISTS(SELECT 1 FROM tareas_huerto ritual WHERE ritual.id_huerto=$1 AND ritual.codigo_actividad='ritual_agradecimiento'
        AND (ritual.completada_en AT TIME ZONE $3)::date=($4::timestamptz AT TIME ZONE $3)::date) AS ritual_completado
    FROM tareas_huerto t
    LEFT JOIN huerto_planta hp ON (hp.id_huerto,hp.id_planta,hp.fecha_siembra)=(t.id_huerto,t.id_planta,t.fecha_siembra)
    LEFT JOIN planta p ON p.id_planta=t.id_planta
    LEFT JOIN cultivos_checklist cc ON (cc.id_huerto,cc.id_planta,cc.fecha_siembra)=(t.id_huerto,t.id_planta,t.fecha_siembra)
    LEFT JOIN ciclos_zona c ON c.id_ciclo=COALESCE(t.id_ciclo,cc.id_ciclo)
    LEFT JOIN zonas_huerto z ON z.id_huerto=t.id_huerto AND
      (z.id_zona=t.id_zona OR (t.id_zona IS NULL AND z.zona_mapa=hp.zona AND z.parcela_mapa=hp.parcela)
        OR (t.id_zona IS NULL AND hp.zona IS NULL AND z.id_zona=c.id_zona))
    LEFT JOIN lotes_cosecha l ON l.id_lote=t.id_lote
    LEFT JOIN tareas_huerto prep ON prep.id_ciclo=c.id_ciclo AND prep.codigo_actividad='preparacion_tierra'
    LEFT JOIN tareas_huerto maleza ON maleza.id_ciclo=c.id_ciclo AND maleza.codigo_actividad='retiro_maleza'
    WHERE t.id_huerto=$1 AND ($2::bigint IS NULL OR t.id_tarea=$2) ORDER BY t.id_tarea`,[garden,id,env.zonaHoraria || null,env.ahora || new Date(),Number(process.env.HARVEST_STATE_ID||6)])).rows
}
export function sowingReasons(prepared,env) {
  const reasons=[]
  if (!prepared) reasons.push('Primero debe completarse la preparación de esta zona.')
  else if (new Date(env.ahora)-new Date(prepared)<15*86400000) reasons.push('Todavía no han pasado 15 días desde la preparación.')
  if (!env.zonaHoraria) return [...reasons,'No se conoce la zona horaria del huerto.']
  const minutes=localMinutes(env.ahora,env.zonaHoraria)
  if (minutes<480 || minutes>=720) reasons.push('La siembra está disponible de 08:00 a 12:00, hora local del huerto.')
  if (!lunarWindow(env.ahora,env.zonaHoraria,[1,2])) reasons.push('No está dentro del día de cuarto creciente o luna llena, más un día a cada lado.')
  return reasons
}
export async function availability(db,task,env) {
  const required=confirmations[task.codigo_actividad] || []
  const decisions=task.codigo_actividad==='cosecha'?['conservarCultivo']:[]
  if (task.completada_en) return { estado:'completada',puedeCompletar:false,motivos:[],confirmacionesRequeridas:required,decisionesRequeridas:decisions }
  const reasons=[]
  let pending=false
  const zone=env.zonaHoraria
  if(['retiro_maleza','preparacion_tierra'].includes(task.codigo_actividad)) {
    if(!task.id_zona) {reasons.push('Falta vincular la preparación a una sección del huerto.');pending=true}
    if(task.ciclo_vigente===false) reasons.push('La tarea pertenece a un ciclo anterior de la sección.')
    if(task.seccion_ocupada) reasons.push('La sección todavía tiene cultivos activos.')
  }
  if (!zone) { reasons.push('No se conoce la zona horaria del huerto.');pending=true }
  if (task.programada_para && new Date(task.programada_para)>new Date(env.ahora)
    && !(['abono_organico','limpieza_huerto','secado_almacenamiento'].includes(task.codigo_actividad)
      && zone && localDate(task.programada_para,zone)===localDate(env.ahora,zone))) {
    reasons.push('La fecha programada todavía no ha llegado.')
  }
  const cropRequired=['abono_organico','cosecha','siembra'].includes(task.codigo_actividad)
  if (cropRequired && (!task.id_planta || task.id_estado==null)) reasons.push('La tarea necesita un cultivo registrado.')
  if (cropRequired && Number(task.id_estado)===Number(process.env.HARVEST_STATE_ID || 6)) reasons.push('El cultivo ya fue cosechado.')
  switch(task.codigo_actividad) {
    case 'riego':
      if(!task.id_zona) {reasons.push('Falta vincular el riego a una sección del huerto.');pending=true}
      break
    case 'abono_organico': case 'senaletica': case 'limpieza_huerto': break
    case 'retiro_maleza':
      if (zone && !lunarWindow(env.ahora,zone,[0])) reasons.push('Retirar maleza requiere el día de luna nueva, el anterior o el siguiente.')
      if (!sunny(env)) reasons.push(env.clima?'Retirar maleza requiere sol o tiempo mayormente soleado y sin lluvia.':'No se pudo comprobar el clima; vuelve a intentarlo.')
      break
    case 'siembra': reasons.push(...sowingReasons(task.preparada_en,env));break
    case 'preparacion_tierra':
      if (!task.maleza_retirada_en) reasons.push('Primero debe completarse Retirar maleza en este ciclo de la zona.')
      break
    case 'cosecha': {
      const days=catalogDays(task.ciclo_cultivo)
      if (!days) {reasons.push('El catálogo no indica un ciclo en días para esta especie.');pending=true}
      else if (new Date(env.ahora)-new Date(task.fecha_exacta)<days*86400000) reasons.push(`El cultivo debe cumplir ${days} días desde su siembra.`)
      if (!task.parte_cosecha) {reasons.push('Falta registrar qué parte del cultivo se cosechará.');pending=true}
      else if (zone && !lunarWindow(env.ahora,zone,['semillas','raices'].includes(task.parte_cosecha)?[3]:[1,2])) reasons.push('La fecha no está en la ventana lunar de la parte que se cosechará.')
      if (zone) {
        if(!task.id_zona) {reasons.push('Falta vincular el cultivo a una sección del huerto.');pending=true}
        const watered=task.regada_dos_dias ?? (await db.query(`SELECT EXISTS(SELECT 1 FROM tareas_huerto r JOIN tareas_huerto actual
          ON r.id_huerto=actual.id_huerto AND r.id_zona=$4
          WHERE actual.id_tarea=$1 AND r.codigo_actividad='riego' AND r.completada_en IS NOT NULL
          AND (r.completada_en AT TIME ZONE $2)::date=(($3::timestamptz AT TIME ZONE $2)::date-2)) AS ok`,[task.id,zone,env.ahora,task.id_zona || null])).rows[0].ok
        if (!watered) reasons.push('Falta un riego de la sección del cultivo en la fecha local de hace dos días.')
        const ritual=task.ritual_completado ?? (await db.query(`SELECT EXISTS(SELECT 1 FROM tareas_huerto WHERE id_huerto=$1
          AND codigo_actividad='ritual_agradecimiento' AND completada_en IS NOT NULL
          AND (completada_en AT TIME ZONE $2)::date=($3::timestamptz AT TIME ZONE $2)::date) AS ok`,[String(task.id_huerto),zone,env.ahora])).rows[0].ok
        if (!ritual) reasons.push(RITUAL_REQUIRED)
      }
      if (!sunny(env)) reasons.push(env.clima?'Se necesita sol o tiempo mayormente soleado, de día y sin lluvia.':'No se pudo comprobar el clima; vuelve a intentarlo.')
      break
    }
    case 'ritual_agradecimiento':
      if (!env.amanecer || new Date(env.ahora)<new Date(env.amanecer)) reasons.push('Debe haber llegado el amanecer local de la jornada.')
      if (zone && task.programada_para && localDate(task.programada_para,zone)!==localDate(env.ahora,zone)) reasons.push('El ritual corresponde a otra jornada de cosecha.')
      break
    case 'secado_almacenamiento':
      if (!task.secado_iniciado_en) reasons.push('Falta registrar el inicio del secado a la sombra.')
      else if (zone && daysBetween(task.secado_iniciado_en,env.ahora,zone)<10) reasons.push('Todavía no llegó el día 10 del secado.')
      break
    default:
      pending=true;reasons.push('Esta actividad todavía tiene reglas de disponibilidad pendientes de definir.')
  }
  return { estado:reasons.length?(pending?'pendiente_configuracion':'no_disponible'):'disponible',
    puedeCompletar:reasons.length===0,motivos:[...new Set(reasons)],confirmacionesRequeridas:required,decisionesRequeridas:decisions }
}
export async function assertAvailable(db,task,env,body) {
  const state=await availability(db,task,env)
  if (!state.puedeCompletar) throw httpError(409,state.motivos.join(' '))
  const confirmed={}
  for(const name of state.confirmacionesRequeridas) {
    if (body?.confirmaciones?.[name]!==true) throw httpError(400,`Debes confirmar ${name}.`)
    confirmed[name]=true
  }
  if(task.codigo_actividad==='cosecha') {
    if(typeof body?.confirmaciones?.conservarCultivo!=='boolean') throw httpError(400,'Indica si conservarás el cultivo después de esta cosecha.')
    confirmed.conservarCultivo=body.confirmaciones.conservarCultivo
  }
  if (task.codigo_actividad==='preparacion_tierra' && typeof body?.confirmaciones?.abonoOrganico==='boolean') {
    confirmed.abonoOrganico=body.confirmaciones.abonoOrganico
  }
  await db.query('UPDATE tareas_huerto SET confirmaciones=confirmaciones || $2::jsonb WHERE id_tarea=$1',[task.id,JSON.stringify(confirmed)])
}
