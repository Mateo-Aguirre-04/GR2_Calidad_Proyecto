> Esta guía describe la demostración inicial. Para la integración actual con la base real, consultar [SUPABASE.md](SUPABASE.md).

# Gremios: presencia e historial

## Ejecutar en modo local

Las dependencias ya están instaladas en este equipo. En otra copia ejecutar `pnpm install --frozen-lockfile` en cada carpeta antes de iniciar.

Terminal 1, desde `backend/`:

```powershell
pnpm start
```

Terminal 2, desde `huertos-ecuador/`:

```powershell
pnpm dev
```

Abrir la dirección que indique Vite, normalmente `http://localhost:5173`.

Sin `DATABASE_URL`, el backend funciona con datos mock. Si existe una URL pero la conexión inicial falla, también inicia en modo mock y lo indica en consola. La pantalla del gremio identifica este modo. Los datos locales y sus sesiones se pierden al reiniciar el backend.

## Probar la demo

1. Iniciar sesión como `carlos_andrade`, contraseña `password123`.
2. Unirse con el código `000001` y abrir **Gremio > Miembros**. Carlos debe aparecer en línea.
3. Abrir otra ventana privada y entrar como `juanito_perez`, con la misma contraseña. Ambos deben aparecer en línea. La lista se actualiza cada 30 segundos.
4. Sembrar desde el juego. En **Gremio > Historia** debe aparecer la acción con el usuario de la sesión y la fecha. También se registran cosechas y recordatorios completados por su propietario en modo mock. Una cosecha repetida no duplica el historial.
5. Volver a `/seleccion-gremio` y pulsar **Cerrar Sesión**. En la otra ventana, el usuario debe aparecer desconectado tras la próxima actualización.
6. Cerrar todas las ventanas del usuario sin cerrar sesión: al pasar 15 minutos sin peticiones, se considera desconectado. Cerrar solo una de varias sesiones mantiene su presencia mientras otra siga activa.

La historia empieza vacía: no se muestran las actividades ficticias que antes estaban escritas en el hook. Algunos líderes tienen presencia simulada al iniciar el modo mock, como pide el plan; esa presencia también caduca.

## PostgreSQL / Supabase

Configurar `backend/.env` usando `.env.example`:

```dotenv
PORT=3001
DATABASE_URL=postgresql://...
SESSION_SECRET=un-secreto-largo-aleatorio-y-privado
FRONTEND_ORIGIN=http://localhost:5173
```

Reiniciar el backend después de cambiar la configuración. El backend comprueba la conexión antes de aceptar peticiones y crea `huertos_sessions` y su índice de expiración. El usuario de conexión necesita permisos para crearlos; si no dispone de ellos, un administrador debe preparar la tabla:

```sql
CREATE TABLE IF NOT EXISTS huertos_sessions (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS huertos_sessions_expire_idx
  ON huertos_sessions (expire);
```

Con PostgreSQL conectado:

- Los miembros salen de `Miembro_Gremio`, `Usuario` y `Usuario_General`.
- El estado se calcula a partir de las sesiones vigentes en `huertos_sessions`, tomando el `lastSeen` más reciente por usuario. No hace falta agregar columnas a `Usuario`.
- Historia consulta `Actividades_Usuario` completadas, con su catálogo en `Actividades`. Solo incluye miembros del gremio, actividades posteriores a su ingreso y huertos del mismo gremio; admite actividades sin huerto. Ordena por fecha descendente y devuelve hasta 100 registros.
- Se admiten las variantes de nombres de columnas encontradas en el repositorio (`nombre`/`nombres`, `apellido`/`apellidos`, y nombre de usuario en la tabla general o en la identidad). El login necesita una contraseña con hash bcrypt en `contrasenia_hash` o `contraseña`.
- Los fallos de consulta se muestran como errores y no se sustituyen con identidades mock mientras la conexión inicial sea PostgreSQL.

El SQL base, los seeds y los controladores existentes tienen discrepancias de esquema. Por ejemplo, el SQL base declara el tipo `PASSWORD` y contiene comentarios sobre columnas ausentes. Esta entrega no reconstruye toda la base ni modifica una instancia remota. Hay que verificar el esquema de la instancia real y disponer de usuarios con hash bcrypt y actividades completadas para la prueba final.

La lectura del historial PostgreSQL usa los registros existentes de `Actividades_Usuario`. Las acciones del juego ya tenían persistencia parcial; este cambio registra sus acciones en el historial mock, pero no reescribe la persistencia de cultivos ni añade registros de actividad PostgreSQL a esos controladores.

En producción usar HTTPS, un `SESSION_SECRET` estable y `NODE_ENV=production`. La cookie es HttpOnly, SameSite=Lax y Secure en producción. La configuración actual espera frontend y API en el mismo sitio (Vite ya tiene proxy `/api`).

## API

| Ruta | Uso |
| --- | --- |
| `POST /api/auth/login` | Verifica credenciales, regenera la sesión y guarda `usuarioId`, origen y `lastSeen`. |
| `POST /api/auth/presence` | Actualiza la presencia de una sesión autenticada. Devuelve 401 sin sesión. |
| `POST /api/auth/logout` | Destruye esa sesión y elimina su cookie. |
| `GET /api/gremios/:id` | Devuelve miembros, `enLinea`, `lastSeen`, actividades y `fuente`. No devuelve contraseñas. |

Cada petición autenticada actualiza `lastSeen`. El frontend envía además un latido cada minuto cuando la pestaña está visible. La cookie dura 24 horas; la ventana de presencia de 15 minutos es independiente.

## Verificación realizada

- `backend`: `pnpm test` — 3 pruebas aprobadas, incluida una integración HTTP con cookies, login fallido, dos sesiones, logout, frontera de 15 minutos, actividad de siembra y separación por gremio.
- `huertos-ecuador`: `pnpm build` — aprobado. Vite advierte del tamaño del bundle.
- ESLint sobre los archivos frontend modificados — aprobado.
- `git diff --check` — aprobado.

Pendiente de verificación externa: ejecutar contra una instancia PostgreSQL/Supabase real. En esta copia no había un archivo `.env` con conexión configurada. Las pruebas HTTP ejecutadas usan el modo mock.

Referencias de implementación: [express-session](https://expressjs.com/en/resources/middleware/session/) y [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple).
