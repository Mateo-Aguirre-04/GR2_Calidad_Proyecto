-- =============================================================================
-- GAMIFICACIÓN: BASELINE DEL CHECKLIST VERIFICADA EN SUPABASE (2026-11-08)
-- =============================================================================
-- Ya aplicada manualmente en la base compartida. NO ejecutar allí de nuevo.
-- Para una base de prueba vacía, después del esquema operativo huertos.
-- No sustituye el modelo original de public. No reparte ni recalcula puntos.
-- Ejecutar dentro de una transacción. No contiene DROP ni altera tablas ajenas.
-- Inscripción: PK (ID_Tarea, ID_Usuario) evita duplicados por miembro.
-- Recompensa pendiente: Puntos_Otorgados IS NULL; cero ya es una recompensa resuelta.
-- La acreditación y el acumulado del usuario deben confirmarse en una transacción.

CREATE TABLE huertos.actividades (
    Codigo TEXT PRIMARY KEY,
    Nombre TEXT NOT NULL,
    Puntos INTEGER NOT NULL CHECK (Puntos >= 0)
);

CREATE TABLE huertos.tareas_huerto (
    ID_Tarea BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Codigo_Actividad TEXT NOT NULL REFERENCES huertos.actividades(Codigo),
    ID_Huerto BIGINT NOT NULL REFERENCES huertos.huerto(ID_Huerto),
    ID_Planta BIGINT,
    Fecha_Siembra TIMESTAMPTZ,
    Modalidad TEXT NOT NULL CHECK (Modalidad IN ('individual', 'grupal')),
    Programada_Para TIMESTAMPTZ,
    Completada_En TIMESTAMPTZ,
    Completada_Por BIGINT REFERENCES huertos.usuario_general(ID_Usuario),
    Created_At TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((ID_Planta IS NULL) = (Fecha_Siembra IS NULL)),
    CHECK ((Completada_En IS NULL) = (Completada_Por IS NULL)),
    CHECK (Codigo_Actividad <> 'riego' OR ID_Planta IS NOT NULL),
    FOREIGN KEY (ID_Huerto, ID_Planta, Fecha_Siembra)
        REFERENCES huertos.huerto_planta(ID_Huerto, ID_Planta, Fecha_Siembra)
);

CREATE TABLE huertos.participantes_tarea (
    ID_Tarea BIGINT NOT NULL REFERENCES huertos.tareas_huerto(ID_Tarea),
    ID_Usuario BIGINT NOT NULL REFERENCES huertos.usuario_general(ID_Usuario),
    Registrado_En TIMESTAMPTZ NOT NULL DEFAULT now(),
    Puntos_Otorgados INTEGER CHECK (Puntos_Otorgados >= 0),
    PRIMARY KEY (ID_Tarea, ID_Usuario)
);

ALTER TABLE huertos.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.tareas_huerto ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.participantes_tarea ENABLE ROW LEVEL SECURITY;

INSERT INTO huertos.actividades (Codigo, Nombre, Puntos) VALUES
    ('riego',                  'Regar',                                              5),
    ('retiro_maleza',          'Retirar maleza',                                     15),
    ('abono_organico',         'Aplicar abono orgánico',                             20),
    ('senaletica',             'Colocar señalética',                                 25),
    ('limpieza_huerto',        'Limpiar el huerto',                                  30),
    ('preparacion_tierra',     'Preparar la tierra',                                 30),
    ('siembra',                'Sembrar',                                            30),
    ('ritual_agradecimiento',  'Realizar el ritual de agradecimiento a la Pachamama', 20),
    ('cosecha',                'Cosechar',                                           35),
    ('secado_almacenamiento',  'Secar y almacenar lo cosechado',                     20);
