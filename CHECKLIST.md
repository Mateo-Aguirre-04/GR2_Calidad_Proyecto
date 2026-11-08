# Checklist: contrato para conectar la interfaz de Karen

El backend usa la cookie de sesión PostgreSQL y valida la membresía del huerto. No
recibe usuarioId, rango ni puntos del cliente. IDs como texto; el cultivo conserva
huertoId, plantaId y fechaSiembra exacta, incluidos microsegundos y zona horaria.

El login y las pantallas actuales se mantienen. Misiones, insignias, certificación,
niveles y ranking quedan fuera. La referencia local de Karen solo tenía el commit
inicial, por lo que no se modificó su interfaz ni se contactó a otros integrantes.

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

No usar el hook legado useRecordatorios para este contrato. Usar sembrar/completar
del hook nuevo para guardar operación y recompensa juntas. Las rutas operativas
anteriores `/api/huertos/:id/sembrar` y `/cosechar` se conservaron; no otorgan estas
recompensas ni ejecutan este flujo. La pantalla de Karen deberá usar las acciones nuevas.

## API

Prefijo: `/api/recordatorios/huerto/:huertoId`.

| Método | Ruta | Contenido/resultado |
|---|---|---|
| GET | `/` | Arreglo de tareas con disponibilidad y participación |
| GET | `/panel` | Tareas, zonas, lotes, recordatorios y contexto; solo lectura |
| POST | `/sincronizar` | Genera tareas faltantes sin duplicarlas y devuelve el panel |
| POST | `/zonas` | `{ nombre }` → `{ id, nombre }` |
| POST | `/ciclos` | `{ zonaId, claveSolicitud }` → `{ cicloId, zonaId }` |
| PUT | `/cultivos/configuracion` | `{ plantaId, fechaSiembra, parteCosecha, zonaId? }` para cultivos existentes |
| POST | `/cultivos/finalizar` | `{ plantaId, fechaSiembra, cultivoFinalizado: true }`; libera el cultivo sin entregar puntos |
| POST | `/programar` | Jornada de limpieza o aplicación de abono |
| POST | `/siembras` | Registra cultivo, siembra y 30 puntos juntos |
| POST | `/riegos` | Una tarea completada y 5 puntos por cultivo seleccionado |
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

recordatorioActivo marca tareas pendientes cuya fecha local ya llegó, aunque haya
condiciones que impidan completarlas. Los recordatorios adicionales incluyen siembra
por zona y riego previo a una posible cosecha. Estos últimos contienen cultivo,
fechaRiego, fechaCosechaPrevista, requiereRiego y recordatorioActivo. Son planes
sujetos al clima/confirmaciones, no una frecuencia habitual de riego. Si un riego
registrado ya sirve para una cosecha posible, no se vuelve a pedir.

## Reglas implementadas

| Actividad | Regla |
|---|---|
| Riego | Individual, 5 por cultivo/tarea. Frecuencia habitual y límite diario pendientes. |
| Maleza | Individual por ciclo de zona; luna nueva local ±1 día, sol y sin lluvia; 15. |
| Preparación | Grupal después de maleza en esa zona/ciclo; 30 por inscrito. Abono opcional durante preparación no entrega puntos adicionales. |
| Siembra | Esperar 15 días transcurridos; 08:00 incluida a 12:00 excluida, hora local; cuarto creciente o luna llena ±1 día; confirmar ritual al amanecer; 30 por cultivo. |
| Señalética | Individual, se genera por cultivo después de sembrar; 25 una vez. |
| Abono | Programado para un cultivo, disponible en su fecha local; 20 una vez por cultivo/ciclo. Otra programación devuelve la misma tarea, sin otro premio. |
| Limpieza | Jornada grupal bajo demanda en su fecha local; 30 por inscrito. |
| Ritual de agradecimiento | Jornada grupal de cosecha del día local, después del amanecer; confirmar ritual al amanecer; 20 por inscrito. Es distinto del ritual de siembra. |
| Cosecha | Ciclo cumplido, parte registrada, riego del mismo cultivo en la fecha local de hace dos días, fase ±1 día, sol/sin lluvia y ritual de la jornada completado. Confirmar madurez y rocío seco; 35 una vez por cultivo. |
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
sustituye por clima soleado; no se añade umbral térmico. Documentación técnica:
[Open-Meteo](https://open-meteo.com/en/docs) y
[Astronomy Engine](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md).

## Ejemplos desde el hook

Crear una clave con crypto.randomUUID() una vez por acción. Conservar clave y contenido
durante los reintentos. Si cambia la acción, usar otra clave. Se exige en ciclos,
programación, siembra y riego. Un envío de riego acepta de 1 a 100 cultivos distintos.

```js
const claveRiego = crypto.randomUUID() // Conservar en el estado de la acción para reintentar.
await registrarRiegos([{ plantaId: '9', fechaSiembra: fechaExacta }], claveRiego)
const claveAbono = crypto.randomUUID()
await programar({ actividad: 'abono_organico', cultivo: { plantaId: '9', fechaSiembra: fechaExacta },
  programadaPara: fechaConZonaHoraria, claveSolicitud: claveAbono })
const claveLimpieza = crypto.randomUUID()
await programar({ actividad: 'limpieza_huerto', programadaPara: fechaConZonaHoraria, claveSolicitud: claveLimpieza })
const claveSiembra = crypto.randomUUID()
await sembrar({ cicloId: '1', plantaId: '9', parteCosecha: 'flores', x: 25, y: 35,
  confirmaciones: { ritualAmanecer: true }, claveSolicitud: claveSiembra })
await completar(cosechaId, { cultivoListo: true, rocioSeco: true, conservarCultivo: true })
// Cuando posteriormente el cultivo conservado termine de ocupar la zona:
await finalizarCultivo({ plantaId: '9', fechaSiembra: fechaExacta, cultivoFinalizado: true })
await iniciarSecado(loteId, 'grupal', true)
await completar(secadoId, { seco: true, empacado: true, etiquetado: true, almacenado: true })
```

Los true deben salir de la confirmación del miembro, no marcarse automáticamente.
La preparación acepta confirmación opcional abonoOrganico. Ambos rituales usan
ritualAmanecer. sembrar devuelve `{ cultivo, comprobante }`; actualizar luego la vista
del huerto. Riego devuelve `{ claveSolicitud, huertoId, puntosOtorgados, tareas }`.
Comprobante de cierre: `{ id, completado, completadaEn, completadaPor,
recompensas: [{ usuarioId, puntos }] }`. Reenviar conserva fecha, autor y puntos.
Estado, participaciones y acumulados se confirman en una transacción; ante un fallo
se revierte todo el envío, incluso si falló después de regar la primera planta.

## SQL y pruebas

001 es la baseline ya creada manualmente. 002 agrega idempotencia; 003 agrega zonas,
ciclos, cultivos, lotes y contexto de tareas. Ver [migraciones](backend/migrations/README.md).
Las migraciones 002 y 003 se aplicaron y verificaron en Supabase el 8 de noviembre de 2026.
El SQL raíz contiene las mismas secciones y un modelo legado destructivo: no ejecutar
ese archivo completo. No se escriben datos ficticios en Supabase.

Desde backend: `pnpm test` y `node scripts/run-checklist-postgres.js`. Se prueban
permisos, participación, fechas locales, ventanas, rituales, cosecha, ambas modalidades
de secado, reenvíos, concurrencia y reversión de fallos. La base temporal se detiene al
terminar. El lint general del frontend tenía 7 errores y 2 advertencias en otros módulos;
el adaptador y el hook nuevos se verifican por separado.

Verificación compartida mediante `node scripts/verify-checklist.js`: seis tablas nuevas
con RLS activo, lectura de un miembro existente correcta, lectura ajena rechazada con
403 y panel real con clima y zona horaria America/Guayaquil. Se hizo dentro de READ ONLY,
sin sincronizar tareas ni escribir datos ficticios. La primera sincronización la hace
el hook cuando Karen lo conecte. Los cuatro cultivos anteriores necesitan que el miembro
indique su zona y parte de cosecha; el backend no adivina esos datos físicos.
