import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Button from '../Button/Button'
import styles from './ModalInvitar.module.css'

function ModalInvitar({ gremioId, gremioNombre, onCerrar }) {
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    // Cerrar con Escape
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  // Obtener código de invitación del backend
  const generarInvitacion = async () => {
    setCargando(true)
    setError('')
    try {
      let usuarioId = null
      try {
        const u = localStorage.getItem('usuario_actual')
        if (u) {
          const parseado = JSON.parse(u)
          usuarioId = parseado.id
        }
      } catch {}

      const res = await fetch(`/api/gremios/${gremioId}/invitaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creadoPor: usuarioId }),
      })

      const data = await res.json()
      if (res.ok && data.invitacion?.codigo) {
        setCodigo(data.invitacion.codigo)
      } else {
        setError(data.error || 'No se pudo generar la invitación.')
      }
    } catch {
      setError('Error al conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (gremioId) {
      generarInvitacion()
    }
  }, [gremioId])

  const copiarCodigo = async () => {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Si el navegador bloquea clipboard, seleccionamos fallback
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
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
        aria-labelledby="modal-invitar-titulo"
      >
        <button
          className={styles.cerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar modal"
        >
          ×
        </button>

        <h2 id="modal-invitar-titulo">Invitar a {gremioNombre || 'tu Gremio'}</h2>
        <p className={styles.subtitulo}>
          Comparte este código de 6 dígitos o pide que escaneen el código QR:
        </p>

        {cargando && <p className={styles.cargando}>Generando invitación...</p>}

        {error && (
          <div>
            <p className={styles.error}>⚠ {error}</p>
            <Button onClick={generarInvitacion} variante="bloque">
              Reintentar
            </Button>
          </div>
        )}

        {!cargando && !error && codigo && (
          <>
            <div className={styles.qrMarco}>
              <QRCodeSVG
                value={codigo}
                size={180}
                bgColor="#ffffff"
                fgColor="#243d22"
                level="M"
                marginSize={2}
              />
            </div>

            <div className={styles.codigoCaja}>
              <span className={styles.codigoTexto}>{codigo}</span>
              <button
                type="button"
                className={`${styles.botonCopiar} ${copiado ? styles.copiadoExito : ''}`}
                onClick={copiarCodigo}
              >
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>

            <p className={styles.infoExpira}>
              ⏳ <strong>Válido por 24 horas</strong>. Otros jardineros pueden ingresar este
              código o escanear el QR desde la pantalla <em>«Unirme a un Gremio»</em>.
            </p>

            <div className={styles.acciones}>
              <Button onClick={onCerrar} variante="bloque">
                Cerrar
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ModalInvitar

