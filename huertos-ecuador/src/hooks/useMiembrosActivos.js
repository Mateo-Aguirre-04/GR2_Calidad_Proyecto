import { useEffect, useState } from 'react';

/**
 * Hook to fetch active members of the current guild.
 * Returns { miembrosActivos, cargando, error }.
 */
export function useMiembrosActivos() {
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abort = new AbortController();
    const stored = localStorage.getItem('gremio_activo');
    const id = stored ? JSON.parse(stored).id : null;
    if (!id) {
      setCargando(false);
      return;
    }
    async function cargar() {
      try {
        const res = await fetch(`/api/gremios/${id}/miembros-activos`, { signal: abort.signal });
        if (!res.ok) throw new Error('Error al cargar miembros activos');
        const data = await res.json();
        setMiembros(data);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
    return () => abort.abort();
  }, []);

  return { miembrosActivos: miembros, cargando, error };
}

