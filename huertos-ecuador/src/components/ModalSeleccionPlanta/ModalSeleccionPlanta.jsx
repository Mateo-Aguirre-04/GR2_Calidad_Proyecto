
import { useEffect, useState } from 'react'
import { usePlantas } from '../../hooks/usePlantas'
import styles from './ModalSeleccionPlanta.module.css'
import TarjetaPlanta from '../TarjetaPlanta/TarjetaPlanta'

function ModalSeleccionPlanta({ onSeleccionar, onCerrar }) {
  const { plantas, cargando, error } = usePlantas()
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null)

  const elegir = (planta) => {
    setPlantaSeleccionada(planta)
    onSeleccionar(planta)
  }

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

        <div className={styles.grid}>
          {plantas.map((planta) => (
            <TarjetaPlanta
              key={planta.id}
              planta={planta}
              variante="compacta"
              onSeleccionar={elegir}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default ModalSeleccionPlanta
