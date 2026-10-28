import { Link } from 'react-router-dom'
import Button from '../Button/Button'
import styles from './TarjetaPlanta.module.css'

function TarjetaPlanta( {planta, onVerFicha} ) {
    const {id, nombre, tipo, region, cuidados, img} = planta

    return (
        <article className={styles.tarjeta}>
            <div className={styles.headerBox}>
                <div className={styles.icono}>
                    {img
                        ? <img src={img} loading='lazy'></img>
                        : <span aria-hidden="true">🌿</span>
                    }
                </div>
            <span className={styles.region}>{region}</span>
            </div>
            
            <h3 className={styles.nombrePlanta}>{nombre}</h3>
            <p className={styles.tipo}>{tipo}</p>

            <div className={styles.cuidados}>
                <p className={styles.desc}>
                    <span className={styles.strong}>Cuidados: </span> {cuidados}
                </p>
            </div>

            <Button variante='bloque' onClick={() => onVerFicha(planta)}>Ver Ficha</Button>
        </article>
    )
}

export default TarjetaPlanta