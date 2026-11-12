# Arquitectura del Producto

El sistema **Huertos.ec** utiliza una arquitectura Cliente-Servidor dividida en tres partes principales: el frontend web en React, el servidor backend en Node.js con Express y la base de datos en la nube con Supabase.

---

## 1. Partes del Sistema

1. **Frontend (`huertos-ecuador/`):** Aplicación web hecha con **React** y **Vite** que se ejecuta en el navegador del jugador. Contiene las pantallas del juego, el mapa del Ecuador con **Leaflet**, el catálogo de plantas y los paneles del gremio.
2. **Backend (`backend/`):** Servidor hecho con **Node.js** y **Express** que expone las rutas de la API (`/api/*`). Se encarga del inicio de sesión, las reglas para sembrar, regar y cosechar, el cálculo de fases lunares y los permisos de cada rol.
3. **Base de Datos y Servicios Externos:**
   - **Supabase (PostgreSQL y Storage):** Guarda las tablas del esquema `huertos` (usuarios, gremios, huertos, plantas y tareas) y las imágenes de las plantas e íconos.
   - **Open-Meteo API:** Servicio externo que entrega el clima actual según la ubicación del huerto en el mapa.

---

## 2. Diagrama de Arquitectura por Capas

![Diagrama de Arquitectura por Capas - Huertos.ec](diagramas/arquitectura_capas.svg)

Huertos.ec sigue una arquitectura por capas. El jugador usa la **capa de presentación** (React + Vite), que se comunica por HTTP/JSON con la **capa de API** (Node.js + Express), encargada de las rutas, las sesiones y los controladores. La **capa de lógica de negocio y persistencia** aplica las reglas del juego (siembra, riego, cosecha, fases lunares y puntos) y consulta la **capa de datos** en Supabase (PostgreSQL y Storage). Open-Meteo aporta el clima y OpenStreetMap el mapa.

---

## 3. Diagrama de Despliegue

![Diagrama de Despliegue - Arquitectura de Huertos.ec](diagramas/despliegue.svg)

| Componente | Función principal |
| :--- | :--- |
| **Navegador Web (Frontend)** | Muestra las pantallas, el mapa y el huerto interactivo, y se comunica con el backend mediante peticiones HTTP en formato JSON. |
| **Servidor Node.js + Express** | Recibe las peticiones del frontend, valida la sesión del usuario y ejecuta las consultas en la base de datos. |
| **Supabase (PostgreSQL + Storage)** | Almacena toda la información del sistema y sirve las imágenes de las plantas e íconos. |
| **Open-Meteo API** | Provee la temperatura y el estado del clima según la latitud y longitud del gremio. |

---

## 4. Estructura de Carpetas

```text
GR2_Calidad_Proyecto/
├── huertos-ecuador/          # Frontend (React + Vite)
│   ├── public/               # Imágenes de huertos y plantas
│   ├── src/
│   │   ├── components/       # Ventanas modales, tarjetas, parcelas y paneles
│   │   ├── data/             # Datos de parcelas, fases y herramientas
│   │   ├── hooks/            # Hooks para consultar huerto, gremio, clima y tareas
│   │   ├── pages/            # Pantallas principales (Login, Registro, Juego, Gremio, Catálogo)
│   │   └── services/         # Funciones de conexión con el backend
│   └── test/                 # Pruebas del frontend
│
└── backend/                  # Backend (Node.js + Express)
    ├── migrations/           # Archivos SQL de la base de datos
    ├── scripts/              # Scripts para migraciones y carga de imágenes
    ├── src/
    │   ├── config/           # Configuración de base de datos y sesiones
    │   ├── controllers/      # Controladores de usuarios, gremios, huertos y plantas
    │   ├── data/             # Reglas de actividades, calendario lunar y puntajes
    │   └── routes/           # Rutas de la API REST (/api/*)
    └── test/                 # Pruebas del backend
```

---

## 5. Rutas Principales de la API

| Módulo | Método | Ruta | Uso |
| :--- | :---: | :--- | :--- |
| **Autenticación** | `POST` | `/api/auth/registro` | Crea una cuenta nueva con rango Novato y 0 puntos. |
| | `POST` | `/api/auth/login` | Inicia sesión y guarda la cookie del usuario. |
| | `POST` | `/api/auth/presence` | Actualiza el estado en línea del jugador. |
| | `POST` | `/api/auth/logout` | Cierra la sesión actual. |
| **Gremios** | `GET` | `/api/gremios` | Lista los gremios ordenados por puntaje para el ranking. |
| | `GET` | `/api/gremios/:id` | Devuelve los datos del gremio, sus miembros y su huerto. |
| | `POST` | `/api/gremios` | Crea un gremio con su ubicación en el mapa y código de 6 dígitos. |
| | `PATCH` | `/api/gremios/:id/perfil` | Permite a Oficiales y Maestros editar la descripción y anuncios. |
| | `POST` | `/api/gremios/unirse` | Une a un jugador al gremio usando el código de 6 dígitos o QR. |
| **Plantas** | `GET` | `/api/plantas` | Obtiene el catálogo de plantas ecuatorianas y sus cuidados. |
| **Huertos y Tareas** | `GET` | `/api/huertos/:id` | Obtiene las parcelas y las plantas sembradas en el huerto. |
| | `GET` | `/api/recordatorios/huerto/:huertoId/panel` | Obtiene las actividades, recordatorios y estado del clima/luna. |
| | `POST` | `/api/recordatorios/huerto/:huertoId/siembras` | Registra una siembra en una parcela y suma 30 puntos. |
| | `POST` | `/api/recordatorios/huerto/:huertoId/riegos` | Registra el riego de una sección y suma 5 puntos. |
| | `POST` | `/api/recordatorios/huerto/:huertoId/tareas/:tareaId/completar` | Completa una actividad o cosecha y entrega los puntos. |
| **Perfil** | `GET` | `/api/perfil/:id` | Consulta los puntos, el rango y las habilidades del jugador. |
| | `PUT` | `/api/perfil/:id/descripcion` | Guarda la descripción de habilidades en el perfil. |

---

## 6. Seguridad e Integridad de Datos

- **Seguridad:** Las contraseñas se guardan encriptadas con `bcrypt` y la sesión del jugador se maneja en el servidor mediante cookies (`HttpOnly`). El servidor siempre verifica la sesión y el rol del usuario en la base de datos antes de permitir acciones como editar anuncios del gremio.
- **Integridad de datos:** Los puntos ganados por cada jugador y el puntaje total del gremio se actualizan directamente en la base de datos al completar una tarea, evitando que se sumen puntos repetidos o que el ranking quede desactualizado.
