-- =============================================================================
-- CHECKLIST: ZONAS, CICLOS DE PREPARACIÓN Y LOTES POR COSECHA
-- =============================================================================
-- Nueva migración. Requiere 001 y 002. No ejecutar el script raíz destructivo.
-- Aplicada y verificada en Supabase el 2026-11-08. No reejecutar manualmente.
-- Aplicar dentro de una transacción después de probar. No altera cultivos existentes.
CREATE TABLE huertos.checklist_configuracion (
    ID_Huerto BIGINT PRIMARY KEY REFERENCES huertos.huerto(ID_Huerto),
    Zona_Horaria TEXT NOT NULL
);
CREATE TABLE huertos.zonas_huerto (
    ID_Zona BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_Huerto BIGINT NOT NULL REFERENCES huertos.huerto(ID_Huerto),
    Nombre TEXT NOT NULL CHECK (length(trim(Nombre)) BETWEEN 1 AND 100),
    UNIQUE (ID_Zona, ID_Huerto),
    UNIQUE (ID_Huerto, Nombre)
);
CREATE TABLE huertos.ciclos_zona (
    ID_Ciclo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_Zona BIGINT NOT NULL,
    ID_Huerto BIGINT NOT NULL,
    Created_At TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (ID_Zona, ID_Huerto) REFERENCES huertos.zonas_huerto(ID_Zona, ID_Huerto),
    UNIQUE (ID_Ciclo, ID_Huerto)
);
CREATE TABLE huertos.cultivos_checklist (
    ID_Huerto BIGINT NOT NULL,
    ID_Planta BIGINT NOT NULL,
    Fecha_Siembra TIMESTAMPTZ NOT NULL,
    ID_Ciclo BIGINT,
    Parte_Cosecha TEXT CHECK (Parte_Cosecha IN ('hojas','flores','frutos','semillas','raices')),
    Conservado_Tras_Cosecha BOOLEAN NOT NULL DEFAULT false,
    Finalizado_En TIMESTAMPTZ,
    CHECK (NOT Conservado_Tras_Cosecha OR Finalizado_En IS NULL),
    PRIMARY KEY (ID_Huerto, ID_Planta, Fecha_Siembra),
    FOREIGN KEY (ID_Huerto, ID_Planta, Fecha_Siembra)
        REFERENCES huertos.huerto_planta(ID_Huerto, ID_Planta, Fecha_Siembra),
    FOREIGN KEY (ID_Ciclo, ID_Huerto) REFERENCES huertos.ciclos_zona(ID_Ciclo, ID_Huerto)
);
ALTER TABLE huertos.tareas_huerto
    ADD COLUMN ID_Ciclo BIGINT,
    ADD COLUMN Clave_Generacion TEXT,
    ADD COLUMN Responsable_ID BIGINT REFERENCES huertos.usuario_general(ID_Usuario),
    ADD COLUMN Confirmaciones JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD FOREIGN KEY (ID_Ciclo, ID_Huerto) REFERENCES huertos.ciclos_zona(ID_Ciclo, ID_Huerto);
CREATE UNIQUE INDEX tareas_huerto_generacion_unica
    ON huertos.tareas_huerto(ID_Huerto, Clave_Generacion);
CREATE UNIQUE INDEX tareas_huerto_jornada_zona_unica
    ON huertos.tareas_huerto(ID_Ciclo, Codigo_Actividad)
    WHERE ID_Ciclo IS NOT NULL AND Codigo_Actividad IN ('retiro_maleza','preparacion_tierra');
CREATE UNIQUE INDEX tareas_huerto_recompensa_cultivo_unica
    ON huertos.tareas_huerto(ID_Huerto, ID_Planta, Fecha_Siembra, Codigo_Actividad)
    WHERE Codigo_Actividad IN ('siembra','abono_organico','cosecha','senaletica');
CREATE TABLE huertos.lotes_cosecha (
    ID_Lote BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_Huerto BIGINT NOT NULL REFERENCES huertos.huerto(ID_Huerto),
    ID_Tarea_Cosecha BIGINT NOT NULL UNIQUE REFERENCES huertos.tareas_huerto(ID_Tarea),
    Secado_Iniciado_En TIMESTAMPTZ,
    Modalidad TEXT CHECK (Modalidad IN ('individual','grupal')),
    Responsable_ID BIGINT REFERENCES huertos.usuario_general(ID_Usuario),
    CHECK ((Secado_Iniciado_En IS NULL) = (Modalidad IS NULL)),
    CHECK ((Modalidad IS NULL) = (Responsable_ID IS NULL)),
    UNIQUE (ID_Lote, ID_Huerto)
);
ALTER TABLE huertos.tareas_huerto ADD COLUMN ID_Lote BIGINT,
    ADD FOREIGN KEY (ID_Lote, ID_Huerto) REFERENCES huertos.lotes_cosecha(ID_Lote, ID_Huerto);
CREATE INDEX tareas_huerto_huerto_programada ON huertos.tareas_huerto(ID_Huerto, Programada_Para, ID_Tarea);
CREATE INDEX tareas_huerto_cultivo_actividad ON huertos.tareas_huerto(ID_Huerto, ID_Planta, Fecha_Siembra, Codigo_Actividad, Completada_En);
ALTER TABLE huertos.zonas_huerto ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.ciclos_zona ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.cultivos_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.lotes_cosecha ENABLE ROW LEVEL SECURITY;
ALTER TABLE huertos.checklist_configuracion ENABLE ROW LEVEL SECURITY;
