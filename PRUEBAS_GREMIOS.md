# Verificación local de gremios

Fecha: 7 de noviembre de 2026. Rama: `usuarios-activos-historial`, después del merge `a778d7d`.

Entorno: backend Express en puerto 3001, frontend Vite en puerto 5173, datos mock (sin `DATABASE_URL`). No se hizo push ni se modificó `main`.

| Comprobación | Resultado |
| --- | --- |
| Pruebas backend (`node --test`) | 3 aprobadas. Incluyen login fallido, cookies HttpOnly/SameSite, varias sesiones, logout, expiración, siembra y aislamiento del historial por gremio. |
| Compilación frontend, después de las correcciones | Aprobada; advertencia por bundle mayor de 500 kB. |
| ESLint de Juego, Gremio, useGremio y usePresencia | Aprobado. |
| Login visual con `carlos_andrade` / `password123` | Redirige a selección de gremio. |
| Ingreso visual por código `000001` | Redirige al juego y selecciona el gremio Huerto San Francisco. |
| Miembros | Carlos aparece en línea; contador inicial 2/4, incluido el líder simulado del modo mock. |
| Siembra desde el juego | Selección de Menta/Hierbabuena y confirmación con Enter en el huerto. |
| Historia | Aparece «Carlos Andrade — sembró Menta / Hierbabuena — Hoy». |
| Filtro Siembras | Muestra el registro creado. |
| Filtro Cosechas | Muestra cero registros para el historial de esta prueba. |
| Logout desde selección de gremio | Regresa a login. En otra pestaña ya abierta, Carlos cambia a desconectado y el contador pasa de 2/4 a 1/4. |
| `git diff --check` | Aprobado. |

## Correcciones encontradas al probar

- Vite presentó un fallo transitorio al resolver imágenes Leaflet. Reiniciar con `pnpm dev --force` regeneró la caché y permitió cargar la aplicación, sin cambiar las importaciones.
- El selector de plantas cerraba sin permitir completar la siembra. Ahora se puede elegir una posición con clic en el huerto; Enter o Espacio permite sembrar en el centro. Las coordenadas se envían como porcentajes x/y.
- Juego consultaba siempre el perfil y recordatorios del usuario predeterminado. Ahora pasa a esos hooks el ID del usuario que inició sesión.

## Lo que falta verificar

- Escaneo físico de QR con cámara: no se activó la cámara durante esta prueba. El ingreso por código sí se verificó en la interfaz.
- Integración con una instancia real de PostgreSQL/Supabase. Los datos de esta ejecución son temporales y se pierden al reiniciar el backend.
- Persistencia de nuevas acciones del juego en Supabase: esta entrega consulta `Actividades_Usuario` para el historial PostgreSQL; el registro de las nuevas acciones probado aquí se realiza en memoria, en modo mock.
- La expiración de 15 minutos se verificó automáticamente envejeciendo `lastSeen`, sin esperar 15 minutos en el navegador.

Para repetir manualmente: ver `GREMIOS.md`. Para pruebas adicionales desde cero, reiniciar el backend para limpiar las actividades mock de esta sesión.
