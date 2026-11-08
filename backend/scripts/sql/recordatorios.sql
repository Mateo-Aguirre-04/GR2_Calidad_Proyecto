CREATE TABLE IF NOT EXISTS huerto_evento (
  id_evento BIGSERIAL PRIMARY KEY,
  id_huerto INTEGER NOT NULL REFERENCES huerto(id_huerto) ON DELETE CASCADE,
  id_usuario INTEGER NOT NULL REFERENCES usuario_general(id_usuario) ON DELETE CASCADE,
  id_planta INTEGER REFERENCES planta(id_planta) ON DELETE SET NULL,
  fecha_siembra DATE,
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN (
    'riego', 'retirar_maleza', 'preparar_tierra', 'cosecha_sombra', 'almacenar_cosecha',
    'abono', 'limpiar_huerto', 'colocar_senaletica'
  )),
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_huerto_evento_huerto_tipo_fecha
  ON huerto_evento(id_huerto, tipo, registrado_en DESC);
CREATE INDEX IF NOT EXISTS idx_huerto_evento_planta_fecha
  ON huerto_evento(id_huerto, id_planta, fecha_siembra, tipo, registrado_en DESC);
