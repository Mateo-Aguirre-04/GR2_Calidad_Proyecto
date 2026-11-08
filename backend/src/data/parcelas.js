// Cada parcela equivale a 100 m² del área real del gremio.
export const M2_POR_PARCELA = 100

// Reparte las parcelas del terreno en zonas del tamaño del fondo.
// Ej.: 800 m² con un fondo de 6 parcelas -> [6, 2]; 400 m² -> [4].
export function zonasDelHuerto(areaTotal, parcelasPorFondo) {
  const porFondo = Math.max(1, Math.trunc(Number(parcelasPorFondo)) || 1)
  const total = Math.max(1, Math.floor((Number(areaTotal) || 0) / M2_POR_PARCELA))
  const zonas = []
  for (let restantes = total; restantes > 0; restantes -= porFondo) {
    zonas.push(Math.min(porFondo, restantes))
  }
  return zonas
}