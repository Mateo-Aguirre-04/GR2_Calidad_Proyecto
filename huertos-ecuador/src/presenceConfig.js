let pending

// Se consulta una vez por carga de página; no consulta Supabase.
export function loadPresenceConfig() {
  if (!pending) {
    pending = fetch('/api/auth/presence-config')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar la configuración de presencia.')
        return response.json()
      })
      .catch((error) => { pending = null; throw error })
  }
  return pending
}
