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
| **Gremios** | `GET` | `/api/gremios` | Lista gremios con conteo de miembros. |
| | `GET` | `/api/gremios/:id` | Detalle de gremio, miembros y huerto. |
| | `POST` | `/api/gremios` | Crea gremio y huerto inicial con coordenadas. |
| | `POST` | `/api/gremios/:id/invitaciones` | Genera código aleatorio de 6 dígitos (24h de caducidad) y su QR. |
| | `POST` | `/api/gremios/unirse` | Valida código o invitación temporal y vincula al usuario (`usuarioId`). |
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
* **Vista y Gestión del Gremio (Generar Invitación y QR):** [http://localhost:5173/gremio](http://localhost:5173/gremio)
* **Unirse a un Gremio (Ingresar Código o Escanear QR):** [http://localhost:5173/seleccion-gremio](http://localhost:5173/seleccion-gremio)
* **Verificación de la API:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 7. Sistema de Invitaciones a Gremios (Códigos Temporales y Códigos QR)

Se ha integrado un mecanismo seguro y dinámico para invitar a nuevos miembros a un gremio mediante códigos aleatorios de 6 dígitos y códigos QR generados al instante.

### 7.1. Flujo de Funcionamiento

1. **Generación:**
   * Un miembro activo dentro de `/gremio` pulsa el botón **«✉️ Invitar»**.
   * El cliente realiza una petición `POST /api/gremios/:id/invitaciones`.
   * El backend genera un código criptográficamente seguro mediante `crypto.randomInt(100000, 1000000)` con vigencia de 24 horas (`expira_en = NOW() + 24h`).
   * Se almacena en la tabla `invitacion_gremio` (o en `mockData.invitaciones` en modo resiliente).
   * El frontend muestra el código en tipografía legible junto con su código QR generado en formato SVG mediante `qrcode.react`.
2. **Unión del nuevo miembro:**
   * El nuevo usuario accede a la pantalla de selección de gremio y abre **«Unirme a un Gremio»** (`ModalUnirse`).
   * Puede **escribir el código de 6 dígitos** o **apuntar con su cámara al código QR** (procesado con `@yudiel/react-qr-scanner`).
   * El cliente envía `POST /api/gremios/unirse` con `{ codigo, usuarioId }`.
   * El backend valida que el código exista y que `expira_en > NOW()`.
   * Al ser válido:
     * Incrementa el contador de `usos` en `invitacion_gremio`.
     * Inserta la relación en la tabla `miembro_gremio (id_usuario, id_gremio, rol)`.
     * Retorna la información completa del gremio.
   * El frontend sincroniza el gremio activo en `localStorage` y redirige a la experiencia de juego.

### 7.2. Esquema de Base de Datos (PostgreSQL / Supabase)

```sql
CREATE TABLE IF NOT EXISTS invitacion_gremio (
    codigo      VARCHAR(6) PRIMARY KEY,
    id_gremio   BIGINT NOT NULL REFERENCES gremio (id_gremio) ON DELETE CASCADE,
    creado_por  BIGINT,
    expira_en   TIMESTAMPTZ NOT NULL,
    usos        INTEGER NOT NULL DEFAULT 0
);
```

### 7.3. Especificación de Endpoints

#### `POST /api/gremios/:id/invitaciones`
* **Parámetros de ruta:** `id` (ID del gremio).
* **Body:**
  ```json
  {
    "creadoPor": 2
  }
  ```
* **Respuesta exitosa (`201 Created`):**
  ```json
  {
    "mensaje": "Invitación creada exitosamente",
    "invitacion": {
      "codigo": "853048",
      "idGremio": "1",
      "expiraEn": "2026-11-08T17:36:41.114Z"
    }
  }
  ```

#### `POST /api/gremios/unirse`
* **Body:**
  ```json
  {
    "codigo": "853048",
    "usuarioId": 2
  }
  ```
* **Respuesta exitosa (`200 OK`):**
  ```json
  {
    "mensaje": "Te has unido exitosamente al gremio: Gremio Huerto San Francisco",
    "gremio": {
      "id": 1,
      "nombre": "Gremio Huerto San Francisco",
      "areaTotal": 450.0,
      "puntos": 450,
      "direccion": "Tungurahua (Lat: -0.1807, Lng: -78.4678)"
    }
  }
  ```
* **Respuestas de error:**
  * `400 Bad Request`: `{ "error": "El código de invitación ha expirado." }`
  * `404 Not Found`: `{ "error": "No se encontró ningún gremio con ese código o invitación." }`
