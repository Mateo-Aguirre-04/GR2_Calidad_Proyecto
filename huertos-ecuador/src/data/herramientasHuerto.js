import { iconoHuerto } from './iconosHuerto'

export const DURACION_RIEGO_MS = 1600

// El botón y el cursor leen la misma imagen.
export const HERRAMIENTAS_HUERTO=[
  {clave:'riego',nombre:'Regar',etiqueta:'Regar',descripcion:'Selecciona una parcela con plantas para regarla.',icono:{src:iconoHuerto('herramientas','regar')}},
  {clave:'cosecha',nombre:'Cosechar',etiqueta:'Cosechar',descripcion:'Selecciona una parcela para revisar y confirmar su cosecha.',icono:{src:iconoHuerto('herramientas','cosechar')}},
]
