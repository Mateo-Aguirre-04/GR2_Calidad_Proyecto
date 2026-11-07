# Descripción y anuncios del gremio

Se agregaron dos columnas a `huertos.gremio`: `descripcion` y `anuncios`. Los campos anteriores y sus datos se conservan. No se crearon tablas ni un historial de publicaciones.

## Comportamiento

- Al crear un gremio, el creador proporciona su descripción inicial (hasta 120 caracteres). Los anuncios se crean vacíos; no hay un campo para publicarlos desde el formulario de creación.
- Comunidad carga ambos valores desde Supabase para los miembros del gremio.
- Solo quienes tengan `Oficial` o `Maestro` en `huertos.miembro_gremio.rol` para ese gremio ven el botón de edición. Los otros miembros pueden leer ambos textos.
- La creación del gremio es la excepción para escribir la descripción inicial. `Fundador` no obtiene permiso automático para editar después: se aplica exactamente la restricción solicitada a Oficial y Maestro.
- Guardar envía `PATCH /api/gremios/:id/perfil`. El backend obtiene el usuario de la sesión y vuelve a consultar su membresía. No confía en rangos, IDs o permisos enviados desde el navegador.
- La membresía se bloquea durante la transacción de guardado para que una revocación simultánea de rango no deje una actualización sin autorización.
- El anuncio admite hasta 160 caracteres. Se puede dejar vacío para quitarlo. Cada guardado reemplaza el texto actual, sin conservar publicaciones anteriores.
- Los errores de guardado se muestran sin anunciar un éxito ficticio. Cancelar conserva los valores anteriores.
- Los gremios existentes mantienen vacíos los campos nuevos hasta que un Oficial o Maestro los complete. No se inventaron descripciones para registros anteriores.

## Probar

1. Iniciar sesión con un Oficial del gremio, abrir Comunidad y editar descripción/anuncios.
2. Guardar, recargar y comprobar que ambos valores permanecen.
3. Repetir con un Maestro: también puede guardar.
4. Entrar con un Aprendiz, Miembro o Fundador: ve los textos y no ve el botón de editar.
5. Una petición directa de actualización desde ese usuario debe devolver 403, incluso si envía `rol: "Maestro"` o un ID ajeno en el cuerpo.
6. Crear un gremio con una cuenta sin gremio: la descripción inicial debe aparecer al entrar a Comunidad y los anuncios deben estar vacíos.

Para aplicar las columnas en otra base: `node scripts/migrate-guild-profile.js` desde backend. En la instancia actual ya se aplicaron.

## Verificación realizada

Pruebas locales de permisos, límites, sesiones y rechazo de peticiones sin sesión; ESLint y compilación frontend. `node scripts/verify-guild-profile.js` también comprobó el SQL de guardado contra PostgreSQL usando solo tablas temporales y ROLLBACK, sin cambiar gremios ni miembros reales, incluyendo una revocación de rango entre intentos.

Los cambios están en la rama `oscar-tamayo`; no se ha hecho push ni se modificó main.
