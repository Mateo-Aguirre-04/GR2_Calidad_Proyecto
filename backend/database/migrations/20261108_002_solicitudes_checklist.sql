-- =============================================================================
-- CHECKLIST: REINTENTOS DE ACCIONES SIN DUPLICAR RECOMPENSAS
-- =============================================================================
-- Nueva migración, distinta de la baseline ya aplicada. Probar antes de aplicar.
-- Aplicada y verificada en Supabase el 2026-11-08. No reejecutar manualmente.
-- Ejecutar una sola vez dentro de una transacción; no incluye DROP ni un backfill.
-- La clave la genera el cliente una vez por acción y la reutiliza al reintentar.
-- Una clave del mismo miembro nunca representa dos huertos ni dos acciones distintas.
CREATE TABLE huertos.solicitudes_checklist (
    ID_Usuario BIGINT NOT NULL REFERENCES huertos.usuario_general(ID_Usuario),
    Clave_Solicitud UUID NOT NULL,
    ID_Huerto BIGINT NOT NULL REFERENCES huertos.huerto(ID_Huerto),
    Accion TEXT NOT NULL,
    Contenido JSONB NOT NULL CHECK (jsonb_typeof(Contenido) IN ('array', 'object')),
    Resultado JSONB CHECK (Resultado IS NULL OR jsonb_typeof(Resultado) = 'object'),
    Created_At TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ID_Usuario, Clave_Solicitud)
);
ALTER TABLE huertos.solicitudes_checklist ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE huertos.solicitudes_checklist IS
    'Idempotencia de acciones del checklist. Resultado y recompensas se confirman en la misma transacción.';
