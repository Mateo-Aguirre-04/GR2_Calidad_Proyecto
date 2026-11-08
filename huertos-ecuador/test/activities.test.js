import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('perfil recargable y vistas separadas de riego y recordatorios',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
  try {
    const {usePerfil}=await vite.ssrLoadModule('/src/hooks/usePerfil.js')
    function Perfil() {
      const result=usePerfil('5')
      assert.equal(typeof result.recargar,'function','Guardar una actividad debe poder recargar el perfil sin lanzar TypeError')
      return null
    }
    renderToStaticMarkup(React.createElement(Perfil))
    const {default:ModalRiego}=await vite.ssrLoadModule('/src/components/PanelActividades/ModalRiego.jsx')
    const {default:Panel}=await vite.ssrLoadModule('/src/components/PanelActividades/PanelActividades.jsx')
    const checklist={panel:{zonas:[{id:'1',nombre:'Sección plantada'},{id:'2',nombre:'Sección vacía'}],lotes:[]},
      cultivos:[{zonaId:'1',activo:true,plantaId:'9',fechaSiembra:'2026-11-01T15:00:00Z'}],tareas:[],
      recordatorios:[{tipo:'riego_diario',texto:'Riega tus plantas',zonaId:'1',recordatorioActivo:true}]}
    const watering=renderToStaticMarkup(React.createElement(ModalRiego,{checklist}))
    assert.match(watering,/Sección plantada/)
    assert.doesNotMatch(watering,/Sección vacía|Programar una actividad|Riega tus plantas/)
    assert.match(watering,/disabled=""[^>]*>Regar esta sección/)
    const empty=renderToStaticMarkup(React.createElement(ModalRiego,{checklist:{...checklist,cultivos:[]}}))
    assert.match(empty,/No hay secciones con plantas activas/)
    const reminders=renderToStaticMarkup(React.createElement(Panel,{checklist}))
    assert.match(reminders,/Riega tus plantas/)
    assert.doesNotMatch(reminders,/Regar esta sección|Programar una actividad/)
  } finally {await vite.close()}
})
