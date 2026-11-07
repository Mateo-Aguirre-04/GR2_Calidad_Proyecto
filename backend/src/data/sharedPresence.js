import { query } from '../config/db.js'
import { presenceConfig } from '../config/presence.js'

// No hace una consulta por cada petición: conserva el próximo vencimiento en sesión.
// El WHERE también evita escrituras duplicadas entre dos backends independientes.
export async function touchSharedPresence(req, knownLastSeen, dbQuery = query, now = Date.now()) {
  if (req.session.source !== 'postgres') return
  const known = knownLastSeen ? new Date(knownLastSeen).getTime() : NaN
  if (Number.isFinite(known)) {
    req.session.presenceDueAt = known + presenceConfig.updateIntervalMs
    req.session.sharedLastSeen = new Date(known).toISOString()
  }
  if (req.session.presenceDueAt > now) return
  const { rows } = await dbQuery(`UPDATE usuario_general SET last_seen = CURRENT_TIMESTAMP
    WHERE id_usuario=$1 AND (last_seen IS NULL OR last_seen <= CURRENT_TIMESTAMP - ($2 * interval '1 millisecond'))
    RETURNING last_seen`, [req.session.usuarioId, presenceConfig.updateIntervalMs])
  if (rows.length) req.session.sharedLastSeen = new Date(rows[0].last_seen).toISOString()
  req.session.presenceDueAt = now + presenceConfig.updateIntervalMs
}
