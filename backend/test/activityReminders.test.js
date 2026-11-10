import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine'
import { activityReminders } from '../src/data/activityReminders.js'
import { localDate } from '../src/data/checklistEnvironment.js'

const zone='America/Guayaquil',DAY=86400000
const date='2026-11-08T15:00:00Z'
const crop={plantaId:'9',fechaSiembra:'2026-09-01T15:00:00Z',zonaId:'1',activo:true}
const section={id:'1',nombre:'Zona 1 · Parcela 1',cicloId:'1'}
const harvest={id:'1',codigo_actividad:'cosecha',id_zona:'1',zona_nombre:section.nombre,id_planta:'9',
  id_estado:1,fecha_exacta:crop.fechaSiembra,ciclo_cultivo:'30 días',parte_cosecha:'hojas',regada_dos_dias:true}
const environment=(now=date)=>({ahora:new Date(now),zonaHoraria:zone,
  clima:{codigo:0,esDia:1,precipitacion:0,temperatura:24,observadaEn:new Date(now)}})
const reminders=(details=[],env=environment(),crops=[crop],zones=[section],tipoHuerto='surcos')=>activityReminders({details,env,crops,zones,tipoHuerto})
const has=(list,type)=>list.some(r=>r.tipo===type)
function phase(quarter) {
  let event=SearchMoonQuarter(new Date('2026-11-01T00:00Z'))
  while(event.quarter!==quarter)event=NextMoonQuarter(event)
  return new Date(`${localDate(event.time.date,zone)}T15:00:00Z`)
}

test('riego diario por sección: exige plantas, desaparece hoy y vuelve al cambiar la fecha local',()=>{
  assert.equal(has(reminders(),'riego_diario'),true)
  assert.equal(has(reminders([],environment(),[]),'riego_diario'),false)
  const water={codigo_actividad:'riego',id_zona:'1',completada_en:'2026-11-09T01:00:00Z'}
  assert.equal(has(reminders([water],environment('2026-11-09T02:00:00Z')),'riego_diario'),false)
  assert.equal(has(reminders([water],environment('2026-11-09T05:00:00Z')),'riego_diario'),true)
  assert.equal(has(reminders([{...water,id_zona:'2'}]),'riego_diario'),true)
})
test('riego semanal solo en diseños con recipientes; se cuenta desde siembra o último riego',()=>{
  const planted={...crop,fechaSiembra:'2026-11-01T15:00:00Z'}
  const on=(when,details=[],tipo='maceteros')=>reminders(details,environment(when),[planted],[section],tipo)
  assert.equal(has(on('2026-11-07T15:00:00Z'),'riego_semanal'),false)
  assert.equal(has(on('2026-11-08T15:00:00Z'),'riego_semanal'),true)
  const watered={codigo_actividad:'riego',id_zona:'1',completada_en:'2026-11-08T15:00:00Z'}
  assert.equal(has(on('2026-11-08T16:00:00Z',[watered]),'riego_semanal'),false)
  assert.equal(has(on('2026-11-14T15:00:00Z',[watered]),'riego_semanal'),false)
  assert.equal(has(on('2026-11-15T15:00:00Z',[watered]),'riego_semanal'),true)
  assert.equal(has(on('2026-11-07T15:00:00Z',[],'surcos'),'riego_diario'),true)
})

for(const [tipoHuerto,tipoAviso] of [['surcos','riego_diario'],['maceteros','riego_semanal']]) {
  test(`modo de prueba: ${tipoAviso} desaparece al regar y vuelve el siguiente día local`,()=>{
    const env={...environment('2026-11-09T02:00:00Z'),ignorarRestriccionesTemporales:true}
    const water={codigo_actividad:'riego',id_zona:'1',completada_en:'2026-11-09T01:00:00Z'}
    const on=(details=[],current=env)=>reminders(details,current,[crop],[section],tipoHuerto)
    assert.equal(has(on(),tipoAviso),true)
    assert.equal(has(on([water]),tipoAviso),false)
    assert.equal(has(on([{...water,id_zona:'2'}]),tipoAviso),true)
    assert.equal(has(on([{...water,completada_en:null}]),tipoAviso),true)
    assert.equal(has(on([water],{...env,ahora:new Date('2026-11-09T05:00:00Z')}),tipoAviso),true)
  })
}

test('cosecha: los avisos son por cultivo maduro, desaparecen al cosechar y no se inventan días del catálogo',()=>{
  assert.equal(has(reminders([harvest]),'riego_previo_cosecha'),true)
  for(const patch of [{completada_en:date},{id_estado:6},{ciclo_cultivo:'Perenne'},{fecha_exacta:date},{regada_dos_dias:false}]) {
    assert.equal(has(reminders([{...harvest,...patch}]),'riego_previo_cosecha'),false)
  }
})

test('rocío: desde las 08:00 locales, durante el día y sin lluvia reciente verificada',()=>{
  assert.equal(has(reminders([harvest],environment('2026-11-08T12:59:00Z')),'cosecha_rocio'),false)
  assert.equal(has(reminders([harvest],environment('2026-11-08T13:00:00Z')),'cosecha_rocio'),true)
  for(const clima of [null,{...environment().clima,precipitacion:1},{...environment().clima,esDia:0},{...environment().clima,observadaEn:'2026-11-07T15:00Z'}])
    assert.equal(has(reminders([harvest],{...environment(),clima}),'cosecha_rocio'),false)
})

test('luna: hojas el día anterior a creciente/llena, raíces el propio cuarto menguante',()=>{
  const crescent=phase(1),last=phase(3)
  assert.equal(has(reminders([harvest],environment(+crescent-DAY)),'cosecha_lunar'),true)
  assert.equal(has(reminders([harvest],environment(crescent)),'cosecha_lunar'),false)
  const roots={...harvest,parte_cosecha:'raices'}
  assert.equal(has(reminders([roots],environment(last)),'cosecha_lunar'),true)
  assert.equal(has(reminders([roots],environment(+last-DAY)),'cosecha_lunar'),false)
})

test('siembra: solo la víspera lunar, sección preparada y sin siembra ni plantas',()=>{
  const crescent=phase(1),env=environment(+crescent-DAY)
  const zones=[{...section,preparadaEn:new Date(+crescent-30*DAY)}]
  assert.equal(has(reminders([],env,[],zones),'siembra'),true)
  assert.equal(has(reminders([],environment(crescent),[],zones),'siembra'),false)
  assert.equal(has(reminders([],env,[crop],zones),'siembra'),false)
  assert.equal(has(reminders([{codigo_actividad:'siembra',ciclo_contexto:'1',completada_en:date}],env,[],zones),'siembra'),false)
})

test('maleza y preparación: sección libre, ciclo vigente y condiciones específicas',()=>{
  const task={id:'2',codigo_actividad:'retiro_maleza',id_zona:'1',ciclo_vigente:true,seccion_ocupada:false}
  const env=environment(phase(0))
  assert.equal(has(reminders([task],env),'retiro_maleza'),true)
  assert.equal(has(reminders([task],{...env,clima:{...env.clima,codigo:1}}),'retiro_maleza'),false)
  const prep={...task,codigo_actividad:'preparacion_tierra',maleza_retirada_en:date}
  assert.equal(has(reminders([prep],env),'preparacion_tierra'),true)
  assert.equal(has(reminders([prep],environment(+phase(0)+2*DAY)),'preparacion_tierra'),false)
  for(const patch of [{ciclo_vigente:false},{seccion_ocupada:true},{maleza_retirada_en:null},{completada_en:date}])
    assert.equal(has(reminders([{...prep,...patch}],env),'preparacion_tierra'),false)
})

test('secado: día 10 local, sigue pendiente el día 15 y desaparece al almacenar',()=>{
  const task={id:'4',codigo_actividad:'secado_almacenamiento',secado_iniciado_en:'2026-11-01T23:00Z'}
  assert.equal(has(reminders([task],environment('2026-11-10T15:00Z')),'secado_almacenamiento'),false)
  assert.equal(has(reminders([task],environment('2026-11-11T15:00Z')),'secado_almacenamiento'),true)
  assert.equal(has(reminders([task],environment('2026-11-16T15:00Z')),'secado_almacenamiento'),true)
  assert.equal(has(reminders([{...task,completada_en:'2026-11-15T15:00Z'}],environment('2026-11-16T15:00Z')),'secado_almacenamiento'),false)
})

test('señalética desaparece al completar o finalizar el cultivo; sin zona horaria no se inventan avisos',()=>{
  const sign={...harvest,codigo_actividad:'senaletica'}
  assert.equal(has(reminders([sign]),'senaletica'),true)
  for(const patch of [{completada_en:date},{id_estado:6}])assert.equal(has(reminders([{...sign,...patch}]),'senaletica'),false)
  assert.deepEqual(reminders([sign],{...environment(),zonaHoraria:null}),[])
})

test('modo de prueba muestra recordatorios lunares, de plazo y cosecha sin cumplir la fecha',()=>{
  const env={...environment(),ignorarRestriccionesTemporales:true,clima:null}
  const futureWeed={id:'22',codigo_actividad:'retiro_maleza',id_zona:'1',programada_para:'2030-01-01T00:00:00Z',ciclo_vigente:true,seccion_ocupada:false}
  assert.equal(has(reminders([futureWeed],env),'retiro_maleza'),true)
  const youngHarvest={...harvest,fecha_exacta:date,regada_dos_dias:false}
  const list=reminders([youngHarvest,{...harvest,codigo_actividad:'senaletica',id:'23'},
    {codigo_actividad:'riego',id_zona:'1',completada_en:'2026-11-01T15:00:00Z'}],env)
  assert.equal(has(list,'cosecha_lunar'),true)
  assert.equal(has(list,'cosecha_rocio'),true)
  assert.equal(has(list,'riego_previo_cosecha'),true)
  assert.equal(has(list,'senaletica'),true)
})

test('clima cálido: cultivo maduro, luna de la noche y umbral de 22 °C con cielo despejado',()=>{
  const env=environment(phase(2))
  assert.equal(has(reminders([harvest],env),'cosecha_clima'),true)
  for(const patch of [{temperatura:21.9},{temperatura:null},{codigo:1},{precipitacion:0.1}])
    assert.equal(has(reminders([harvest],{...env,clima:{...env.clima,...patch}}),'cosecha_clima'),false)
  assert.equal(has(reminders([{...harvest,fecha_exacta:env.ahora}],env),'cosecha_clima'),false)
  assert.equal(has(reminders([harvest],environment(phase(3))),'cosecha_clima'),false)
})

test('abono recurrente: aviso desde el día 20 y desaparece tras cada aplicación',()=>{
  const fertilizer={...harvest,codigo_actividad:'abono_organico',ultimo_abono:'2026-10-20T15:00Z'}
  assert.equal(has(reminders([fertilizer],environment('2026-11-08T15:00Z')),'abono_organico'),false)
  assert.equal(has(reminders([fertilizer],environment('2026-11-09T05:00Z')),'abono_organico'),true)
  assert.equal(has(reminders([{...fertilizer,completada_en:'2026-11-09T15:00Z'}],environment('2026-11-10T15:00Z')),'abono_organico'),false)
})

test('ritual opcional: solo se anuncia los días 14 y 15 del mes correspondiente',()=>{
  const ritual={id:'8',codigo_actividad:'ritual_agradecimiento',clave_generacion:'ritual:2026-11-15'}
  for(const day of [13,14,15,16])assert.equal(has(reminders([ritual],environment(`2026-11-${day}T15:00Z`)),'ritual_agradecimiento'),[14,15].includes(day))
  assert.equal(has(reminders([{...ritual,completada_en:'2026-11-15T15:00Z'}],environment('2026-11-15T16:00Z')),'ritual_agradecimiento'),false)
  assert.equal(has(reminders([ritual],environment('2026-12-15T15:00Z')),'ritual_agradecimiento'),false)
})
