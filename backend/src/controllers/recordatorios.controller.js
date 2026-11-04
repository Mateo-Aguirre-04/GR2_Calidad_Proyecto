import { mockData } from '../data/mockStore.js'

export async function getRecordatorios(req, res) {
  try {
    const usuarioId = parseInt(req.params.usuarioId, 10) || 2
    const lista = mockData.recordatorios.filter((r) => r.usuarioId === usuarioId || !r.usuarioId)

    return res.json(lista)
  } catch (error) {
    console.error('[Recordatorios.getRecordatorios]', error)
    return res.status(500).json({ error: 'Error al obtener recordatorios.' })
  }
}

export async function completarRecordatorio(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    const recordatorio = mockData.recordatorios.find((r) => r.id === id)

    if (!recordatorio) {
      return res.status(404).json({ error: 'Recordatorio no encontrado.' })
    }

    recordatorio.completado = true

    // Premiar al usuario con puntos de gamificación (ej. 15 puntos)
    const usuario = mockData.usuarios.find((u) => u.id === recordatorio.usuarioId) || mockData.usuarios[1]
    usuario.puntos += 15

    return res.json({
      mensaje: '¡Actividad completada! Has sumado 15 puntos de gamificación.',
      recordatorio,
      nuevosPuntos: usuario.puntos,
    })
  } catch (error) {
    console.error('[Recordatorios.completarRecordatorio]', error)
    return res.status(500).json({ error: 'Error al completar el recordatorio.' })
  }
}
