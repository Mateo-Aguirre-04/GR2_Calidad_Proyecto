import { randomUUID } from 'node:crypto'
import { mockData } from './mockStore.js'

export function recordMockActivity(req, huerto, tipo, texto, usuarioId = req.session?.usuarioId) {
  // No atribuir acciones anónimas ni de PostgreSQL a identidades de la demo.
  if (req.session?.source !== 'mock' || usuarioId !== req.session.usuarioId) return
  const user = mockData.usuarios.find((u) => u.id === usuarioId && u.gremioId === huerto?.gremioId)
  if (!user) return
  mockData.actividades.push({
    id: randomUUID(), gremioId: huerto.gremioId, usuarioId: user.id,
    jugador: user.nombre, tipo, texto, fecha: new Date().toISOString(),
  })
}
