import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('riego y cosecha comparten icono con el cursor y actúan desde la parcela',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
  try {
    const {HERRAMIENTAS_HUERTO}=await vite.ssrLoadModule('/src/data/herramientasHuerto.js')
    const {default:Icono}=await vite.ssrLoadModule('/src/components/BotonLateral/IconoHerramienta.jsx')
    const {default:Boton}=await vite.ssrLoadModule('/src/components/BotonLateral/BotonLateral.jsx')
    const {default:Parcela}=await vite.ssrLoadModule('/src/components/Parcela/Parcela.jsx')
    const {default:ModalCosecha}=await vite.ssrLoadModule('/src/components/ModalCosechaHerramienta/ModalCosechaHerramienta.jsx')
    for(const herramienta of HERRAMIENTAS_HUERTO) {
      const button=renderToStaticMarkup(React.createElement(Boton,{boton:herramienta,activo:true,onSeleccionar:()=>{}}))
      const cursor=renderToStaticMarkup(React.createElement(Icono,{icono:herramienta.icono}))
      assert.match(button,new RegExp(herramienta.icono.emoji))
      assert.match(cursor,new RegExp(herramienta.icono.emoji))
      assert.match(button,/aria-pressed="true"/)
    }
    assert.match(renderToStaticMarkup(React.createElement(Icono,{icono:{src:'/herramienta.png'}})),/src="\/herramienta.png"/)
    const crop={id:'9:2026-11-08T15:00:00Z',zona:1,parcela:1,cantidad:1,sembradoEn:'2026-11-08T15:00:00Z',
      planta:{nombre:'Menta',diasCrecimiento:60}}
    const props={numero:1,rect:[0,0,20,20],cultivo:crop,ahora:new Date('2026-11-08T15:00:00Z'),
      onRegar:()=>{},onCosechar:()=>{},onSembrar:()=>{},onVerInfo:()=>{}}
    assert.match(renderToStaticMarkup(React.createElement(Parcela,{...props,modo:'riego'})),/Parcela 1: Menta.*Regar/)
    assert.match(renderToStaticMarkup(React.createElement(Parcela,{...props,modo:'cosecha'})),/Parcela 1: Menta.*Cosechar/)
    const empty=renderToStaticMarkup(React.createElement(Parcela,{...props,cultivo:null,modo:'riego'}))
    assert.match(empty,/disabled=""/)
    assert.doesNotMatch(empty,/Sembrar/)
    const harvest=renderToStaticMarkup(React.createElement(ModalCosecha,{cultivo:crop,
      tarea:{actividad:{puntos:35},disponibilidad:{puedeCompletar:true,motivos:[]}},onConfirmar:()=>{},onCerrar:()=>{}}))
    assert.match(harvest,/El cultivo está listo/)
    assert.match(harvest,/El rocío está seco/)
    assert.match(harvest,/Finalizar el cultivo y liberar la sección/)
    assert.match(harvest,/disabled=""[^>]*>Cosechar · 35 puntos/)
  } finally {await vite.close()}
})
