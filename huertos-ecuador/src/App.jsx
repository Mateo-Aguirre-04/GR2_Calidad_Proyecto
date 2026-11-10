import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'
import SeleccionGremio from './pages/SeleccionGremio'
import CrearGremio from "./pages/CrearGremio"
import Catalogo from './pages/Catalogo'
import Juego from './pages/Juego'
import Gremio from './pages/Gremio'
import Foro from './pages/Foro'
import { usePresencia } from './hooks/usePresencia'

function App() {
  usePresencia()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/seleccion-gremio" element={<SeleccionGremio />} />
        <Route path="/crear-gremio" element={<CrearGremio />} />
        <Route path="/catalogo-plantas" element={<Catalogo />} />
        <Route path="/juego" element={<Juego />} />
        <Route path="/gremio" element={<Gremio />} />
        <Route path="/foro" element={<Foro />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App