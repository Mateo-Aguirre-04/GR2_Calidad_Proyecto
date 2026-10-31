import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'
import SeleccionGremio from './pages/SeleccionGremio'
import CrearGremio from "./pages/CrearGremio"
import Catalogo from './pages/Catalago'
import Juego from './pages/Juego'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/seleccion-gremio" element={<SeleccionGremio />} />
        <Route path="/crear-gremio" element={<CrearGremio />} />
        <Route path="/catalogo-plantas" element={<Catalogo />} />
        <Route path="/juego" element={<Juego />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App