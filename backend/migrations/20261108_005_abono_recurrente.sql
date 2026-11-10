-- Aplicar dentro de una transacción. Conserva todas las tareas y recompensas históricas.
-- El abono se repite cada 20 días; siembra, cosecha y señalética siguen siendo únicas.
LOCK TABLE huertos.tareas_huerto IN SHARE ROW EXCLUSIVE MODE;
DROP INDEX huertos.tareas_huerto_recompensa_cultivo_unica;
CREATE UNIQUE INDEX tareas_huerto_recompensa_cultivo_unica
    ON huertos.tareas_huerto(ID_Huerto, ID_Planta, Fecha_Siembra, Codigo_Actividad)
    WHERE Codigo_Actividad IN ('siembra','cosecha','senaletica');
-- tareas_huerto_generacion_unica conserva la idempotencia por aplicación de abono.
