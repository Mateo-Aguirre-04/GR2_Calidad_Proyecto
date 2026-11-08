# Migraciones del checklist

El comando previo pnpm db:migrate sigue limitado a last_seen y no se cambió.

| Archivo | Estado al revisar Supabase | Propósito |
|---|---|---|
| 20261108_001_checklist_baseline.sql | Ya aplicado manualmente | Actividades, tareas y participantes; NO volver a ejecutar allí |
| 20261108_002_solicitudes_checklist.sql | Aplicado y verificado el 2026-11-08 | Comprobantes idempotentes de acciones |
| 20261108_003_programacion_checklist.sql | Aplicado y verificado el 2026-11-08 | Zonas, ciclos, metadatos de cultivo, lotes, zona horaria y contexto de tareas |
| 20261108_004_secciones_puntos_ranking.sql | Aplicada y verificada en Supabase el 2026-11-08 | Secciones mapeadas, riego por sección y triggers de puntos y gremios |

002 y 003 agregan seis tablas y columnas/índices en tareas_huerto. No borran tablas,
no cambian puntos ni rellenan cultivos existentes. Las nuevas tablas tienen RLS activo
y se operan desde el backend con su sesión y membresía; no se concede acceso directo
al navegador. La baseline tiene IDs bigint y fecha_siembra timestamptz, verificados.

El SQL raíz conserva el modelo legado y añade estas tres secciones idénticas.
**El archivo completo contiene DROP y diferencias antiguas: no ejecutarlo en Supabase.**

## Revisión y aplicación

Desde backend:

```powershell
node scripts/checklist-migrations.js         # Solo lectura
node scripts/checklist-migrations.js --apply # Solo 002 y 003, en una transacción
```

El ejecutor revisa la baseline y rechaza una aplicación parcial. Usa un bloqueo
transaccional para serializar la aplicación y tiempos de espera limitados. Si falla,
revierte ambos archivos. Si las seis tablas y las columnas esperadas ya existen,
no reejecuta el SQL. No ejecutar 001 en la base compartida.
La aplicación ya se realizó y la revisión posterior confirmó las seis tablas con RLS.
`node scripts/verify-checklist.js` comprueba también las lecturas de miembros y ajenos
sin escribir datos en la base compartida.

## Prueba local

Para 004, después de validar localmente:

```powershell
node scripts/migrate-activities.js         # Solo lectura: triggers y diferencias de saldos
node scripts/migrate-activities.js --apply # 004 en una transacción; calcula totales iniciales
```

El ejecutor rechaza triggers previos desconocidos para impedir una doble acreditación.
004 conserva saldos de miembros y premios anteriores; cambia el saldo del gremio para
igualarlo a la suma actual. El backend actualizado requiere 004 antes de reiniciar.
No ejecutar 001–003 ni el SQL raíz sobre la base compartida.

```powershell
cd backend
pnpm test
node scripts/run-checklist-postgres.js
```

El ejecutor crea PostgreSQL temporal en el puerto 55439, prueba las tres migraciones
con dependencias ficticias, verifica HTTP y concurrencia, limpia su esquema y detiene
el servidor. Conserva su carpeta temporal para diagnóstico. No usa DATABASE_URL ni
escribe en Supabase. Requiere PostgreSQL 18 en Windows; POSTGRES_BIN permite cambiar
la ubicación de sus ejecutables.

Las pruebas PostgreSQL se omiten en pnpm test salvo que CHECKLIST_TEST_DATABASE_URL
apunte a localhost y la base gr2_checklist_test. El ejecutor temporal configura esa
variable únicamente para su proceso hijo.
