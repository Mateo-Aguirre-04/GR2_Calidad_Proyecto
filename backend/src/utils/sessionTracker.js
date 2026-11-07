/**
 * Simple in‑memory tracker for active users.
 * It stores a Map of userId → { lastSeen: Date, gremioId?: number }.
 * The map lives only while the Node process runs (development / prototype).
 */

const activeMap = new Map();

/**
 * Marca a un usuario como activo y actualiza su última actividad.
 * @param {number|string} userId - Identificador del usuario.
 * @param {number|string} [gremioId] - Opcional, id del gremio al que pertenece.
 */
export function markUserActive(userId, gremioId) {
  activeMap.set(userId, { lastSeen: new Date(), gremioId });
}

/**
 * Devuelve una lista de usuarios activos dentro del intervalo permitido.
 * @param {number} maxIdleMs - Tiempo máximo de inactividad (por defecto 5 min).
 * @returns {Array<[any, {lastSeen:Date,gremioId?:any}>}>
 */
export function getActiveUsers(maxIdleMs = 5 * 60 * 1000) {
  const now = Date.now();
  return [...activeMap.entries()].filter(
    ([, { lastSeen }]) => now - lastSeen.getTime() <= maxIdleMs
  );
}

/**
 * Elimina entradas que superen el tiempo de inactividad.
 * Se ejecuta periódicamente (cada minuto) para evitar que el Map crezca indefinidamente.
 */
export function pruneInactive(maxIdleMs = 5 * 60 * 1000) {
  const now = Date.now();
  for (const [id, { lastSeen }] of activeMap.entries()) {
    if (now - lastSeen.getTime() > maxIdleMs) {
      activeMap.delete(id);
    }
  }
}

// Ejecutar purga automática cada minuto (solo en entorno de desarrollo).
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => pruneInactive(), 60_000);
}

