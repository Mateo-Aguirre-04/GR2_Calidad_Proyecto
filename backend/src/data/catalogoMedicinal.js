import { fasesCrecimiento } from './fases.js'

// El catálogo del juego requiere las cinco imágenes de crecimiento y cosecha.
// Las especies retiradas permanecen disponibles solo para su historial anterior.
export function plantaDisponibleEnCatalogo(planta) {
  if(!planta||planta.catalogo_activo===false)return false
  const fases=fasesCrecimiento(planta.fases)
  return [1,2,3,4,5].every(numero=>fases.some(f=>Number(f.fase)===numero
    &&typeof f.imagen==='string'&&f.imagen.trim().length>0))
}
