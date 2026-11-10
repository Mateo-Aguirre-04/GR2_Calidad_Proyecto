import { useState } from 'react'
import styles from './ModalCantidadSiembra.module.css'

const MAX_PLANTAS = 9999

// maximo = plantas que caben en la parcela (capacidadParcela). m2 = área real de la parcela.
function ModalCantidadSiembra({ planta, parcela, zona, maximo = MAX_PLANTAS, m2, enviando, onConfirmar, onCerrar, error }) {
  const tope = Math.max(1, Math.min(Math.trunc(Number(maximo)) || 1, MAX_PLANTAS))
  const [cantidad, setCantidad] = useState('1')
  const [parteCosecha,setParteCosecha]=useState('')
  const [ritual,setRitual]=useState(false)
  const valor = Number(cantidad)
  const valida = Number.isInteger(valor) && valor >= 1 && valor <= tope

  function enviar(event) {
    event.preventDefault()
    if (valida && parteCosecha && ritual && !enviando) onConfirmar(valor,{parteCosecha,confirmaciones:{ritualAmanecer:ritual}})
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !enviando) onCerrar() }}
    >
      <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cantidad-titulo" onSubmit={enviar}>
        <button className={styles.cerrar} type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">×</button>
        <h2 id="cantidad-titulo">Sembrar {planta.nombre}</h2>
        <p>Zona {zona} · Parcela {parcela}{m2 ? ` (${m2} m²)` : ''}</p>
        <label htmlFor="cantidad-plantas">¿Cuántas plantas sembraste en esta parcela?</label>
        <input
          id="cantidad-plantas"
          type="number"
          inputMode="numeric"
          min="1"
          max={tope}
          step="1"
          value={cantidad}
          onChange={(event) => setCantidad(event.target.value)}
          readOnly={tope === 1}
          autoFocus
          required
        />
        <p>{tope === 1 ? 'Esta parcela admite 1 planta.' : `Máximo ${tope} plantas en esta parcela.`}</p>
        <label>Parte que cosecharás<select required value={parteCosecha} onChange={e=>setParteCosecha(e.target.value)} disabled={enviando}>
          <option value="">Selecciona</option>{['hojas','flores','frutos','semillas','raices'].map(p=><option key={p}>{p}</option>)}</select></label>
        <label><input type="checkbox" checked={ritual} onChange={e=>setRitual(e.target.checked)} disabled={enviando}/>Confirmo que realicé el ritual al amanecer</label>
        {error&&<p role="alert">{error}</p>}
        <button className={styles.confirmar} type="submit" disabled={!valida || !parteCosecha || !ritual || enviando}>
          {enviando ? 'Guardando…' : 'Sembrar'}
        </button>
      </form>
    </div>
  )
}

export default ModalCantidadSiembra
