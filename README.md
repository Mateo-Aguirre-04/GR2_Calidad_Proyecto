# Huertos.ec

Juego web para gestionar huertos comunitarios en Ecuador. Los jugadores se agrupan en gremios, siembran plantas en las parcelas de su huerto, siguen sus fases de crecimiento, completan actividades (riego, abono, cosecha, secado) y suman puntos para el ranking.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | React 19, Vite, React Router, Leaflet |
| Backend | Node.js, Express 4, `express-session` |
| Base de datos | PostgreSQL en Supabase (esquema `huertos`) |
| Imágenes de plantas e iconos | Supabase Storage (bucket `huertos-assets`) |

El backend siempre trabaja contra PostgreSQL: si no puede conectarse a la base, no arranca.

## Estructura

```text
GR2_Calidad_Proyecto/
├── README.md
├── backend/
│   ├── .env.example          Variables de entorno de ejemplo
│   ├── database/             SQL: esquema, datos iniciales y plantas
│   │   └── migrations/       Migraciones del checklist de actividades (001–006)
│   ├── scripts/              Ejecutores de migraciones, carga de imágenes a Supabase y utilidades
│   ├── src/
│   │   ├── config/           Conexión a la base, sesiones y presencia
│   │   ├── controllers/      Controladores HTTP
│   │   ├── data/             Reglas de negocio y consultas
│   │   ├── routes/           Rutas de la API
│   │   └── server.js         Punto de entrada
│   ├── storage/plantas/      Imágenes originales de las plantas (se suben a Supabase Storage)
│   └── test/                 Pruebas con node:test
└── huertos-ecuador/          Frontend
    ├── public/huertos/       Fondos de cada tipo de huerto
    ├── src/
    │   ├── assets/iconos/    Iconos del juego
    │   ├── components/       Componentes (uno por carpeta, con su CSS module)
    │   ├── data/             Configuración del mapeo de parcelas, fases e iconos
    │   ├── hooks/            Hooks de datos (huerto, perfil, clima, checklist…)
    │   ├── pages/            Páginas y su CSS en pages/css
    │   └── services/         Llamadas a la API del checklist
    └── test/                 Pruebas con node:test
```

## Requisitos

- Node.js 20 o superior.
- pnpm (`npm install -g pnpm`).
- Acceso a la base PostgreSQL del proyecto (cadena de conexión de Supabase).

## Configuración

Crea `backend/.env` a partir de `backend/.env.example`:

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL / Supabase |
| `PORT` | No | Puerto del backend (por defecto `3001`) |
| `DB_SCHEMA` | No | Esquema de la base (por defecto `huertos`) |
| `SESSION_SECRET` | En producción | Firma de la cookie de sesión |
| `FRONTEND_URL` | En producción | Origen permitido por CORS (por defecto `http://localhost:5173`) |
| `HARVEST_STATE_ID` | No | ID del estado "cosechado" (por defecto `6`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo para los scripts de carga de imágenes | Acceso a Supabase Storage (`SUPABASE_URL` es opcional: se deduce de `DATABASE_URL`) |

`backend/.env` no se sube al repositorio.

## Ejecutar en local

Necesitas dos terminales.

```bash
# Terminal 1: backend en http://localhost:3001
cd backend
pnpm install
pnpm dev
```

```bash
# Terminal 2: frontend en http://localhost:5173
cd huertos-ecuador
pnpm install
pnpm dev
```

Vite redirige `/api/*` al backend, así que en desarrollo no hay problemas de CORS. Para comprobar el backend abre `http://localhost:3001/api/health`.

`pnpm dev:prueba` (en `backend`) arranca el backend sin las restricciones de fechas, hora y fase lunar del checklist, para probar actividades a mano. No funciona con `NODE_ENV=production`.

## Base de datos

### Archivos SQL

| Archivo | Contenido |
|---|---|
| `backend/database/01_esquema.sql` | Modelo completo de referencia. Contiene `DROP`: **no ejecutarlo en la base compartida**. |
| `backend/database/02_datos_iniciales.sql` | Datos de catálogo iniciales |
| `backend/database/03_plantas_ecuador.sql` | Plantas andinas con sus seis fases e imágenes |
| `backend/database/migrations/*.sql` | Migraciones del checklist, en orden numérico |

### Migraciones

Se ejecutan desde `backend`. Los scripts con `--apply` trabajan en una transacción; sin `--apply` solo revisan o simulan.

| Comando | Qué hace |
|---|---|
| `pnpm db:migrate` | Agrega `usuario_general.last_seen` (presencia) si falta |
| `node scripts/migrate-guild-profile.js` | Agrega `descripcion` y `anuncios` a `gremio` |
| `node scripts/checklist-migrations.js [--apply]` | Migraciones 002 y 003 |
| `node scripts/migrate-activities.js [--apply]` | Migración 004: secciones, puntos y ranking |
| `node scripts/migrate-recurring-fertilizer.js [--apply]` | Migración 005: abono recurrente |
| `node scripts/migrate-medicinal-catalog.js [--apply]` | Migración 006: catálogo medicinal |

La migración 001 (`checklist_baseline`) ya está aplicada en la base compartida: no volver a ejecutarla allí. En la base compartida ya están aplicadas de la 001 a la 006.

### Imágenes en Supabase Storage

| Comando | Qué sube |
|---|---|
| `node scripts/upload-storage.js` | `backend/storage/plantas` → `huertos-assets/plantas` |
| `node scripts/upload-iconos.js` | `huertos-ecuador/src/assets/iconos` → `huertos-assets/iconos` |

## Pruebas

```bash
cd backend && pnpm test
cd huertos-ecuador && pnpm test
```

Las pruebas de `backend/test/checklist.postgres.test.js` se omiten salvo que `CHECKLIST_TEST_DATABASE_URL` apunte a una base local `gr2_checklist_test`. `node scripts/run-checklist-postgres.js` crea esa base temporal en el puerto 55439, ejecuta esas pruebas y la detiene; requiere PostgreSQL 18 instalado (la ruta de los binarios se cambia con `POSTGRES_BIN`). No usa `DATABASE_URL` ni escribe en Supabase.

## Funcionamiento

### Huerto y parcelas

- Cada tipo de huerto (surcos, camadas, botellas, macetas…) tiene un fondo con sus parcelas dibujadas (`huertos-ecuador/src/data/parcelasHuerto.js`) y un área por parcela (`backend/src/data/parcelas.js`; los dos archivos deben coincidir).
- El área total del gremio se reparte en parcelas. Cuando hay más parcelas de las que caben en un fondo, se habilitan zonas adicionales. Ejemplo con surcos (100 m² por parcela, 6 por fondo): 100 m² habilitan 1 parcela; 800 m² habilitan la zona 1 completa y 2 parcelas en la zona 2.
- Una botella admite una planta; en el resto de tipos la cantidad depende del área de la parcela.
- Las plantas avanzan de fase según los días de `ciclo_cultivo`. En el terreno llegan hasta la fase 4; la fase 5 aparece en la animación de cosecha. Solo se puede cosechar en la fase 4.

### Actividades, puntos y ranking

El checklist (`/api/recordatorios/huerto/:huertoId/...`) genera las tareas de cada cultivo (siembra, riego, abono, señalética, cosecha, secado y rituales) según la fecha local del huerto, la fase lunar y el clima de Open-Meteo. Al completar una tarea se otorgan puntos mediante triggers de la base y se actualiza el ranking de gremios.

### Presencia de los miembros

Cada usuario guarda su última actividad en `usuario_general.last_seen`. Los intervalos se configuran en `backend/src/config/presence.js`:

- `PRESENCE_UPDATE_MINUTES`: intervalo mínimo entre escrituras.
- `PRESENCE_ONLINE_MINUTES`: tiempo durante el que un usuario se muestra en línea. Debe ser mayor que el anterior.

Después de cambiarlos, reinicia el backend y recarga el navegador.

## API

| Ruta | Métodos |
|---|---|
| `/api/health` | `GET` |
| `/api/auth` | `POST /login`, `POST /registro`, `POST /logout`, `POST /presence`, `GET /presence-config` |
| `/api/gremios` | `GET /`, `GET /configuracion`, `GET /:id`, `PATCH /:id/perfil`, `POST /`, `POST /unirse`, `POST /:id/invitacion` |
| `/api/huertos` | `GET /:id`, `POST /:id/sembrar`, `POST /:id/cosechar` |
| `/api/plantas` | `GET /`, `GET /:id` |
| `/api/perfil` | `GET /:id?`, `PUT /:id/descripcion` |
| `/api/recordatorios/huerto/:huertoId` | `GET /`, `GET /panel`, `POST /sincronizar`, `POST /zonas`, `POST /ciclos`, `PUT /cultivos/configuracion`, `POST /cultivos/finalizar`, `POST /programar`, `POST /siembras`, `POST /secados`, `POST /riegos`, `POST /tareas/:tareaId/completar`, `POST /tareas/:tareaId/inscribirse` |
