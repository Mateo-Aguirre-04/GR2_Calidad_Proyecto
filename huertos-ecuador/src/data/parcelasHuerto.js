// Fondos de public/huertos. Todas las medidas están en % de la imagen: [x, y, ancho, alto].
//  - parcelas: zona clicable de cada parcela. El orden es la numeración (1, 2, ...).
//  - tierra:   zona de TIERRA de cada parcela (misma numeración), medida sobre la imagen.
//              Las plantas se dibujan ahí, no sobre el recipiente.
//  - relacion: ancho / alto de la imagen; mantiene todo alineado con el fondo.
//  - m2PorParcela: área real (m²) que representa UNA parcela. El área total del huerto
//              viene de la base de datos y se reparte en parcelas con este valor
//              (ver distribucionHuerto), así se aprovechan todos los m² del huerto.
//  - maxPlantas: tope fijo de plantas por parcela (p. ej. 1 por botella). Si falta,
//              se calcula con m2PorParcela y el espacio de cada planta.

const ANCHA = 1774 / 887
const ESTANDAR = 1730 / 909

// Área real por parcela cuando el tipo no la define.
export const M2_POR_PARCELA = 100

// Espacio que ocupa una planta (m²) cuando la planta no trae `espacioM2`.
export const M2_POR_PLANTA_DEFECTO = 0.25

export const FONDOS_HUERTO = {
  surcos: {
    relacion: ESTANDAR,
    m2PorParcela: 100,
    parcelas: [
      [8, 42, 25, 20], [33, 42, 25, 20], [58, 42, 25, 20], [4, 63, 27, 22],
      [31, 63, 27, 22], [58, 63, 27, 22],
    ],
    tierra: [
      [8.2, 42.0, 24.5, 19.7], [33.2, 42.0, 24.5, 19.7], [58.2, 42.1, 23.8, 19.6], [4.2, 63.1, 26.5, 21.5],
      [31.2, 63.1, 26.5, 21.5], [58.2, 63.1, 26.4, 21.6],
    ],
  },
  camadas: {
    relacion: ESTANDAR,
    m2PorParcela: 50,
    parcelas: [
      [5, 53, 27, 26], [30, 53, 27, 26], [55, 53, 26, 26],
    ],
    tierra: [
      [5.9, 53.1, 25.5, 25.5], [30.3, 53.1, 26.1, 25.5], [55.3, 53.1, 24.8, 25.4],
    ],
  },
  camellones: {
    relacion: ESTANDAR,
    m2PorParcela: 50,
    parcelas: [
      [3, 47, 20, 37], [24, 47, 18, 37], [45, 47, 19, 37], [65, 47, 20, 37],
    ],
    tierra: [
      [3.4, 47.4, 19.2, 36.1], [24.3, 47.4, 17.4, 36.1], [45.2, 47.4, 18.3, 36.1], [65.3, 47.4, 19.1, 36.1],
    ],
  },
  terrazas_agricolas: {
    relacion: ESTANDAR,
    m2PorParcela: 100,
    parcelas: [
      [6, 30, 34, 9], [6, 41, 48, 9], [6, 53, 61, 10], [3, 66, 79, 18],
    ],
    tierra: [
      [6.2, 30.1, 32.3, 8.7], [6.5, 40.9, 46.6, 8.9], [6.5, 52.9, 59.5, 9.8], [3.9, 66.1, 77.1, 17.6],
    ],
  },
  balcon: {
    relacion: ANCHA,
    m2PorParcela: 1,
    parcelas: [
      [13, 28, 11, 9], [30, 34, 13, 6], [24, 50, 10, 11], [39, 46, 10, 10],
      [50, 38, 14, 12], [44, 55, 11, 13], [68, 48, 15, 14], [50, 64, 20, 21],
    ],
    tierra: [
      [14.7, 29.0, 6.3, 2.3], [30.9, 36.2, 11.2, 1.7], [25.3, 52.2, 8.1, 3.5], [39.7, 48.7, 8.5, 3.2],
      [52.1, 40.4, 10.3, 6.5], [45.7, 56.0, 9.1, 4.7], [69.3, 50.8, 12.1, 7.9], [51.6, 64.9, 15.8, 15.1],
    ],
  },
  botellas: {
    relacion: ESTANDAR,
    m2PorParcela: 1,
    maxPlantas: 1,
    parcelas: [
      [11, 44, 6, 12], [28, 44, 6, 12], [45, 44, 6, 12], [61, 44, 6, 12],
      [19, 57, 7, 14], [36, 57, 7, 14], [53, 57, 7, 14], [9, 72, 9, 20],
      [26, 72, 9, 20], [43, 72, 9, 20], [61, 72, 9, 20],
    ],
    tierra: [
      [11.8, 44.8, 4.7, 2.1], [28.7, 44.8, 4.7, 2.1], [45.4, 44.8, 4.8, 2.1], [61.8, 44.8, 4.7, 2.1],
      [19.8, 58.1, 5.4, 2.3], [36.8, 58.1, 5.4, 2.3], [53.8, 58.0, 5.4, 2.4], [9.8, 74.0, 7.7, 3.6],
      [27.1, 74.0, 7.6, 3.6], [44.3, 74.0, 7.7, 3.6], [61.5, 74.0, 7.7, 3.6],
    ],
  },
  colgantes: {
    relacion: 1729 / 910,
    m2PorParcela: 1,
    parcelas: [
      [11, 40, 20, 12], [35, 40, 20, 12], [59, 40, 20, 12], [18, 69, 23, 14],
      [49, 69, 23, 14],
    ],
    tierra: [
      [12.6, 39.9, 17.1, 6.4], [37.0, 39.9, 16.3, 6.3], [60.8, 39.9, 16.8, 6.3], [20.2, 70.0, 19.4, 6.8],
      [50.6, 70.0, 19.8, 6.8],
    ],
  },
  escaleras: {
    relacion: ANCHA,
    m2PorParcela: 1,
    parcelas: [
      [11, 44, 14, 11], [9, 57, 14, 12], [6, 72, 15, 14], [48, 44, 14, 11],
      [50, 58, 15, 11], [52, 72, 17, 14],
    ],
    tierra: [
      [12.4, 46.6, 11.7, 5.7], [9.6, 59.5, 12.7, 7.3], [6.0, 75.4, 14.3, 9.8], [49.4, 46.8, 11.4, 5.5],
      [51.3, 59.4, 13.1, 7.4], [53.3, 75.4, 14.9, 9.8],
    ],
  },
  llantas: {
    relacion: ANCHA,
    m2PorParcela: 1,
    parcelas: [
      [19, 44, 18, 22], [47, 44, 19, 22], [5, 62, 21, 26], [32, 63, 21, 25],
      [59, 63, 21, 25],
    ],
    tierra: [
      [20.9, 47.0, 15.4, 9.2], [48.8, 46.7, 15.6, 9.7], [7.2, 65.8, 16.9, 11.4], [34.2, 65.8, 16.8, 11.5],
      [61.2, 66.0, 16.7, 11.4],
    ],
  },
  maceteros: {
    relacion: ESTANDAR,
    m2PorParcela: 1,
    parcelas: [
      [2, 54, 16, 29], [19, 57, 15, 27], [35, 54, 16, 29], [51, 57, 16, 27],
      [67, 54, 16, 29],
    ],
    tierra: [
      [3.2, 55.6, 13.5, 9.2], [19.9, 60.2, 13.0, 9.1], [35.7, 55.6, 13.4, 9.1], [52.4, 60.1, 13.0, 9.2],
      [68.2, 55.6, 13.5, 9.4],
    ],
  },
  pared: {
    relacion: ESTANDAR,
    m2PorParcela: 1,
    parcelas: [
      [7, 23, 33, 12], [46, 23, 33, 12], [7, 45, 33, 13], [46, 45, 33, 13],
      [7, 68, 33, 12], [46, 68, 33, 12],
    ],
    tierra: [
      [7.7, 25.0, 30.8, 3.6], [46.7, 25.0, 30.9, 3.6], [7.6, 46.8, 30.8, 3.7], [46.8, 46.8, 30.9, 3.7],
      [7.6, 69.3, 30.9, 3.7], [46.7, 69.3, 30.9, 3.7],
    ],
  },
  terraza: {
    relacion: 1672 / 941,
    m2PorParcela: 4,
    parcelas: [
      [9, 47, 31, 12], [43, 47, 31, 12], [2, 60, 35, 30], [40, 60, 35, 30],
    ],
    tierra: [
      [10.5, 47.2, 27.9, 4.9], [44.4, 47.2, 27.8, 5.0], [3.2, 62.0, 32.5, 10.3], [41.7, 62.2, 31.8, 10.0],
    ],
  },
  ventana: {
    relacion: ANCHA,
    m2PorParcela: 1,
    parcelas: [
      [15, 63, 22, 21], [37, 63, 23, 21], [59, 63, 22, 21],
    ],
    tierra: [
      [16.1, 65.1, 20.1, 8.8], [38.0, 65.1, 19.9, 8.8], [60.0, 65.1, 19.7, 8.8],
    ],
  },
}

export function fondoHuerto(tipo) {
  return FONDOS_HUERTO[tipo] ?? FONDOS_HUERTO.surcos
}

export function m2PorParcela(tipo) {
  return fondoHuerto(tipo).m2PorParcela ?? M2_POR_PARCELA
}

const redondear = (n) => Math.round(n * 100) / 100

// Reparte el área TOTAL del huerto en parcelas y las parcelas en zonas del tamaño del fondo.
// Misma lógica que backend/src/data/parcelas.js (el backend es quien la envía en huerto.parcelas;
// esta copia es el respaldo si no llega). La última parcela se queda con el sobrante.
// Ej.: surcos (100 m², 6 por fondo): 100 m² -> [[100]]; 800 m² -> [[100 x6], [100, 100]].
export function distribucionHuerto(areaTotal, tipo) {
  const fondo = fondoHuerto(tipo)
  const m2 = m2PorParcela(tipo)
  const porFondo = fondo.parcelas.length
  const area = Number(areaTotal) > 0 ? Number(areaTotal) : m2
  // 1e-9 evita errores de coma flotante (p. ej. 0.3 / 0.1).
  const completas = Math.floor(area / m2 + 1e-9)
  const sobrante = redondear(area - completas * m2)
  const areas = Array(completas).fill(m2)
  if (sobrante > 0) areas.push(sobrante)
  const zonas = []
  for (let i = 0; i < areas.length; i += porFondo) zonas.push(areas.slice(i, i + porFondo))
  return { porFondo, m2PorParcela: m2, maxPlantas: fondo.maxPlantas ?? null, areaTotal: area, zonas }
}

// Cuántas plantas caben en una parcela de `m2Parcela` m² (máximo al sembrar).
// planta.espacioM2 = m² que ocupa una planta; si no existe se usa un valor por defecto.
export function capacidadParcela(m2Parcela, maxPlantas, planta) {
  const porPlanta = Number(planta?.espacioM2) > 0 ? Number(planta.espacioM2) : M2_POR_PLANTA_DEFECTO
  const porArea = Math.max(1, Math.floor(Number(m2Parcela) / porPlanta + 1e-9))
  return Number(maxPlantas) > 0 ? Math.min(Number(maxPlantas), porArea) : porArea
}