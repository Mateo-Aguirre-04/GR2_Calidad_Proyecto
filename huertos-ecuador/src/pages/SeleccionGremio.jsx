import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header/Header'
import Button from '../components/Button/Button'
import Tarjeta from '../components/Tarjeta/Tarjeta'
import ModalUnirse from "../components/ModalUnirse/ModalUnirse"
import videoFondo from "../assets/video-fondo.mp4"
import styles from './css/SeleccionGremio.module.css'

function SeleccionGremio() {

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