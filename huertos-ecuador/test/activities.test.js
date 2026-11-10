import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('perfil recargable y panel separa recordatorios de actividades',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
  try {
    const {usePerfil}=await vite.ssrLoadModule('/src/hooks/usePerfil.js')
    function Perfil() {
      const result=usePerfil('5')
      assert.equal(typeof result.recargar,'function','Guardar una actividad debe poder recargar el perfil sin lanzar TypeError')
      return null
    }
    renderToStaticMarkup(React.createElement(Perfil))
    const {default:Panel}=await vite.ssrLoadModule('/src/components/PanelActividades/PanelActividades.jsx')
    const siembra={id:'siembra-1',actividad:{codigo:'siembra',nombre:'Sembrar',puntos:30},completado:true,
      cultivo:{plantaId:'9',fechaSiembra:'2026-11-01T15:00:00Z'}}
    const checklist={panel:{zonas:[{id:'1',nombre:'Sección plantada'},{id:'2',nombre:'Sección vacía'}],lotes:[]},
      cultivos:[{zonaId:'1',activo:true,plantaId:'9',fechaSiembra:'2026-11-01T15:00:00Z'}],tareas:[siembra],
      recordatorios:[{tipo:'riego_diario',texto:'Riega tus plantas',zonaId:'1',recordatorioActivo:true}]}
    const reminders=renderToStaticMarkup(React.createElement(Panel,{checklist}))
    assert.match(reminders,/Riega tus plantas/)
    assert.doesNotMatch(reminders,/Regar esta sección|Programar una actividad/)
    const activities=renderToStaticMarkup(React.createElement(Panel,{checklist,vistaInicial:'tareas'}))
    assert.match(activities,/Sección plantada · con plantas/)
    assert.match(activities,/Sección vacía · vacía/)
    assert.match(activities,/elige arriba una sección marcada/)
    const task=(id,name,fechaSiembra)=>({id,actividad:{codigo:'senaletica',nombre:name,puntos:25},
      cultivo:{plantaId:'9',fechaSiembra},zona:{id:'1',nombre:'Sección plantada'},
      disponibilidad:{puedeCompletar:false,motivos:[]}})
    const withOldTasks={...checklist,cultivos:[...checklist.cultivos,{zonaId:null,activo:true,plantaId:'9',fechaSiembra:'2026-10-01T15:00:00Z'}],
      tareas:[siembra,task('1','Señalética activa','2026-11-01T15:00:00Z'),
        task('2','Señalética de cultivo anterior','2026-10-01T15:00:00Z')],
      recordatorios:[...checklist.recordatorios,{tipo:'cosecha_lunar',texto:'Cosecha anterior',
        cultivo:{plantaId:'9',fechaSiembra:'2026-10-01T15:00:00Z'},recordatorioActivo:true}]}
    const visible=renderToStaticMarkup(React.createElement(Panel,{checklist:withOldTasks,vistaInicial:'tareas'}))
    assert.match(visible,/Señalética activa/)
    assert.doesNotMatch(visible,/Señalética de cultivo anterior/)
    assert.doesNotMatch(visible,/Ubicación pendiente/)
    const notices=renderToStaticMarkup(React.createElement(Panel,{checklist:withOldTasks}))
    assert.doesNotMatch(notices,/Cosecha anterior/)
  } finally {await vite.close()}
})
