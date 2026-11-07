export function clearSession() {
  for (const key of ['usuario_actual', 'gremio_activo', 'huerto_activo_id']) localStorage.removeItem(key)
}

export function goToLogin() {
  clearSession()
  if (window.location.pathname !== '/') window.location.replace('/')
}

export async function authenticatedFetch(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: 'include' })
  if (response.status === 401) goToLogin()
  return response
}
