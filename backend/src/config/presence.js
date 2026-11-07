// Cambiar aquí para la versión final. Valores en minutos.
export const PRESENCE_UPDATE_MINUTES = 60
export const PRESENCE_ONLINE_MINUTES = 75

export const presenceConfig = {
  updateIntervalMs: PRESENCE_UPDATE_MINUTES * 60_000,
  refreshIntervalMs: PRESENCE_UPDATE_MINUTES * 60_000,
  onlineWindowMs: PRESENCE_ONLINE_MINUTES * 60_000,
}

if (PRESENCE_ONLINE_MINUTES <= PRESENCE_UPDATE_MINUTES) {
  throw new Error('El plazo en línea debe ser mayor al intervalo de actualización.')
}
