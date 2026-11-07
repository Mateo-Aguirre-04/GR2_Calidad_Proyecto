import { useApiData } from './useApiData'
export function usePlantas() {
  const { data, ...state } = useApiData('/api/plantas')
  return { plantas: data ?? [], ...state }
}
