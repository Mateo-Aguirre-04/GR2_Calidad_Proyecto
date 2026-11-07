import { useApiData } from './useApiData'
export function useHuerto(huertoIdProp) {
  const id = huertoIdProp || localStorage.getItem('huerto_activo_id')
  const { data, ...state } = useApiData(id ? `/api/huertos/${id}` : null)
  return { huerto: data, ...state }
}
