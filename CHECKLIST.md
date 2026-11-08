# Actividades, recordatorios, puntos y ranking

El backend usa la cookie de sesión PostgreSQL y valida la membresía del huerto. No
recibe usuarioId, rango ni puntos del cliente. IDs como texto; el cultivo conserva
huertoId, plantaId y fechaSiembra exacta, incluidos microsegundos y zona horaria.

El juego usa las parcelas ya dibujadas: cada sección se identifica por zona y parcela.
El checklist sincroniza esos destinos con zonas_huerto sin crear otra distribución.
El alcance incluye el ranking real de gremios; misiones, insignias y certificación quedan fuera.

## React

`huertos-ecuador/src/hooks/useChecklist.js` exporta:

```jsx
const { tareas, recordatorios, panel, cargando, error, recargar,
  inscribirse, completar, registrarRiegos, crearZona, iniciarCiclo,
  programar, sembrar, configurarCultivo, finalizarCultivo, iniciarSecado } = useChecklist(huertoId)
```

Sincroniza al montar, después de las acciones y cada minuto con la pestaña visible.
Cancela lecturas antiguas y evita mostrar datos de otro huerto. Las acciones propagan
errores para mostrarlos en la interfaz. El adaptador está en `src/services/checklist.js`.

Usar useChecklist para guardar operación y recompensa juntas. Las rutas anteriores
`/api/huertos/:id/sembrar` y `/cosechar` también pasan por el workflow y sus reglas;
cosechar exige tareaId y confirmaciones. La pantalla ya usa el checklist para ambas acciones.
Regar abre una ventana exclusiva con las secciones que tienen plantas activas.
Recordatorios abre los avisos y permite pasar a la pestaña Actividades; Gremio incluye ranking.
usePerfil devuelve recargar para actualizar los puntos después de una actividad.

## API

Prefijo: `/api/recordatorios/huerto/:huertoId`.

| Método | Ruta | Contenido/resultado |
|---|---|---|
| GET | `/` | Arreglo de tareas con disponibilidad y participación |
| GET | `/panel` | Tareas, zonas, lotes, recordatorios y contexto; solo lectura |
| POST | `/sincronizar` | Genera tareas faltantes sin duplicarlas y devuelve el panel |
| POST | `/zonas` | `{ zona, parcela }` de la distribución existente → `{ id, nombre }` |
| POST | `/ciclos` | `{ zonaId, claveSolicitud }` → `{ cicloId, zonaId }` |
| PUT | `/cultivos/configuracion` | `{ plantaId, fechaSiembra, parteCosecha, zonaId? }` para cultivos existentes |
| POST | `/cultivos/finalizar` | `{ plantaId, fechaSiembra, cultivoFinalizado: true }`; libera el cultivo sin entregar puntos |
| POST | `/programar` | Jornada de limpieza o aplicación de abono |
| POST | `/siembras` | Registra cultivo, siembra y 30 puntos juntos |
| POST | `/riegos` | `{ zonaId, claveSolicitud }`: una tarea completada y 5 puntos en total por sección |
| POST | `/tareas/:tareaId/inscribirse` | Inscribe al miembro actual, una sola vez |
| POST | `/tareas/:tareaId/completar` | `{ confirmaciones }`; devuelve el comprobante original al reintentar |
| POST | `/secados` | `{ loteId, modalidad, aLaSombra: true }`; inicia secado y registra al responsable |

200: correcto. 400: entrada/confirmación inválida. 401: sesión. 403: membresía,
participación o responsabilidad. 404: recurso ajeno al huerto/inexistente. 409:
condiciones incumplidas o clave reutilizada para otra acción. 503: fallo de base.
Las respuestas exitosas tienen Cache-Control: no-store.

## Panel

```json
{
  "tareas": [{
    "id": "100", "huertoId": "42", "modalidad": "grupal",
    "actividad": { "codigo": "limpieza_huerto", "nombre": "Limpiar el huerto", "puntos": 30 },
    "cultivo": null, "zona": null, "loteId": null,
    "programadaPara": "2026-11-09T13:00:00.000Z",
    "completado": false, "completadaEn": null, "completadaPor": null,
    "yaInscrito": true, "responsableId": null, "confirmaciones": {},
    "recordatorioActivo": true,
    "disponibilidad": { "estado": "disponible", "puedeCompletar": true,
      "motivos": [], "confirmacionesRequeridas": [] }
  }],
  "zonas": [], "lotes": [], "recordatorios": [],
  "contexto": { "ahora": "2026-11-09T15:00:00.000Z", "zonaHoraria": "America/Guayaquil",
    "climaVerificado": true, "clima": {}, "amanecer": "2026-11-09T10:50:00.000Z",
    "ventanasLunares": { "nueva": true, "crecienteOLlena": false, "menguante": false } }
}
```

Cultivo de una tarea: `{ huertoId, plantaId, fechaSiembra, parteCosecha }`. El panel
también incluye cultivos con activo, conservadoTrasCosecha, finalizadoEn, zonaId y cicloId.
Zona de una tarea:
`{ id, nombre, cicloId }`. Disponibilidad: disponible, no_disponible,
pendiente_configuracion o completada. Usar puedeCompletar y mostrar motivos; en
grupales exigir también yaInscrito. Para cosecha, decisionesRequeridas exige elegir
conservarCultivo como booleano: true mantiene la planta activa y false finaliza ese
cultivo. Esta elección no se presupone ni debe marcarse automáticamente.
No volver a decidir las reglas con el reloj o
el clima del navegador. Las tareas terminadas se conservan para consulta.

recordatorioActivo en una tarea indica que su fecha local llegó; no implica que deba
mostrarse como notificación. El arreglo recordatorios se calcula en activityReminders.js
con las condiciones específicas del documento de revisión:

- Riego diario por sección con plantas en diseños de suelo. En diseños urbanos con
  recipientes, el aviso aparece cada 7 fechas locales desde la siembra o el último riego.
  Desaparece al registrar un riego y no limita los riegos manuales.
- Siembra en la víspera de cuarto creciente o luna llena, sin plantas ni siembra realizada
  en ese ciclo, con preparación que pueda cumplir los 15 días.
- Cosecha solo para cultivos pendientes que cumplieron los días explícitos del catálogo.
  Aviso individual de riego de hace dos fechas locales; rocío desde las 08:00, de día,
  sin lluvia y con datos recientes, manteniendo confirmación manual de rocío seco.
- Hojas/flores/frutos: víspera de creciente/llena. Semillas/raíces: día de cuarto menguante.
- Maleza: día de luna nueva y cielo despejado verificado, sección libre y ciclo vigente.
- Preparación: maleza completada, sección libre, preparación pendiente y luna nueva
  local ±1 día (ventana de luna oscura).
- Secado: desde el día local 10; sigue pendiente hasta confirmar seco/empacado/etiquetado/almacenado.
- Limpieza: se genera una jornada pendiente a los 7 días locales de la última limpieza
  (o creación del huerto, si no hay ninguna); el aviso desaparece al completar.
- Señalética: cultivo activo con tarea pendiente; desaparece al colocarla o finalizar el cultivo.
- Abono: desde 20 días locales de la siembra o última aplicación; cada aplicación entrega
  20 puntos. El aviso permanece hasta completarla y luego espera otros 20 días.
- Ritual de agradecimiento: opcional, aviso los días 14 y 15, marcable solo el 15 del
  mes correspondiente. Mantiene la jornada grupal y sus 20 puntos por inscrito.
- Clima de cosecha: cultivo maduro, cielo despejado, sin lluvia, temperatura >=22 °C
  y cuarto creciente o luna llena en la fecha actual o la noche anterior.

Las reglas de disponibilidad para completar actividades siguen validándose en el servidor;
un aviso favorable sobre una condición de cosecha no omite las demás restricciones.

## Reglas implementadas

| Actividad | Regla |
|---|---|
| Riego | Individual, 5 en total por sección/tarea con plantas activas, sin multiplicar por plantas. Aviso diario en diseños de suelo y semanal en recipientes urbanos; no se impone un límite diario de acciones. |
| Maleza | Individual por ciclo de zona; luna nueva local ±1 día, sol y sin lluvia; 15. |
| Preparación | Grupal después de maleza en esa zona/ciclo, durante luna nueva local ±1 día; 30 por inscrito. Abono opcional durante preparación no entrega puntos adicionales. |
| Siembra | Esperar 15 días transcurridos; desde las 08:00, hora local, sin cierre fijo; cuarto creciente o luna llena ±1 día; confirmar ritual al amanecer; 30 por cultivo. |
| Señalética | Individual, se genera por cultivo después de sembrar; 25 una vez. |
| Abono | Por cultivo activo, cada 20 días locales desde la siembra o última aplicación; 20 por aplicación. Programaciones repetidas reutilizan la tarea pendiente. |
| Limpieza | Jornada grupal programable y aviso automático cada 7 días sin limpieza; 30 por inscrito. |
| Ritual de agradecimiento | Opcional; jornada mensual grupal, solo se marca el día 15 local, 20 por inscrito. No requiere amanecer ni bloquea la cosecha. Es distinto del ritual obligatorio de siembra. |
| Cosecha | Ciclo cumplido, parte registrada, riego de la misma sección en la fecha local de hace dos días, fase ±1 día, desde las 08:00 locales y con sol/sin lluvia. Confirmar madurez y rocío seco; 35 una vez por cultivo. Otro riego más reciente no invalida el anterior. |
| Secado | Lote único por cosecha, individual o grupal. Registrar inicio a la sombra. Desde día local 10 confirmar seco, empacado, etiquetado y almacenado; 20 por registrado. No se completa automáticamente al día 15. |

Hojas/flores/frutos: cuarto creciente o luna llena. Semillas/raíces: cuarto menguante.
En rangos del catálogo se usa el extremo superior, como ya hacía el proyecto. Sin
días explícitos queda pendiente: no se inventan 60 ni 120 días para Anual/Perenne.

Cada zona tiene sus ciclos. Solo puede empezar otro cuando no hay cultivos activos
en esa zona. Una planta que sigue creciendo o se conserva tras una cosecha parcial
mantiene la zona ocupada. Otra zona identificada puede prepararse de forma independiente.
Cuando termina el último cultivo, el nuevo ciclo empieza por otro retiro de maleza,
una nueva jornada de preparación y sus propios 15 días de espera.
Un ciclo agotado no permite volver a sembrar con su preparación antigua. Los cultivos
existentes pueden configurar su parte sin inventarles preparación ni premios de siembra.
Los cultivos anteriores también pueden asignarse a una zona mediante zonaId. Hacerlo
antes de iniciar preparaciones en esa zona: su ocupación queda registrada en un ciclo
de origen sin tareas ni puntos de preparación inventados. Un cultivo asignado no se
puede mover de zona para liberar el ciclo. Hasta finalizarlo bloquea otra preparación
de esa zona, mientras las otras zonas se pueden preparar por separado.
Finalizar un cultivo exige confirmar que terminó y ya no ocupa la zona. No entrega puntos
y conserva su fecha de finalización al reenviar. Una cosecha parcial conserva su planta,
pero la recompensa de cosecha sigue siendo una sola vez por cultivo.
Cualquier miembro del gremio puede programar; cualquier inscrito puede cerrar una tarea
grupal. Tras el cierre no se admiten nuevos participantes. Un lote individual queda
reservado a su responsable; al iniciar un lote grupal, su responsable queda inscrito.

La zona horaria se resuelve desde la ubicación con Open-Meteo y se conserva al sincronizar.
Astronomy Engine calcula las fases, comparadas por fecha local. Sol: WMO 0/1, de día,
precipitación 0 y observación reciente. Caché de clima: cinco minutos. Un fallo no se
sustituye por clima soleado. El aviso de clima cálido exige 22 °C y cielo despejado;
ese umbral corresponde al recordatorio, no añade una prohibición de cosecha. Documentación técnica:
[Open-Meteo](https://open-meteo.com/en/docs) y
[Astronomy Engine](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md).

## Ejemplos desde el hook

Crear una clave con crypto.randomUUID() una vez por acción. Conservar clave y contenido
durante los reintentos. Si cambia la acción, usar otra clave. Se exige en ciclos,
programación, siembra y riego. Un envío de riego corresponde a una sección existente.

```js
const claveRiego = crypto.randomUUID() // Conservar en el estado de la acción para reintentar.
await registrarRiegos(seccionId, claveRiego)
const claveAbono = crypto.randomUUID()
await programar({ actividad: 'abono_organico', cultivo: { plantaId: '9', fechaSiembra: fechaExacta },
  programadaPara: fechaConZonaHoraria, claveSolicitud: claveAbono })
const claveLimpieza = crypto.randomUUID()
await programar({ actividad: 'limpieza_huerto', programadaPara: fechaConZonaHoraria, claveSolicitud: claveLimpieza })
const claveSiembra = crypto.randomUUID()
await sembrar({ cicloId: '1', plantaId: '9', parteCosecha: 'flores', cantidad: 20,
  confirmaciones: { ritualAmanecer: true }, claveSolicitud: claveSiembra })
await completar(cosechaId, { cultivoListo: true, rocioSeco: true, conservarCultivo: true })
// Cuando posteriormente el cultivo conservado termine de ocupar la zona:
await finalizarCultivo({ plantaId: '9', fechaSiembra: fechaExacta, cultivoFinalizado: true })
await iniciarSecado(loteId, 'grupal', true)
await completar(secadoId, { seco: true, empacado: true, etiquetado: true, almacenado: true })
```

Los true deben salir de la confirmación del miembro, no marcarse automáticamente.
La preparación acepta confirmación opcional abonoOrganico. Solo el ritual obligatorio
de siembra usa ritualAmanecer. sembrar devuelve `{ cultivo, comprobante }`; actualizar luego la vista
del huerto. Riego devuelve `{ claveSolicitud, huertoId, zonaId, puntosOtorgados: 5, tareas }`.
Comprobante de cierre: `{ id, completado, completadaEn, completadaPor,
recompensas: [{ usuarioId, puntos }] }`. Reenviar conserva fecha, autor y puntos.
Estado, participaciones y acumulados se confirman en una transacción; ante un fallo
se revierte toda la actividad. Los riegos y premios anteriores conservan su historial.

## Puntos y ranking

004 incorpora acreditar_recompensa_tarea (AFTER INSERT o UPDATE OF puntos_otorgados
en participantes_tarea). Solo pasar de NULL a una recompensa válida incrementa
usuario_general.puntos. El backend ya no incrementa ese saldo por separado.
validar_recompensa_tarea impide acreditar una tarea incompleta, un monto distinto al
catálogo, un miembro ajeno o alterar/eliminar una recompensa acreditada.

sincronizar_puntos_gremio (AFTER UPDATE OF puntos en usuario_general) y
sincronizar_membresia_gremio (AFTER INSERT/UPDATE/DELETE en miembro_gremio)
mantienen gremio.puntos_gremio como suma de sus miembros actuales. El trigger BEFORE
bloquear_saldo_membresia serializa contra cambios de saldo. La migración calcula los
totales iniciales sin volver a acreditar premios anteriores. Los cambios concurrentes
usan bloqueos ordenados.

GET /api/gremios consulta esos saldos, ordena por puntos_gremio DESC y desempata por ID.
La pestaña Ranking de gremios consulta esta ruta al abrirse y permite actualizarla.
Al completar actividades se recargan el perfil y el huerto. No existe una tabla adicional
de recordatorios: el panel los deriva de tareas, cultivos, lotes y condiciones verificadas.

## SQL y pruebas

001 es la baseline ya creada manualmente. 002 agrega idempotencia; 003 agrega zonas,
ciclos, cultivos, lotes y contexto; 004 vincula las secciones mapeadas, el riego por sección
y los triggers de puntos y gremios. Ver [migraciones](backend/migrations/README.md).
Las migraciones 002, 003 y 004 se aplicaron y verificaron en Supabase el 8 de noviembre de 2026.
005, aplicada y verificada en la misma fecha, permite abono recurrente sin alterar
las recompensas anteriores. Su ejecutor es `node scripts/migrate-recurring-fertilizer.js`.
El SQL raíz contiene las mismas secciones y un modelo legado destructivo: no ejecutar
ese archivo completo. No se escriben datos ficticios en Supabase.

Desde backend: `pnpm test` y `node scripts/run-checklist-postgres.js`. Se prueban
permisos, participación, fechas locales, ventanas, rituales, cosecha, ambas modalidades
de secado, reenvíos, concurrencia y reversión de fallos. La base temporal se detiene al
terminar. El lint general del frontend tenía 7 errores y 2 advertencias en otros módulos;
el adaptador y el hook nuevos se verifican por separado.

Verificación compartida mediante `node scripts/verify-checklist.js`: seis tablas de
programación con RLS activo, lectura de un miembro existente correcta, lectura ajena
rechazada con 403 y panel real con clima y zona horaria America/Guayaquil. Se hizo
dentro de READ ONLY, sin registrar actividades ficticias. El hook conectado sincroniza
las secciones desde zona/parcela y vincula los cultivos ubicados allí. Si falta ubicación
o parte de cosecha, el miembro debe configurar los datos reales; el backend no los adivina.
`node scripts/migrate-activities.js` verificó los cinco triggers de 004 y cero diferencias
entre los totales de gremio y la suma de saldos de sus miembros actuales.
