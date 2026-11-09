import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine'
import { localDate, localMinutes, daysBetween, lunarWindow, catalogDays, sunny, harvestReminder, loadEnvironment, weatherAt } from '../src/data/checklistEnvironment.js'
import { sowingReasons, availability } from '../src/data/checklistRules.js'

const zone='America/Guayaquil'
function phase(quarter) {
  let event=SearchMoonQuarter(new Date('2026-10-01T00:00Z'))
  while(event.quarter!==quarter) event=NextMoonQuarter(event)
  return localDate(event.time.date,zone)
}
const at=(date,hour=10)=>new Date(`${date}T${String(hour+5).padStart(2,'0')}:00:00Z`)
test('modo de prueba carga el contexto sin esperar el servicio externo de clima',async()=>{
  const previous=process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS
  const previousNodeEnv=process.env.NODE_ENV
  const previousFetch=globalThis.fetch
  process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS='true'
  process.env.NODE_ENV='development'
  globalThis.fetch=()=>{throw new Error('No debe consultar Open-Meteo')}
  try {
    const db={query:async()=>({rows:[{latitud:0,longitud:0,zona_horaria:zone}]})}
    const env=await loadEnvironment(db,'5','42')
    assert.equal(env.zonaHoraria,zone)
    assert.equal(env.clima,null)
  } finally {
    if(previous===undefined)delete process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS
    else process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS=previous
    if(previousNodeEnv===undefined)delete process.env.NODE_ENV
    else process.env.NODE_ENV=previousNodeEnv
    globalThis.fetch=previousFetch
  }
})
test('un fallo del clima no bloquea cada consulta siguiente durante la caída',async()=>{
  const previousFetch=globalThis.fetch
  let attempts=0
  globalThis.fetch=async()=>{attempts++;throw new Error('Servicio no disponible')}
  try {
    await assert.rejects(weatherAt(99,99))
    await assert.rejects(weatherAt(99,99))
    assert.equal(attempts,1)
  } finally {globalThis.fetch=previousFetch}
})
test('usa el día y la hora local del huerto; no la fecha UTC',()=>{
  assert.equal(localDate('2026-11-09T01:00Z',zone),'2026-11-08')
  assert.equal(localMinutes('2026-11-09T01:00Z',zone),1200)
  assert.equal(daysBetween('2026-11-06T04:59Z','2026-11-08T05:00Z',zone),3)
})
test('la ventana lunar acepta el día de la fase y los dos días adyacentes, no dos días de margen',()=>{
  for(const quarter of [0,1,2,3]) {
    const date=at(phase(quarter))
    for(const delta of [-2,-1,0,1,2]) {
      assert.equal(lunarWindow(new Date(+date+delta*86400000),zone,[quarter]),Math.abs(delta)<=1)
    }
  }
})
test('siembra: 15 días transcurridos y desde las 08:00 sin cierre fijo',()=>{
  const now=at(phase(1)),prepared=new Date(+now-16*86400000)
  assert.deepEqual(sowingReasons(prepared,{ahora:at(phase(1),8),zonaHoraria:zone}),[])
  assert.deepEqual(sowingReasons(prepared,{ahora:at(phase(1),12),zonaHoraria:zone}),[])
  assert.deepEqual(sowingReasons(prepared,{ahora:new Date(+at(phase(1),10)+13*3600000),zonaHoraria:zone}),[])
  assert.ok(sowingReasons(prepared,{ahora:at(phase(1),7),zonaHoraria:zone}).some(reason=>reason.includes('08:00')))
  assert.ok(sowingReasons(new Date(+now-14*86400000),{ahora:now,zonaHoraria:zone}).length)
})
test('preparación requiere luna oscura y cosecha espera al menos hasta las 08:00',async()=>{
  const newMoon=phase(0)
  const prep={codigo_actividad:'preparacion_tierra',id_zona:'1',maleza_retirada_en:new Date(+at(newMoon)-86400000),ciclo_vigente:true,seccion_ocupada:false}
  for(const delta of [-2,-1,0,1,2]) {
    const state=await availability({},prep,{ahora:new Date(+at(newMoon)+delta*86400000),zonaHoraria:zone})
    assert.equal(state.puedeCompletar,Math.abs(delta)<=1)
  }
  const harvest={codigo_actividad:'cosecha',id_planta:'9',id_estado:5,id_zona:'1',fecha_exacta:new Date(+at(phase(1))-40*86400000),ciclo_cultivo:'30 días',parte_cosecha:'hojas',regada_dos_dias:true}
  const env={zonaHoraria:zone,clima:{codigo:0,precipitacion:0,esDia:1}}
  const before=await availability({},harvest,{...env,ahora:at(phase(1),7)})
  assert.ok(before.motivos.some(reason=>reason.includes('08:00')))
  const after=await availability({},harvest,{...env,ahora:at(phase(1),8)})
  assert.ok(!after.motivos.some(reason=>reason.includes('08:00')))
})
test('los rangos del catálogo usan el máximo, sin un plazo inventado para Anual o Perenne',()=>{
  assert.equal(catalogDays('Perenne (90-120 días)'),120)
  assert.equal(catalogDays('2 días'),2)
  assert.equal(catalogDays('Perenne'),null)
  assert.equal(catalogDays('Anual'),null)
  assert.equal(catalogDays('Perenne (4-7 años producción)'),null)
})
test('sol: WMO 0 o 1, sin precipitación, de día y con datos recientes; el fallo de API no habilita',()=>{
  const env={ahora:new Date('2026-11-08T15:00Z'),clima:{codigo:1,precipitacion:0,esDia:1,observadaEn:new Date('2026-11-08T14:55Z')}}
  assert.equal(!!sunny(env),true)
  for(const patch of [{codigo:2},{precipitacion:0.1},{esDia:0},{observadaEn:new Date('2026-11-08T13:00Z')}]) {
    assert.equal(!!sunny({...env,clima:{...env.clima,...patch}}),false)
  }
  assert.equal(!!sunny({...env,clima:null}),false)
})
test('secado permanece pendiente en el día 15 si todavía falta confirmar que está seco',async()=>{
  const task={codigo_actividad:'secado_almacenamiento',secado_iniciado_en:new Date('2026-11-01T18:00Z'),programada_para:new Date('2026-11-11T18:00Z')}
  const state=await availability({},task,{ahora:new Date('2026-11-16T15:00Z'),zonaHoraria:zone})
  assert.equal(state.puedeCompletar,true)
  assert.deepEqual(state.confirmacionesRequeridas,['seco','empacado','etiquetado','almacenado'])
})
test('el riego previo se recuerda dos fechas locales antes de una cosecha posible; si ya está registrado no se vuelve a pedir',()=>{
  const now=at(phase(1)),task={ciclo_cultivo:'2 días',fecha_exacta:new Date(+now-30*86400000).toISOString(),parte_cosecha:'hojas'}
  const plan=harvestReminder(task,{ahora:new Date(+now-3*86400000),zonaHoraria:zone})
  assert.ok(plan.requiereRiego)
  assert.equal(Math.round((Date.parse(plan.fechaCosechaPrevista)-Date.parse(plan.fechaRiego))/86400000),2)
  const covered=harvestReminder(task,{ahora:new Date(`${plan.fechaRiego}T15:00Z`),zonaHoraria:zone},[plan.fechaRiego])
  assert.equal(covered.requiereRiego,false)
})

test('ritual opcional solo permite marcar la tarea de ese mes el día 15 local, sin exigir amanecer',async()=>{
  const task={codigo_actividad:'ritual_agradecimiento',clave_generacion:'ritual:2026-11-15',programada_para:'2026-11-15T15:00Z'}
  for(const [now,allowed] of [['2026-11-14T15:00Z',false],['2026-11-15T05:00Z',true],['2026-11-16T05:00Z',false],['2026-12-15T15:00Z',false]]) {
    const state=await availability({},task,{ahora:new Date(now),zonaHoraria:zone,amanecer:null})
    assert.equal(state.puedeCompletar,allowed)
    assert.deepEqual(state.confirmacionesRequeridas,[])
  }
})

test('modo de prueba omite fechas y luna, pero conserva sección y riego para cosecha',async()=>{
  const now=new Date('2026-11-08T15:00:00Z')
  const task={codigo_actividad:'cosecha',id_planta:'9',id_estado:5,id_zona:'1',fecha_exacta:now,
    ciclo_cultivo:'30 días',parte_cosecha:'hojas',regada_dos_dias:false,regada_seccion:true,
    programada_para:new Date(+now+30*86400000)}
  const state=await availability({},task,{ahora:now,zonaHoraria:zone,ignorarRestriccionesTemporales:true,clima:null})
  assert.equal(state.puedeCompletar,true)
  const missingWater=await availability({}, {...task,regada_seccion:false},
    {ahora:now,zonaHoraria:zone,ignorarRestriccionesTemporales:true,clima:null})
  assert.ok(missingWater.motivos.some(reason=>reason.includes('riego de la sección')))
  const missingSection=await availability({}, {...task,id_zona:null,regada_seccion:false},
    {ahora:now,zonaHoraria:zone,ignorarRestriccionesTemporales:true,clima:null})
  assert.ok(missingSection.motivos.some(reason=>reason.includes('vincular el cultivo')))
})
