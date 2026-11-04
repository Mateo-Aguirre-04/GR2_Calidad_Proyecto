# Guía de Puesta en Marcha: Backend y Frontend (Huertos.ec)

Este documento explica cómo configurar, ejecutar y probar la API REST del backend (`backend/`) y la aplicación web frontend (`huertos-ecuador/`).

---

## 1. Arquitectura y Funcionamiento

* **Frontend:** React 19 + Vite (ejecutándose en el puerto `5173`).
* **Backend:** Node.js + Express (ejecutándose en el puerto `3001`).
* **Proxy Inverso:** Vite redirige automáticamente todas las peticiones con prefijo `/api/*` hacia `http://localhost:3001`, eliminando cualquier problema de CORS en desarrollo.
* **Base de Datos (Modo Dual):**
  * **Con PostgreSQL:** Se conecta a la base configurada en `.env` ejecutando las consultas contra las tablas de `sistema_agricola_gamificacion.sql`.
  * **Sin PostgreSQL (Modo Resiliente / Semilla):** Si el motor PostgreSQL no está activo, el backend activa automáticamente su almacén local en memoria precargado con los datos iniciales de Quito, Cuenca y Ambato/Tungurahua de `seed_datos_iniciales.sql`. Esto permite probar la interfaz y los flujos inmediatamente sin dependencias externas.

---

## 2. Requisitos Previos

1. **Node.js:** Versión LTS recomendada (v20 o superior).
2. **pnpm:** Gestor de paquetes (`npm install -g pnpm`).
3. *(Opcional)* **PostgreSQL 12+** si se desea persistencia en base de datos física.

---

## 3. Instrucciones para Levantar los Servicios

Para probar el sistema completo se necesitan dos terminales (una para el Backend y otra para el Frontend):

### Terminal 1: Backend API

1. Abre una terminal y navega a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instala las dependencias (solo la primera vez):
   ```bash
   pnpm install
   ```
3. Inicia el servidor del backend:
   ```bash
   # Modo desarrollo (con recarga automática ante cambios):
   pnpm dev

   # O modo producción:
   pnpm start
   ```
   *El servidor quedará escuchando en `http://localhost:3001`.*

---

### Terminal 2: Frontend (React + Vite)

1. Abre una segunda terminal y navega a la carpeta `huertos-ecuador`:
   ```bash
   cd huertos-ecuador
   ```
2. Instala las dependencias (solo la primera vez):
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Inicia el servidor de desarrollo web:
   ```bash
   pnpm dev
   ```
   *La aplicación estará accesible en `http://localhost:5173/`.*

---

## 4. Variables de Entorno del Backend (`backend/.env`)

En `backend/.env` puedes personalizar los parámetros de conexión:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=huertos_db
```

---

## 5. Endpoints de la API REST

| Módulo | Método | Endpoint | Descripción |
|---|:---:|---|---|
| **Salud** | `GET` | `/api/health` | Estado del backend y timestamp. |
| **Autenticación** | `POST` | `/api/auth/login` | Inicia sesión con `usuario` y `contrasena`. |
| | `POST` | `/api/auth/registro` | Registra cuenta con rol `Novato` y 0 puntos. |
| **Gremios** | `GET` | `/api/gremios` | Lista gremios en Tungurahua con conteo de miembros. |
| | `GET` | `/api/gremios/:id` | Detalle de gremio, miembros y huerto. |
| | `POST` | `/api/gremios` | Crea gremio y huerto inicial con coordenadas. |
| | `POST` | `/api/gremios/unirse` | Valida código de 6 dígitos (ej. `000001` para Ficoa). |
| **Plantas** | `GET` | `/api/plantas` | Catálogo de plantas con cuidados y fases de crecimiento. |
| | `GET` | `/api/plantas/:id` | Ficha técnica de una planta. |
| **Huertos** | `GET` | `/api/huertos/:id` | Posición y estado de cultivos del huerto virtual. |
| | `POST` | `/api/huertos/:id/sembrar` | Añade un cultivo al huerto en coordenadas `(x, y)`. |
| | `POST` | `/api/huertos/:id/cosechar` | Cosecha un cultivo maduro. |
| **Perfil** | `GET` | `/api/perfil/:id` | Perfil, rango de gamificación y posición en el gremio. |
| | `PUT` | `/api/perfil/:id/descripcion` | Actualiza la descripción/talento del usuario. |
| **Recordatorios** | `GET` | `/api/recordatorios/:usuarioId` | Tareas pendientes (riego, siembra, cosecha). |
| | `POST` | `/api/recordatorios/:id/completar` | Completa una tarea y suma puntos. |

---

## 6. Pruebas y Enlaces Directos en el Navegador

* **Página principal (Login):** [http://localhost:5173/](http://localhost:5173/)
  * Usuario de prueba: `juanito_perez` | Contraseña: `password123`
* **Juego (Huerto Virtual directo):** [http://localhost:5173/juego](http://localhost:5173/juego)
  * Verifica el clima de Ambato (Tungurahua) consultado en tiempo real a Open-Meteo.
* **Catálogo botánico:** [http://localhost:5173/catalogo-plantas](http://localhost:5173/catalogo-plantas)
* **Crear nuevo gremio con mapa:** [http://localhost:5173/crear-gremio](http://localhost:5173/crear-gremio)
* **Verificación de la API:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
