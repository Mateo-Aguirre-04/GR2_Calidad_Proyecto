# Supabase: sesiones y presencia

La aplicación usa PostgreSQL real en el esquema `huertos`. El alcance actual es mantener sesiones y mostrar miembros en línea. No se mantiene historial de actividades y se retiró la pestaña Historia.

## Configuración y ejecución

`backend/.env` contiene `DATABASE_URL`, `DB_SCHEMA=huertos` y `SESSION_SECRET`. Es privado y está ignorado por Git. La cuenta para administrar Supabase es distinta del usuario de Huertos.ec.

En una terminal desde `backend/`:

```powershell
pnpm dev
```

En otra terminal desde `huertos-ecuador/`:

```powershell
pnpm dev
```

`GET /api/health` debe devolver `fuente: "postgres"` y `schema: "huertos"`. Si la conexión falla, el servidor no cambia silenciosamente a datos de demostración. `DATA_MODE=mock` permite una demo explícita.

## Sesiones

- Se conserva la tabla existente `huertos.huertos_sessions`.
- El login verifica el hash bcrypt, regenera la sesión y guarda `usuarioId`, origen y `lastSeen`.
- La cookie es HttpOnly y SameSite=Lax; usa Secure en producción.
- La sesión se conserva en PostgreSQL. El secreto estable permite mantener la cookie entre reinicios.
- Cada petición autenticada actualiza `lastSeen`; el frontend envía un latido cada minuto cuando está visible.
- Un miembro está en línea cuando tiene alguna sesión vigente con actividad en los últimos 15 minutos.
- Logout destruye solo la sesión actual. Si quedan otras sesiones activas del mismo usuario, conserva su presencia.

## Sin historial

El backend ya no inserta ni consulta eventos de actividad. Siembras y cosechas siguen actualizando los cultivos existentes de la aplicación, pero no generan historial.

Se retiró la migración que creaba `actividad_gremio`. `pnpm db:migrate` prepara únicamente el almacén de sesiones; no vuelve a crear el historial.

`node scripts/remove-history.js` retira exclusivamente la tabla `actividad_gremio` añadida por esta implementación. No utiliza CASCADE, por lo que cualquier dependencia externa impediría el borrado. No elimina ni modifica las tablas previas.

## Prueba manual

1. Iniciar sesión con una cuenta real y entrar a su gremio.
2. Abrir Miembros y comprobar que el usuario aparece en línea.
3. Entrar desde otro navegador o ventana privada con una segunda cuenta del mismo gremio.
4. Cerrar sesión en una ventana y comprobar el cambio a desconectado desde la otra tras la actualización.
5. Reiniciar el backend y comprobar que la sesión sigue funcionando.
6. Confirmar que no aparece la pestaña Historia.

No ejecutar el SQL antiguo completo del repositorio sobre la base real: tiene una estructura diferente y sentencias DROP.

## Verificación automatizada

`pnpm test` verifica cookies, presencia, expiración, sesiones simultáneas y logout en modo de prueba.

`node scripts/verify-supabase.js` verifica la integración PostgreSQL en un esquema temporal aislado, que elimina al terminar. No copia usuarios ni modifica los datos de trabajo del equipo. Ya no crea ni prueba un historial de actividades.
