import { catalogDays, daysBetween, localDate, localMinutes, lunarWindow, nextLunarEventDate, sunny } from './checklistEnvironment.js'

const DAY=86400000
const shift=(date,days)=>new Date(Date.parse(date)+days*DAY).toISOString().slice(0,10)
const active=t=>!t.completada_en && Number(t.id_estado)!==Number(process.env.HARVEST_STATE_ID||6)
const RECIPIENTS=new Set(['balcon','botellas','colgantes','escaleras','llantas','maceteros','pared','terraza','ventana'])
export function matureCrop(task,env) {
  const days=catalogDays(task.ciclo_cultivo)
  return active(task)&&!!days&&new Date(env.ahora)-new Date(task.fecha_exacta)>=days*DAY
}

// Los avisos son derivados: leerlos no crea actividades ni entrega recompensas.
export function activityReminders({details,zones,crops,env,tipoHuerto='surcos'}) {
  if(!env.zonaHoraria)return []
  const zone=env.zonaHoraria,today=localDate(env.ahora,zone),tomorrow=shift(today,1)
  const phaseOn=(date,quarters)=>nextLunarEventDate(env.ahora,zone,quarters,`${date}T12:00:00Z`)===date
  const reminders=[]
  const add=(tipo,texto,task,extra={})=>reminders.push({tipo,texto,recordatorioActivo:true,
    ...(task?{tareaId:task.id,zonaId:task.id_zona,nombre:task.zona_nombre,
      ...(task.id_planta?{cultivo:{plantaId:String(task.id_planta),fechaSiembra:task.fecha_exacta}}:{})}:{}),...extra})
  const waters=details.filter(t=>t.codigo_actividad==='riego'&&t.completada_en)
  const lastCleaning=details.filter(t=>t.codigo_actividad==='limpieza_huerto'&&t.completada_en)
    .map(t=>t.completada_en).sort((a,b)=>new Date(b)-new Date(a))[0]
  let cleaningShown=false
  for(const section of zones) {
    const plantedCrops=crops.filter(c=>c.activo&&c.zonaId===section.id)
    const planted=plantedCrops.length>0
    const sectionWaters=waters.filter(t=>t.id_zona===section.id)
    const lastWater=sectionWaters.map(t=>t.completada_en).sort((a,b)=>new Date(b)-new Date(a))[0]
    const weekly=RECIPIENTS.has(tipoHuerto)
    const dueWater=weekly
      ? planted&&daysBetween(lastWater||plantedCrops.map(c=>c.fechaSiembra).sort((a,b)=>new Date(a)-new Date(b))[0],env.ahora,zone)>=7
      : planted&&!sectionWaters.some(t=>localDate(t.completada_en,zone)===today)
    if(dueWater) {
      add(weekly?'riego_semanal':'riego_diario',weekly
        ?'Revisa tus plantas en recipientes: ya pasaron siete días desde la siembra o el último riego.'
        :'No olvides regar tus plantas hoy para mantenerlas con vida y saludables.',null,{zonaId:section.id,nombre:section.nombre})
    }
    const sown=details.some(t=>t.codigo_actividad==='siembra'&&t.completada_en&&String(t.ciclo_contexto)===section.cicloId)
    if(!planted&&!sown&&!section.requiereNuevoCiclo&&section.preparadaEn
      &&new Date(env.ahora)-new Date(section.preparadaEn)>=14*DAY&&phaseOn(tomorrow,[1,2])) {
      add('siembra','¡Falta 1 día para la luna creciente o llena! Prepárate para salir al amanecer a sembrar tus cultivos.',null,
        {zonaId:section.id,nombre:section.nombre,anticipado:true})
    }
  }
  for(const task of details.filter(t=>!t.completada_en)) {
    const due=!task.programada_para||localDate(task.programada_para,zone)<=today
    switch(task.codigo_actividad) {
      case 'retiro_maleza':
        if(due&&task.id_zona&&task.ciclo_vigente&&!task.seccion_ocupada&&sunny(env)&&env.clima.codigo===0&&phaseOn(today,[0]))
          add('retiro_maleza','El día está completamente soleado y nos encontramos en luna oscura. Es el momento perfecto para retirar la maleza.',task)
        break
      case 'preparacion_tierra':
        if(due&&task.id_zona&&task.ciclo_vigente&&!task.seccion_ocupada&&task.maleza_retirada_en&&lunarWindow(env.ahora,zone,[0]))
          add('preparacion_tierra','Has terminado de quitar la maleza y estamos en la ventana de luna oscura. La tierra está lista para ser preparada.',task)
        break
      case 'senaletica':
        if(due&&active(task))add('senaletica','Organiza tu espacio colocando la señalética correspondiente en las zonas del huerto.',task)
        break
      case 'secado_almacenamiento':
        if(task.secado_iniciado_en&&daysBetween(task.secado_iniciado_en,env.ahora,zone)>=10)
          add('secado_almacenamiento','Han pasado al menos 10 días desde que guardaste tu cosecha a la sombra. Revisa que esté seca antes de empacar, etiquetar y almacenar.',task)
        break
      case 'limpieza_huerto':
        if(due&&!cleaningShown&&(!lastCleaning||daysBetween(lastCleaning,env.ahora,zone)>=7)) {
          add('limpieza_huerto','Tu huerto necesita un poco de atención. Date una vuelta para limpiarlo y dejarlo impecable.',task)
          cleaningShown=true
        }
        break
      case 'abono_organico':
        if(due&&active(task)&&daysBetween(task.ultimo_abono||task.fecha_exacta,env.ahora,zone)>=20)
          add('abono_organico','Es hora de nutrir la tierra. No olvides aplicar abono orgánico a tus cultivos.',task)
        break
      case 'ritual_agradecimiento':
        if(['14','15'].includes(today.slice(-2))&&task.clave_generacion===`ritual:${today.slice(0,8)}15`)
          add('ritual_agradecimiento','Tómate un momento del día 15 para realizar el ritual de agradecimiento a la Pachamama y honrar a la tierra. Esta actividad es opcional.',task,{anticipado:today.slice(-2)==='14'})
        break
      case 'riego':
        if(task.seccion_ocupada&&due&&!waters.some(t=>t.id_zona===task.id_zona&&localDate(t.completada_en,zone)===today))
          add('riego',`Tienes un riego programado pendiente en ${task.zona_nombre}.`,task)
        break
      case 'cosecha': {
        if(!matureCrop(task,env))break
        if(task.regada_dos_dias)add('riego_previo_cosecha','Han pasado dos días desde que regaste esta planta. ¡El suelo está listo para la cosecha! Revisa también los demás requisitos.',task)
        if(localMinutes(env.ahora,zone)>=480&&sunny(env)&&env.clima.codigo===0&&Number.isFinite(env.clima.temperatura)&&env.clima.temperatura>=22
          &&(phaseOn(today,[1,2])||phaseOn(shift(today,-1),[1,2])))
          add('cosecha_clima','El clima está cálido, con al menos 22 °C y sol radiante, y la noche tuvo luna creciente o llena. ¡Condiciones ideales para cosechar!',task)
        if(localMinutes(env.ahora,zone)>=480&&env.clima?.esDia===1&&env.clima.precipitacion===0
          &&env.clima.observadaEn&&Math.abs(new Date(env.ahora)-new Date(env.clima.observadaEn))<=30*60000)
          add('cosecha_rocio','Ya pasaron las 08:00 y no está lloviendo. Comprueba que el rocío de la mañana se haya secado por completo antes de recolectar.',task)
        if(['hojas','flores','frutos'].includes(task.parte_cosecha)&&phaseOn(tomorrow,[1,2]))
          add('cosecha_lunar','Mañana la luna está en fase creciente o llena. Es el momento idóneo para cosechar hojas, flores y frutos.',task,{anticipado:true})
        if(['semillas','raices'].includes(task.parte_cosecha)&&phaseOn(today,[3]))
          add('cosecha_lunar','Nos encontramos en cuarto menguante. ¡Aprovecha para cosechar semillas y raíces!',task)
        break
      }
    }
  }
  // Una tarea programada y un aviso periódico no deben pedir dos veces el mismo riego.
  return reminders.filter(r=>!['riego_diario','riego_semanal'].includes(r.tipo)||!reminders.some(other=>other.tipo==='riego'&&other.zonaId===r.zonaId))
}
