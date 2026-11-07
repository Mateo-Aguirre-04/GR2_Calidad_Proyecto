import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import ModalUnirse from "../components/ModalUnirse/ModalUnirse"
import videoFondo from "../assets/video-fondo.mp4"
import styles from './css/SeleccionGremio.module.css'

function SeleccionGremio() {
    const navigate = useNavigate()
    const [modalAbierto, setModalAbierto] = useState(false)

    // Si el usuario ya pertenece a un gremio, redirigir directamente al juego
    useEffect(() => {
        try {
            const raw = localStorage.getItem('usuario_actual')
            if (raw) {
                const u = JSON.parse(raw)
                if (u.gremioId) {
                    navigate('/juego', { replace: true })
                }
            }
        } catch {}
    }, [navigate])

    return (
        <div className={`pagina ${styles.conVideo}`}>

            <video className={styles.video} autoPlay muted loop playsInline>
                <source src={videoFondo}/>
            </video>

            <div className={styles.capa}></div>

            <Header
            pregunta="Hasta pronto!"
            textoEnlace="Cerrar Sesión"
            destino="/"
            />
            <main className={styles.contenido}>
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