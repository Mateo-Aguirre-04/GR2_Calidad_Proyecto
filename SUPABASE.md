# Supabase: presencia compartida con consultas limitadas

Las sesiones de login siguen en memoria de cada backend. La presencia entre laptops se comparte mediante una única columna nueva: `huertos.usuario_general.last_seen` de tipo `timestamptz`. No hay tabla nueva ni historial.

## Parámetros: un único archivo

Editar `backend/src/config/presence.js`:

```javascript
export const PRESENCE_UPDATE_MINUTES = 60
export const PRESENCE_ONLINE_MINUTES = 75
```

- UPDATE controla el intervalo mínimo entre escrituras de presencia por usuario y la actualización automática de la lista de miembros.
- ONLINE controla cuánto tiempo se considera en línea a un usuario desde su última escritura. Debe ser mayor que UPDATE.
- Para una versión final con actualizaciones cada minuto y tolerancia de 15 minutos, usar UPDATE=1 y ONLINE=15.
- Después de cambiar los valores, reiniciar cada backend y recargar cada navegador. El frontend consulta esta configuración al backend, sin consultar Supabase; no hace falta cambiar otro archivo para estos intervalos.

## Funcionamiento de la prueba

1. Al iniciar sesión con una cuenta real, se escribe la primera fecha si no existe o si venció su intervalo. Un login repetido dentro de la hora reutiliza la fecha existente.
2. El frontend solicita una actualización al vencer el plazo y solo mientras está visible. El backend conserva el vencimiento en su sesión para no consultar por cada acción.
3. La escritura SQL incluye una condición temporal, que impide escribir de nuevo antes del plazo aunque dos backends intenten actualizar el mismo usuario.
4. La lista de miembros lee last_seen junto con los miembros, sin otra consulta de presencia. Su actualización automática también es cada 60 minutos durante estas pruebas.
5. Logout destruye la sesión local, pero no vuelve a escribir en Supabase: el usuario puede seguir apareciendo en línea hasta 75 minutos después de su última actualización. Esta presencia es aproximada, no una conexión instantánea.

El límite se aplica a la presencia. Login, plantas, perfiles, cultivos y navegación siguen haciendo sus consultas normales. Recargar manualmente el navegador o volver a abrir Miembros también realiza una lectura; no es una escritura de presencia adicional dentro del intervalo.

## Probar con dos laptops

Cada laptop puede ejecutar su propio backend y frontend, apuntando ambos al mismo proyecto Supabase y al esquema huertos. Iniciar sesión otra vez con dos cuentas del mismo gremio para registrar sus primeras fechas. Recargar Miembros manualmente para comprobar el resultado sin esperar la hora completa.

La conexión PostgreSQL se configura en `backend/.env`; no se comparte ese archivo por Git. Iniciar `pnpm dev` en backend y en huertos-ecuador. Las sesiones se pierden al reiniciar el backend, pero la fecha compartida permanece hasta que se actualice o caduque su consideración de en línea.

`pnpm db:migrate` agrega únicamente last_seen si falta. La columna ya fue aplicada en esta instancia.

## Retirar la función

Primero retirar del código el uso de last_seen y desplegar ese cambio en ambas laptops. Después se puede eliminar únicamente esa columna. No hace falta borrar usuarios ni otras columnas. El borrado no se ejecuta automáticamente.

## Validación

Las pruebas locales verifican que se produce una sola escritura por intervalo, que repetir peticiones no consulta la base y que una fecha reciente leída por otro backend evita una escritura duplicada. También se mantienen las pruebas de sesiones y expiración. Compilación y ESLint del frontend aprobados.
