import { useMemo, useState } from 'react'
import { usePlantas } from '../hooks/usePlantas'
import TarjetaPlanta from '../components/TarjetaPlanta/TarjetaPlanta'
import Header from '../components/Header/Header'
import ModalPlanta from '../components/ModalPlanta/ModalPlanta'
import styles from './css/Catalogo.module.css'

function Catalogo() {
  const { plantas, cargando, error } = usePlantas()
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState('')
  const [region, setRegion] = useState('')
  const [plantaAbierta, setPlantaAbierta] = useState(null)

  // Las opciones de los selects salen de los datos
  const tipos = useMemo(() => [...new Set(plantas.map((p) => p.tipo))].sort(), [plantas])
  const regiones = useMemo(() => [...new Set(plantas.map((p) => p.region))].sort(), [plantas])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return plantas.filter((p) =>
      (!texto || p.nombre.toLowerCase().includes(texto)) &&
      (!tipo || p.tipo === tipo) &&
      (!region || p.region === region)
    )
  }, [plantas, busqueda, tipo, region])

  return (
    <div className={styles.box}>

        <Header 
            pregunta=""
            textoEnlace="Regresar"
            destino="/"
        />

        <main className={styles.contenido}>

            <h1 className={styles.titulo}> Catálogo de plantas </h1>
            <p className={styles.subtitulo}> Explora las plantas aptas para huertos ecológicos en Ecuador</p>

            <section className={styles.filtros} aria-label='filtro-plantas'>
                <h2 className={styles.tituloFiltro}> Filtro de Búsquedas</h2>

                <div className={styles.filtrosGrid}>

                    <div>
                        <label htmlFor='busqueda' className={styles.label}> Buscar por Nombre: </label>
                        <input id='busqueda' value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder='Tomates, Papa, Menta...'></input>
                    </div>

                    <div>
                        <label htmlFor='tipo' className={styles.label}> Buscar por Tipo de Planta: </label>
                        <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <option value='' className={styles.default}> Todos los tipos </option>
                            {tipos.map( (t) => <option key={t} value={t}> {t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor='region' className={styles.label}> Buscar por Región del Ecuador: </label>
                        <select id='region' value={region} onChange={ (e) => setRegion(e.target.value)}>
                            <option value='' className={styles.default}> Todas las regiones</option>
                            {regiones.map( (r) => <option key={r} value={r}> {r}</option>) }
                        </select>
                    </div>
                </div>
            </section>

            {cargando && <p className={styles.estado} role="status">Cargando plantas...</p>}
            {error && <p className={styles.estado} role="alert">⚠ {error}</p>}
            {!cargando && !error && visibles.length === 0 && (
                <p className={styles.estado}>No se encontraron plantas con esos filtros.</p>
            )}

            <div className={styles.grid}>
                {visibles.map((planta) => (
                    <TarjetaPlanta key={planta.id} planta={planta} onVerFicha={setPlantaAbierta} />
                ))}
            </div>

            {plantaAbierta && (
                <ModalPlanta
                key={plantaAbierta.id}
                planta={plantaAbierta}
                onCerrar={() => setPlantaAbierta(null)}
                />
            )}
        </main>
    </div>
  )
}

export default Catalogo