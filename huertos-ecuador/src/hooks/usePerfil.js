import { useApiData } from './useApiData'
import { authenticatedFetch } from '../authSession'
export function usePerfil(usuarioId) {
  const { data, recargar, ...state } = useApiData(usuarioId ? `/api/perfil/${usuarioId}` : null)
  async function guardarDescripcion(descripcion) {
    const res = await authenticatedFetch(`/api/perfil/${usuarioId}/descripcion`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'No se pudo guardar el perfil.')
    recargar()
  }
  return { perfil: data, guardarDescripcion, ...state }
}
