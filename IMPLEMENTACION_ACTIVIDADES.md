# Entrega: actividades, recordatorios, puntos y ranking

Implementación y verificación: 8 de noviembre de 2026.

## Comportamiento entregado

- Cada parcela dibujada, identificada por zona y parcela, es una sección del checklist. Se reutiliza la distribución real de área y capacidad del huerto.
- Regar permite seleccionar una sección y registrar una tarea individual por **5 puntos totales**, independientemente de la cantidad de plantas. También permite programar una tarea pendiente y completarla por su ID.
- Una solicitud reenviada conserva su clave, contenido, registro y premio. Repetir la finalización de una tarea devuelve su comprobante original. Una nueva actividad explícita puede acumular otra recompensa; no se introdujo frecuencia automática ni límite diario.
- Los recordatorios identifican la sección y usan las mismas disponibilidades que la finalización. No se generan avisos diarios de riego sin una tarea programada.
- La cosecha consulta todos los riegos completados de la sección en la fecha local de hace dos días. Un riego posterior no invalida ese antecedente. Los riegos anteriores por cultivo se vinculan a la sección conocida durante la sincronización, conservando sus puntos e historial.
- La preparación de una sección vacía se inicia explícitamente. Cada nuevo ciclo exige maleza y preparación propias. Un cultivo activo o conservado impide iniciar otro ciclo en esa sección.
- El flujo conecta preparación, siembra en parcela y cantidad real, señalética, abono, limpieza, ritual de cosecha, cosecha, lotes y secado. Las confirmaciones físicas y la decisión de conservar el cultivo las marca el miembro.
- La finalización vuelve a comprobar condiciones en el backend. Las rutas antiguas de siembra y cosecha también pasan por el workflow.
- El perfil actualiza el saldo después de las acciones. La pestaña **Gremio → Ranking de gremios** consulta los puntajes reales, ordenados de mayor a menor y con desempate por ID.

## Migración y Supabase

**`backend/migrations/20261108_004_secciones_puntos_ranking.sql` está aplicada y verificada en Supabase.**

Se agregaron `zona_mapa` y `parcela_mapa` a `zonas_huerto`, e `id_zona` con su relación a `tareas_huerto`. Se sustituyó únicamente la restricción que obligaba a asociar el riego a un cultivo, conservando las filas históricas.

La migración preservó los puntos individuales y las recompensas ya registradas. Inicializó `gremio.puntos_gremio` desde los saldos de los miembros actuales. La inspección previa encontró un gremio con diferencia; la verificación posterior encontró **cero diferencias**.

| Trigger | Tabla y evento | Función |
|---|---|---|
| `validar_recompensa_tarea` | `participantes_tarea`, BEFORE INSERT / UPDATE / DELETE | Valida tarea, premio y miembro; impide alterar o eliminar una recompensa acreditada. |
| `acreditar_recompensa_tarea` | `participantes_tarea`, AFTER INSERT / UPDATE OF `puntos_otorgados` | Incrementa el saldo una sola vez al registrar una recompensa válida. |
| `sincronizar_puntos_gremio` | `usuario_general`, AFTER UPDATE OF `puntos` | Traslada el cambio de saldo a los gremios actuales del miembro. |
| `bloquear_saldo_membresia` | `miembro_gremio`, BEFORE INSERT / UPDATE / DELETE | Serializa la pertenencia contra cambios del saldo del miembro. |
| `sincronizar_membresia_gremio` | `miembro_gremio`, AFTER INSERT / UPDATE / DELETE | Agrega o resta los saldos al cambiar la membresía. |

El backend registra la recompensa en `participantes_tarea`; el trigger es la única vía que incrementa el saldo por esa recompensa. Se retiró el incremento duplicado en JavaScript. Las tareas, las recompensas y los totales se confirman en la misma transacción. Los bloqueos de usuarios y gremios se toman en orden.

Comandos de mantenimiento, desde `backend`:

```powershell
node scripts/migrate-activities.js         # Revisión de solo lectura
node scripts/migrate-activities.js --apply # No repite 004 si ya está instalada
```

No ejecutar el archivo SQL raíz completo ni volver a aplicar 001–003 en la base compartida.

## Verificación realizada

| Comprobación | Resultado |
|---|---|
| `node --test` en backend | 33 pruebas aprobadas; las 4 de PostgreSQL se ejecutaron por separado. |
| `node scripts/run-checklist-postgres.js` | 4 pruebas de integración aprobadas contra PostgreSQL temporal. |
| `node --test` en frontend | 2 pruebas aprobadas. |
| ESLint en todos los módulos frontend modificados | Sin errores. |
| `pnpm exec vite build` | Compilación correcta; permanece la advertencia de bundle mayor a 500 kB. |
| `git diff --check` | Sin errores de espacios. |
| `node scripts/migrate-activities.js` en Supabase | Los cinco triggers presentes; cero diferencias de totales. |
| `node scripts/verify-checklist.js` en Supabase | RLS, lectura autorizada, rechazo ajeno con 403 y panel real con clima y America/Guayaquil correctos. |

Las pruebas de extremo a extremo son HTTP con PostgreSQL real aislado y sesión de prueba. Cubren:

1. Sección con varios cultivos y cantidades de plantas: un riego entrega 5 puntos en total.
2. Reenvíos y cuatro solicitudes concurrentes de riego: mismo comprobante, una sola recompensa.
3. Una segunda actividad acumula puntos y cambia el ranking consultado por HTTP.
4. Riego programado: aviso de la sección, bloqueo anticipado, finalización en su fecha, reenvío sin duplicado y desaparición del aviso pendiente.
5. Actividad grupal: cada participante registrado cobra una vez, incluso con cierres simultáneos e inscripción concurrente.
6. Cambios concurrentes de puntos y membresía: los totales siguen coincidiendo con los miembros actuales.
7. Migración sobre saldos existentes y altas, bajas y cambios de gremio.
8. Recompensas inmutables; reversión completa de tarea y saldos ante un fallo.
9. Preparación → espera → siembra → señalética / abono / limpieza → ritual → cosecha → secado y almacenamiento.
10. Cosecha: riego de otra sección rechazado, fecha local correcta aceptada incluso con un riego más reciente, clima y confirmaciones revalidados.
11. Cultivos conservados, finalización sin premio, nuevo ciclo y catálogo sin días explícitos.
12. Secado que sigue húmedo al día 15 permanece pendiente; lote individual y grupal respetan sus responsables y participantes.

En Supabase solo se aplicaron el esquema y la conciliación de totales: no se registraron actividades ficticias ni se repartieron premios de prueba. El mapeo de secciones y la vinculación de cultivos existentes se ejecutan al sincronizar el panel desde el juego.

No se realizó una sesión interactiva de navegador con una cuenta real. La interfaz se validó mediante compilación y lint; el recorrido funcional se verificó por HTTP en la base aislada. La frecuencia automática y el límite diario del riego permanecen pendientes de definición, según el alcance solicitado.

## Archivos nuevos

- `backend/migrations/20261108_004_secciones_puntos_ranking.sql`
- `backend/scripts/migrate-activities.js`
- `backend/src/data/sections.js`
- `backend/src/data/guildRanking.js`
- `huertos-ecuador/src/components/PanelActividades/PanelActividades.jsx`
- `huertos-ecuador/src/components/PanelActividades/PanelActividades.module.css`
- `huertos-ecuador/src/components/RankingGremios/RankingGremios.jsx`
- `IMPLEMENTACION_ACTIVIDADES.md`

## Archivos existentes modificados

- `CHECKLIST.md`
- `backend/migrations/README.md`
- `backend/src/controllers/supabase.controller.js`
- `backend/src/data/checklistEnvironment.js`
- `backend/src/data/checklistRules.js`
- `backend/src/data/checklistWorkflow.js`
- `backend/src/data/postgres.js`
- `backend/src/data/taskRewards.js`
- `backend/src/data/watering.js`
- `backend/src/routes/huertos.routes.js`
- `backend/src/routes/recordatorios.routes.js`
- `backend/test/checklist.postgres.test.js`
- `huertos-ecuador/src/components/ModalCantidadSimebra/ModalCantidadSiembra.jsx`
- `huertos-ecuador/src/components/ModalCantidadSimebra/ModalCantidadSiembra.module.css`
- `huertos-ecuador/src/components/ModalInfoCultivo/ModalInfoCultivo.jsx`
- `huertos-ecuador/src/hooks/useChecklist.js`
- `huertos-ecuador/src/pages/Gremio.jsx`
- `huertos-ecuador/src/pages/Juego.jsx`
- `huertos-ecuador/src/services/checklist.js`
