// Área real por parcela cuando el tipo no la define.
export const M2_POR_PARCELA = 100

// Espacio que ocupa una planta (m²); la tabla planta no trae este dato.
export const M2_POR_PLANTA_DEFECTO = 0.25

// Debe coincidir con huertos-ecuador/src/data/parcelasHuerto.js:
// parcelas = parcelas dibujadas en el fondo, m2 = área de UNA parcela, maxPlantas = tope fijo.
export const TIPOS_HUERTO = {
  surcos:             { parcelas: 6,  m2: 100 },
  camadas:            { parcelas: 3,  m2: 50 },
  camellones:         { parcelas: 4,  m2: 50 },
  terrazas_agricolas: { parcelas: 4,  m2: 100 },
  balcon:             { parcelas: 8,  m2: 1 },
  botellas:           { parcelas: 11, m2: 1, maxPlantas: 1 },
  colgantes:          { parcelas: 5,  m2: 1 },
  escaleras:          { parcelas: 6,  m2: 1 },
  llantas:            { parcelas: 5,  m2: 1 },
  maceteros:          { parcelas: 5,  m2: 1 },
  pared:              { parcelas: 6,  m2: 1 },
  terraza:            { parcelas: 4,  m2: 4 },
  ventana:            { parcelas: 3,  m2: 1 },
}

export function tipoDesdeImagen(imagen) {
  const tipo = String(imagen || '').replace(/^.*\//, '').replace(/\.png$/, '')
  return TIPOS_HUERTO[tipo] ? tipo : 'surcos'
}

const redondear = (n) => Math.round(n * 100) / 100

// Reparte el área TOTAL del huerto en parcelas y las parcelas en zonas del tamaño del fondo.
// Devuelve zonas = [[m² parcela 1, m² parcela 2, ...], ...]. La última parcela se queda con el
// sobrante para que se use todo el área.
// Ej.: surcos (100 m², 6 por fondo): 100 m² -> [[100]]; 800 m² -> [[100 x6], [100, 100]];
//      850 m² -> [[100 x6], [100, 100, 50]].
export function distribucionHuerto(areaTotal, tipo, numParcelasFondo) {
  const config = TIPOS_HUERTO[tipo] ?? TIPOS_HUERTO.surcos
  const m2 = config.m2 > 0 ? config.m2 : M2_POR_PARCELA
  // El fondo no puede mostrar más parcelas de las que tiene dibujadas.
  const deBd = Math.trunc(Number(numParcelasFondo))
  const porFondo = deBd > 0 ? Math.min(deBd, config.parcelas) : config.parcelas
  const area = Number(areaTotal) > 0 ? Number(areaTotal) : m2

  // 1e-9 evita errores de coma flotante (p. ej. 0.3 / 0.1).
  const completas = Math.floor(area / m2 + 1e-9)
  const sobrante = redondear(area - completas * m2)
  const areas = Array(completas).fill(m2)
  if (sobrante > 0) areas.push(sobrante)

  const zonas = []
  for (let i = 0; i < areas.length; i += porFondo) zonas.push(areas.slice(i, i + porFondo))
  return { porFondo, m2PorParcela: m2, maxPlantas: config.maxPlantas ?? null, areaTotal: area, zonas }
}

// m² de una parcela concreta, o null si esa parcela no está habilitada.
export function areaDeParcela(distribucion, zona, parcela) {
  return distribucion.zonas[zona - 1]?.[parcela - 1] ?? null
}

// Cuántas plantas caben en una parcela de `m2Parcela` m².
export function capacidadParcela(m2Parcela, maxPlantas, espacioPlanta = M2_POR_PLANTA_DEFECTO) {
  const porPlanta = Number(espacioPlanta) > 0 ? Number(espacioPlanta) : M2_POR_PLANTA_DEFECTO
  const porArea = Math.max(1, Math.floor(Number(m2Parcela) / porPlanta + 1e-9))
  return Number(maxPlantas) > 0 ? Math.min(Number(maxPlantas), porArea) : porArea
}