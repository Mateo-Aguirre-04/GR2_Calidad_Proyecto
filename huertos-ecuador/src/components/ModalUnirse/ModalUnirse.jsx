import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import Button from '../Button/Button'
import styles from './ModalUnirse.module.css'

function ModalUnirse({ onCerrar }) {
  const navigate = useNavigate()
  const [modo, setModo] = useState('codigo') // 'codigo' | 'qr'
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')

  function cambiarCodigo(e) {
    // solo dígitos, máximo 6
    setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  async function unirse(valor) {
    try {
      setMensaje('Verificando gremio...')
      const res = await fetch('/api/gremios/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: valor }),
      })
      const datos = await res.json()
      if (res.ok) {
        onCerrar()
        navigate('/juego')
      } else {
        setMensaje(datos.error || 'Código de gremio no válido.')
      }
    } catch {
      onCerrar()
      navigate('/juego')
    }
  }

  function enviar(e) {
    e.preventDefault()
    if (codigo.length === 6) unirse(codigo)
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-unirse-titulo"
      >
        <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>

        <h2 id="modal-unirse-titulo">Unirme a un gremio</h2>

        <div className={styles.tabs}>
          <Button
            className={modo === 'codigo' ? styles.tabActiva : ''}
            onClick={() => setModo('codigo')}
          >
            Código
          </Button>
          <Button
            className={modo === 'qr' ? styles.tabActiva : ''}
            onClick={() => setModo('qr')}
          >
            Escanear QR
          </Button>
        </div>

        {modo === 'codigo' ? (
          <form onSubmit={enviar}>
            <label htmlFor="codigo-gremio">Código de 6 dígitos</label>
            <input
              id="codigo-gremio"
              value={codigo}
              onChange={cambiarCodigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000001"
              maxLength={6}
            />
            {mensaje && <p className={styles.ayuda}>{mensaje}</p>}
            <Button type="submit" variante="bloque" disabled={codigo.length !== 6}>
              Unirme
            </Button>
          </form>
        ) : (
          <>
            <div className={styles.escaner}>
              <Scanner
                onScan={(resultados) => resultados[0] && unirse(resultados[0].rawValue)}
                onError={(err) => console.error(err)}
              />
            </div>
            <p className={styles.ayuda}>Apunta la cámara al código QR del gremio</p>
          </>
        )}
      </section>
    </div>
  )
}

export default ModalUnirse
