# Listado de Herramientas y Tecnologías de Desarrollo

**Estudiantes:** Aguirre Mateo, Camino Emilio, Jibaja Velky, Mosquera Karen, Oviedo Jorge, Tamayo Oscar  
**Fecha:** 2-10-2026

A continuación se describen las herramientas, lenguajes y tecnologías utilizadas durante el desarrollo del proyecto **Huertos.ec** y el motivo por el cual se empleó cada una.

---

## 1. Desarrollo Frontend (Interfaz de Usuario)

Herramientas utilizadas para construir las pantallas, el diseño visual y la interacción del jugador dentro de la plataforma:

- **HTML5:** Se utilizó para definir la estructura base de la aplicación web y organizar el contenido de las páginas, formularios y ventanas del sistema.
- **CSS3 (CSS Modules):** Se utilizó para dar estilo a todas las pantallas, botones, tarjetas y diseño del huerto, manteniendo los estilos ordenados por cada componente sin que se mezclen entre sí.
- **JavaScript (ES6+):** Es el lenguaje de programación principal del proyecto, empleado para programar toda la lógica de las pantallas, validaciones de formularios, cálculo de fases lunares, consulta del clima e interacción con el huerto.
- **React:** Biblioteca principal de interfaz de usuario con la que se construyeron los componentes reutilizables del sistema (como el huerto interactivo, las parcelas, el catálogo de plantas, los modales y el panel del gremio) y el manejo de estados con hooks.
- **Vue:** Empleado durante el proceso de desarrollo y estructuración de vistas e interfaces reactivas para apoyar la organización modular de componentes en el frontend.
- **Vite:** Herramienta de construcción y servidor de desarrollo rápido para levantar el proyecto en local y compilar la versión final del frontend.
- **React Router:** Se utilizó para manejar la navegación entre las distintas pantallas (inicio de sesión, registro, selección de gremio, creación de gremio, catálogo de plantas, juego y gremio) sin recargar el navegador.
- **Leaflet y React-Leaflet:** Bibliotecas de mapas interactivos empleadas para mostrar el mapa del Ecuador y permitir a los jugadores seleccionar y ver la ubicación geográfica real de cada gremio y huerto.

---

## 2. Desarrollo Backend y Base de Datos

Tecnologías encargadas de procesar las peticiones del sistema, manejar las sesiones de los usuarios y guardar la información del proyecto:

- **Node.js y Express:** Se utilizaron para construir el servidor y las rutas de la API REST que conectan el frontend con la base de datos, gestionando el inicio de sesión, los gremios, las parcelas del huerto, los recordatorios y los puntos.
- **Supabase (PostgreSQL):** Plataforma utilizada para el almacenamiento en la nube del proyecto. Internamente maneja una base de datos relacional en PostgreSQL donde se guardan los usuarios, gremios, huertos, catálogo de plantas, actividades, sesiones y puntajes, además de almacenar los íconos e imágenes de las plantas.
- **pnpm:** Gestor de paquetes utilizado tanto en el frontend como en el backend para instalar las librerías de forma rápida y asegurar que todo el equipo trabaje con las mismas versiones.

---

## 3. Entorno de Desarrollo y Control de Versiones

Programas utilizados por el equipo en el día a día para escribir, organizar y compartir el código:

- **Visual Studio Code (VS Code):** Editor de código principal utilizado por todos los integrantes del grupo para escribir el código del frontend, del backend y las consultas SQL, así como para ejecutar las pruebas en la terminal integrada.
- **Git y GitHub:** Se utilizaron para el control de versiones del código fuente, permitiendo trabajar en ramas separadas por cada integrante, revisar cambios y unir el trabajo del equipo en un solo repositorio compartido.
- **ESLint:** Herramienta de revisión de código utilizada para detectar errores de sintaxis y mantener un estilo de programación limpio y uniforme en JavaScript.

---

## 4. Generación de Imágenes y Recursos Visuales

Herramientas utilizadas para crear el apartado gráfico del juego:

- **Banana Pro:** Se utilizó para generar imágenes e ilustraciones gráficas con un estilo visual consistente para los escenarios y elementos del juego.
- **ChatGPT (Generación de Imágenes):** Se utilizó junto a Banana Pro para crear y ajustar los íconos, fondos de los tipos de huerto, estados del clima, fases de la luna y dibujos de las plantas en sus distintas etapas de crecimiento.

---

## 5. Asistentes de Inteligencia Artificial para Mejora de Código

Herramientas de apoyo utilizadas durante la programación y depuración del sistema:

- **Claude:** Se utilizó como asistente para revisar lógica de programación, proponer mejoras en la estructura de componentes y agilizar ajustes en el código.
- **Antigravity:** Se utilizó para realizar ajustes técnicos en el código, verificar el funcionamiento de las rutas del servidor y apoyar en la elaboración y validación de las pruebas y documentación del proyecto.
