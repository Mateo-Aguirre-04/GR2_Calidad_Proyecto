import { useEffect, useMemo, useState } from 'react'
import { usePlantas } from '../../hooks/usePlantas'
import styles from './ModalSeleccionPlanta.module.css'
import TarjetaPlanta from '../TarjetaPlanta/TarjetaPlanta'

// Minúsculas y sin tildes: "Maíz" se encuentra escribiendo "maiz".
const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

function ModalSeleccionPlanta({ onSeleccionar, onCerrar }) {
  const { plantas, cargando, error } = usePlantas()
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda)
    if (!termino) return plantas
    return plantas.filter((p) =>
      [p.nombre, p.nombreCientifico, p.tipo, p.region].some((campo) => normalizar(campo).includes(termino)),
    )
  }, [plantas, busqueda])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCerrar()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  if (cargando) return <p className={styles.estado} role="status">Cargando plantas...</p>
  if (error) return <p className={styles.estado} role="alert">⚠ {error}</p>

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-seleccion-planta-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.cerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 className={styles.titulo} id="modal-seleccion-planta-titulo">
          Selecciona una Planta
        </h2>

        <input
          className={styles.buscador}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, nombre científico o tipo…"
          aria-label="Buscar planta"
          autoFocus
        />

        {filtradas.length === 0 ? (
          <p className={styles.estado}>No hay plantas que coincidan con “{busqueda}”.</p>
        ) : (
          <div className={styles.grid}>
            {filtradas.map((planta) => (
              <TarjetaPlanta
                key={planta.id}
                planta={planta}
                variante="compacta"
                onSeleccionar={onSeleccionar}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ModalSeleccionPlanta