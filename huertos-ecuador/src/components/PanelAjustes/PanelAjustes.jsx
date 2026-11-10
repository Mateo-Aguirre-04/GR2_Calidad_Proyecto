import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../../authSession'
import Button from '../Button/Button'
import styles from './PanelAjustes.module.css'

// Panel lateral de ajustes. Se mantiene montado para animar la apertura y el cierre.
function PanelAjustes({ abierto, onCerrar }) {
  const navigate = useNavigate()
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto) return
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCerrar])

  async function cerrarSesion() {
    setCerrando(true)
    setError('')
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error()
      clearSession()
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
      setCerrando(false)
    }
  }

  return (
    <div className={`${styles.contenedor} ${abierto ? styles.abierto : ''}`} inert={!abierto}>
      <div className={styles.fondo} onClick={onCerrar} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="panel-ajustes-titulo">
        <header className={styles.encabezado}>
          <h2 id="panel-ajustes-titulo">Ajustes</h2>
          <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar ajustes">×</button>
        </header>

        <div className={styles.contenido} />

        <footer className={styles.pie}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button variante="bloque" onClick={cerrarSesion} disabled={cerrando}>
            {cerrando ? 'Cerrando…' : 'Cerrar sesión'}
          </Button>
        </footer>
      </aside>
    </div>
  )
}

export default PanelAjustes
