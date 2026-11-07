import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '@yudiel/react-qr-scanner'
import Button from '../Button/Button'
import styles from './ModalUnirse.module.css'

function ModalUnirse({ onCerrar }) {
  const navigate = useNavigate()
  const [modo, setModo] = useState('codigo') // 'codigo' | 'qr'
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Cerrar modal al presionar Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  function cambiarCodigo(e) {
    // Solo dígitos numéricos, máximo 6
    setError('')
    setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  async function unirse(valor) {
    if (cargando) return
    const codigoLimpio = String(valor).trim()
    if (!codigoLimpio) return

    setCargando(true)
    setError('')
    setMensaje('Verificando código de gremio...')

    try {
      // Obtener el ID del usuario actual de la sesión local
      let usuarioId = null
      try {
        const u = localStorage.getItem('usuario_actual')
        if (u) {
          const parseado = JSON.parse(u)
          usuarioId = parseado.id || parseado.id_usuario
        }
      } catch {}

      const res = await fetch('/api/gremios/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoLimpio, usuarioId }),
      })

      const datos = await res.json()

      if (res.ok) {
        setMensaje(datos.mensaje || '¡Te has unido exitosamente al gremio!')

        // Sincronizar gremio y huerto activo en localStorage
        if (datos.gremio) {
          localStorage.setItem('gremio_activo', JSON.stringify(datos.gremio))
          localStorage.setItem('huerto_activo_id', String(datos.gremio.id))
        }

        setTimeout(() => {
          onCerrar()
          navigate('/juego')
        }, 1100)
      } else {
        setMensaje('')
        setError(datos.error || 'Código de gremio no válido o expirado.')
      }
    } catch {
      setMensaje('')
      setError('No se pudo conectar con el servidor. Revisa tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  function enviar(e) {
    e.preventDefault()
    if (codigo.length === 6) {
      unirse(codigo)
    }
  }

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
        aria-labelledby="modal-unirse-titulo"
      >
        <button
          className={styles.cerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar modal"
        >
          ×
        </button>

        <h2 id="modal-unirse-titulo">Unirme a un gremio</h2>

        <div className={styles.tabs}>
          <Button
            className={modo === 'codigo' ? styles.tabActiva : ''}
            onClick={() => {
              setModo('codigo')
              setError('')
            }}
          >
            Código
          </Button>
          <Button
            className={modo === 'qr' ? styles.tabActiva : ''}
            onClick={() => {
              setModo('qr')
              setError('')
            }}
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
              disabled={cargando}
            />

            {error && <p className={styles.error} role="alert">⚠ {error}</p>}
            {mensaje && <p className={styles.exito} role="status">{mensaje}</p>}

            <Button
              type="submit"
              variante="bloque"
              disabled={codigo.length !== 6 || cargando}
            >
              {cargando ? 'Verificando...' : 'Unirme'}
            </Button>
          </form>
        ) : (
          <>
            <div className={styles.escaner}>
              <Scanner
                onScan={(resultados) => {
                  if (resultados?.[0]?.rawValue) {
                    unirse(resultados[0].rawValue)
                  }
                }}
                onError={(err) => console.error('[Scanner error]', err)}
              />
            </div>

            {error && <p className={styles.error} role="alert">⚠ {error}</p>}
            {mensaje && <p className={styles.exito} role="status">{mensaje}</p>}

            <p className={styles.ayuda}>
              {cargando
                ? 'Validando código QR...'
                : 'Apunta la cámara al código QR generado por tu gremio'}
            </p>
          </>
        )}
      </section>
    </div>
  )
}

export default ModalUnirse
