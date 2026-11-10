import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plantaDisponibleEnCatalogo } from '../src/data/catalogoMedicinal.js'

const planta={catalogo_activo:true,fases:Array.from({length:5},(_,i)=>({fase:i+1,imagen:`/plantas/Menta/menta${i+1}.png`}))}

test('catálogo medicinal exige imágenes de las cinco fases y permite conservar el historial de especies retiradas',()=>{
  assert.equal(plantaDisponibleEnCatalogo(planta),true)
  assert.equal(plantaDisponibleEnCatalogo({...planta,catalogo_activo:false}),false)
  for(const fases of [null,[],planta.fases.slice(1),planta.fases.map(f=>({...f,imagen:' '})),
    planta.fases.map(f=>({...f,fase:1})),planta.fases.map(f=>({...f,muerta:true}))]) {
    assert.equal(plantaDisponibleEnCatalogo({...planta,fases}),false)
  }
})
