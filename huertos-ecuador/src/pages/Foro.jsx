import Header from '../components/Header/Header'
import styles from './css/Foro.module.css'

function Foro() {
  return (
    <div className="pagina">
      <Header pregunta="" textoEnlace="Regresar" destino="/juego" />

      <main className={styles.contenido}>
        <h1 className={styles.titulo}>Foro</h1>
        <p className={styles.proximamente}>Próximamente</p>
      </main>
    </div>
  )
}

export default Foro