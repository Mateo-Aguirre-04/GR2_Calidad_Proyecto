import { useEffect, useState } from 'react'
import { usePlantas } from '../../hooks/usePlantas'
import styles from './ModalSeleccionPlanta.module.css'
import ModalPlanta from '../ModalPlanta/ModalPlanta'

function ModalSeleccionPlanta({ onSeleccionar, onCerrar }) {
  const { plantas, cargando, error } = usePlantas()
  const [plantaSeleccionada, setPlantaSeleccionada] = useState(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  if (cargando) return <p className={styles.estado} role="status">Cargando plantas...</p>
  if (error) return <p className={styles.estado} role="alert">⚠ {error}</p>

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-seleccion-planta-titulo">
        <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">×</button>
        <h2 id="modal-seleccion-planta-titulo">Selecciona una planta</h2>
        <div className={styles.grid}>
          {plantas.map((planta) => (
            <div key={planta.id} className={styles.item} onClick={() => { setPlantaSeleccionada(planta); onSeleccionar(planta); onCerrar(); }} role="button" tabIndex={0}>
              <img src={planta.imagenes?.[0] || ''} alt={planta.nombre} loading="lazy" />
              <p>{planta.nombre}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ModalSeleccionPlanta

