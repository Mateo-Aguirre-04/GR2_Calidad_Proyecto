import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'
import SeleccionGremio from './pages/SeleccionGremio'
import CrearGremio from "./pages/CrearGremio"
import Catalogo from './pages/Catalago'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/seleccion-gremio" element={<SeleccionGremio />} />
        <Route path="/crear-gremio" element={<CrearGremio />} />
        <Route path="/catalogo-plantas" element={<Catalogo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App