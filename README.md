Aquí tienes el contenido en Markdown, listo para guardarlo como `GUIA-INSTALACION.md` y compartirlo con tu equipo. Incluye el comando para instalar el router y una estructura mínima para conectar las páginas sin duplicar el encabezado.

````markdown
# Guía de instalación: React, Vite, pnpm y React Router

Esta guía explica cómo preparar el entorno de desarrollo de **Huertos.ec** y configurar las rutas para las páginas de inicio de sesión y registro.

## 1. ¿Qué herramientas usaremos?

- **React:** biblioteca de JavaScript para construir la interfaz con componentes reutilizables.
- **Vite:** herramienta que crea el proyecto y ejecuta el servidor de desarrollo.
- **pnpm:** gestor de paquetes que instala las dependencias. El archivo `pnpm-lock.yaml` ayuda a que todas las personas del equipo instalen versiones compatibles.
- **React Router:** biblioteca para navegar entre páginas sin recargar toda la aplicación.

## 2. Requisitos

Instala una versión LTS de [Node.js](https://nodejs.org/). Node incluye npm, que usaremos para instalar pnpm.

Comprueba la instalación desde una terminal:

```bash
node --version
npm --version
```

Instala pnpm:

```bash
npm install --global pnpm
```

Verifica que esté disponible:

```bash
pnpm --version
```

> Si tu equipo ya tiene pnpm instalado, no hace falta instalarlo otra vez.

## 3. Crear el proyecto React con Vite

Si todavía no existe el proyecto en tu equipo, ejecuta:

```bash
pnpm create vite huertos-ecuador --template react
cd huertos-ecuador
pnpm install
pnpm dev
```

El asistente puede preguntar qué herramientas adicionales deseas configurar. Para esta guía, selecciona **ESLint** si aparece esa opción. Vite mostrará una dirección local, habitualmente `http://localhost:5173/`; ábrela en el navegador.

> Si el repositorio de Huertos.ec ya está creado, no vuelvas a crear el proyecto. Abre la carpeta existente y ejecuta `pnpm install` desde ella.

## 4. Instalar React Router

Desde la carpeta raíz del proyecto, ejecuta:

```bash
pnpm add react-router-dom
```

React Router permitirá mostrar una página diferente según la dirección visitada, por ejemplo `/` para iniciar sesión y `/registro` para crear una cuenta.

## 5. Organización recomendada

Dentro de `src/`, organiza los componentes así:

```text
src/
├── components/
│   └── Header.jsx
├── pages/
│   ├── Login.jsx
│   └── Registro.jsx
├── App.jsx
├── App.css
├── index.css
└── main.jsx
```

- `main.jsx` inicia React y carga el componente principal.
- `App.jsx` declara las rutas de la aplicación.
- `pages/` contiene una pantalla por página.
- `components/` guarda piezas reutilizables, como el encabezado.
- `App.css` e `index.css` contienen los estilos.

## 6. Declarar las rutas

En `src/App.jsx`, importa el router y las páginas:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

`BrowserRouter` habilita la navegación. Cada `Route` relaciona una dirección con el componente que debe mostrarse.

No incluyas `<Header />` aquí si cada página necesita mostrar un texto o un enlace diferente en su encabezado.

## 7. Comprobar el punto de entrada

En `src/main.jsx`, React debe importar y renderizar `App`. La plantilla de Vite normalmente ya tiene esta configuración:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`index.css` se importa aquí una sola vez para aplicar estilos globales.

## 8. Usar el mismo encabezado en las dos páginas

El componente compartido va en `src/components/Header.jsx`:

```jsx
import { Link } from 'react-router-dom'

function Header({ pregunta, textoEnlace, destino }) {
  return (
    <header className="barra-superior">
      <Link className="marca" to="/" aria-label="Huertos.ec, inicio">
        <span className="icono-planta" aria-hidden="true">🌱</span>
        <span>Huertos Ec.</span>
      </Link>

      <nav aria-label="Navegación de cuenta">
        <span>{pregunta}</span>
        <Link className="boton-pixel" to={destino}>
          {textoEnlace}
        </Link>
      </nav>
    </header>
  )
}

export default Header
```

En `src/pages/Login.jsx`, importa el encabezado y úsalo dentro de la página:

```jsx
import Header from '../components/Header'

function Login() {
  return (
    <div className="pagina">
      <Header
        pregunta="¿No tienes una cuenta?"
        textoEnlace="Registrarse"
        destino="/registro"
      />

      <main>
        {/* Aquí va el contenido del inicio de sesión */}
      </main>
    </div>
  )
}

export default Login
```

En `src/pages/Registro.jsx`, usa el mismo componente, cambiando los textos y el destino:

```jsx
import Header from '../components/Header'

function Registro() {
  return (
    <div className="pagina">
      <Header
        pregunta="¿Ya tienes una cuenta?"
        textoEnlace="Iniciar sesión"
        destino="/"
      />

      <main>
        {/* Aquí va el contenido de creación de cuenta */}
      </main>
    </div>
  )
}

export default Registro
```

El encabezado se escribe una sola vez y recibe sus textos como propiedades. `Link` realiza la navegación interna; se puede estilizar con la clase `boton-pixel` como cualquier enlace.

## 9. Ejecutar y comprobar el proyecto

Inicia el servidor de desarrollo:

```bash
pnpm dev
```

Comprueba estas direcciones en el navegador:

- `http://localhost:5173/` debe mostrar el inicio de sesión.
- `http://localhost:5173/registro` debe mostrar la creación de cuenta.

Para generar una compilación de producción:

```bash
pnpm build
```

## 10. Sincronizar el entorno del equipo

Incluye en el repositorio `package.json` y `pnpm-lock.yaml`. Cada integrante debe instalar las dependencias desde la carpeta del proyecto:

```bash
pnpm install --frozen-lockfile
```

No se debe borrar ni modificar el archivo de bloqueo para resolver una instalación rutinaria; si cambian las dependencias, se actualiza con pnpm y se comparte el nuevo `pnpm-lock.yaml`.

## Importante

Esta configuración solo crea la navegación y las interfaces. **No implementa autenticación, no verifica credenciales y no guarda usuarios.** El inicio de sesión y el registro reales requerirán conectarse a una API backend y validar los datos de manera segura.
````