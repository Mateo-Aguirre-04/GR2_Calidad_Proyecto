import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import ModalUnirse from "../components/ModalUnirse/ModalUnirse"
import videoFondo from "../assets/video-fondo.mp4"
import styles from './css/SeleccionGremio.module.css'

function SeleccionGremio() {

    const navigate = useNavigate()
    const [error, setError] = useState('')
    async function cerrarSesion() {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            if (!res.ok) throw new Error('No se pudo cerrar la sesión.')
            localStorage.removeItem('usuario_actual')
            localStorage.removeItem('gremio_activo')
            navigate('/')
        } catch {
            setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
        }
    }
    const [modalAbierto, setModalAbierto] = useState(false)

    return (
        <div className={`pagina ${styles.conVideo}`}>

            <video className={styles.video} autoPlay muted loop playsInline>
                <source src={videoFondo}/>
            </video>

            <div className={styles.capa}></div>

            <Header
            pregunta="Hasta pronto!"
            textoEnlace="Cerrar Sesión"
            onAccion={cerrarSesion}
            destino="/"
            />
            <main className={styles.contenido}>
                {error && <p role="alert">{error}</p>}
                <Tarjeta ancho={600} aria-labelledby="Selección">
                    <h1 className={styles.titulo}>Selecciona una Opción</h1>
                    <div className={styles.botones}>
                        <Button className={styles.boton} variante='bloque' onClick={() => setModalAbierto(true)}> Unirme a un Gremio </Button>
                        <Button className={styles.boton} as={Link} to="/crear-gremio" variante='bloque'> Crear un Gremio </Button>
                    </div>
                </Tarjeta>

                {modalAbierto && <ModalUnirse onCerrar={() => setModalAbierto(false)} />}
            </main>
        </div>
        
    )
}

export default SeleccionGremio