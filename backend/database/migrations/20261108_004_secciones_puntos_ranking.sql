-- Ejecutar en una transacción, después de 001–003 y del mapeo zona/parcela.
-- No recalcula premios anteriores: conserva los saldos y el historial existentes.
LOCK TABLE huertos.usuario_general, huertos.miembro_gremio, huertos.gremio,
  huertos.participantes_tarea, huertos.tareas_huerto IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE huertos.zonas_huerto ADD COLUMN zona_mapa integer,
  ADD COLUMN parcela_mapa integer,
  ADD CONSTRAINT zonas_mapeadas_validas CHECK
    ((zona_mapa IS NULL AND parcela_mapa IS NULL) OR
      (zona_mapa IS NOT NULL AND parcela_mapa IS NOT NULL AND zona_mapa > 0 AND parcela_mapa > 0)),
  ADD CONSTRAINT zonas_mapeadas_unicas UNIQUE(id_huerto,zona_mapa,parcela_mapa);
ALTER TABLE huertos.tareas_huerto ADD COLUMN id_zona bigint,
  ADD FOREIGN KEY (id_zona,id_huerto) REFERENCES huertos.zonas_huerto(id_zona,id_huerto);
-- El constraint de 001 no tenía nombre explícito. Solo sustituir el de riego.
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid='huertos.tareas_huerto'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%riego%'
  LOOP EXECUTE format('ALTER TABLE huertos.tareas_huerto DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE huertos.tareas_huerto ADD CONSTRAINT tarea_riego_destino
  CHECK (codigo_actividad <> 'riego' OR id_zona IS NOT NULL OR id_planta IS NOT NULL);
CREATE INDEX tareas_riego_seccion_fecha ON huertos.tareas_huerto(id_huerto,id_zona,completada_en)
  WHERE codigo_actividad='riego';

-- Una recompensa acreditada no se puede cambiar, eliminar o trasladar.
CREATE FUNCTION huertos.validar_recompensa_tarea() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,huertos AS $$
DECLARE premio integer; terminada timestamptz; autor bigint; modo text;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.puntos_otorgados IS NOT NULL THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Una recompensa acreditada conserva su historial'; END IF;
    IF (NEW.id_tarea,NEW.id_usuario,NEW.puntos_otorgados) IS DISTINCT FROM
       (OLD.id_tarea,OLD.id_usuario,OLD.puntos_otorgados) THEN
      RAISE EXCEPTION 'Una recompensa acreditada es inmutable';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.puntos_otorgados IS NOT NULL THEN
    SELECT a.puntos,t.completada_en,t.completada_por,t.modalidad INTO premio,terminada,autor,modo
      FROM huertos.tareas_huerto t JOIN huertos.actividades a ON a.codigo=t.codigo_actividad
      WHERE t.id_tarea=NEW.id_tarea;
    IF terminada IS NULL OR NEW.puntos_otorgados IS DISTINCT FROM premio
      OR (modo='individual' AND autor<>NEW.id_usuario) THEN
      RAISE EXCEPTION 'Recompensa inválida para la tarea';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM huertos.tareas_huerto t JOIN huertos.huerto h USING(id_huerto)
      JOIN huertos.miembro_gremio m USING(id_gremio)
      WHERE t.id_tarea=NEW.id_tarea AND m.id_usuario=NEW.id_usuario) THEN
      RAISE EXCEPTION 'El participante no pertenece al gremio de la tarea';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validar_recompensa_tarea BEFORE INSERT OR UPDATE OR DELETE
  ON huertos.participantes_tarea FOR EACH ROW EXECUTE FUNCTION huertos.validar_recompensa_tarea();

CREATE FUNCTION huertos.acreditar_recompensa_tarea() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,huertos AS $$
BEGIN
  IF NEW.puntos_otorgados IS NOT NULL AND
    (TG_OP='INSERT' OR OLD.puntos_otorgados IS NULL) THEN
    UPDATE huertos.usuario_general SET puntos=COALESCE(puntos,0)+NEW.puntos_otorgados
      WHERE id_usuario=NEW.id_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'No existe el participante'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acreditar_recompensa_tarea AFTER INSERT OR UPDATE OF puntos_otorgados
  ON huertos.participantes_tarea FOR EACH ROW EXECUTE FUNCTION huertos.acreditar_recompensa_tarea();

-- Deltas atómicos, con bloqueo ordenado de gremios, evitan perder actualizaciones concurrentes.
CREATE FUNCTION huertos.sincronizar_puntos_gremio() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,huertos AS $$
DECLARE g record; diferencia bigint;
BEGIN
  diferencia=COALESCE(NEW.puntos,0)-COALESCE(OLD.puntos,0);
  FOR g IN SELECT id_gremio FROM huertos.miembro_gremio WHERE id_usuario=NEW.id_usuario ORDER BY id_gremio LOOP
    UPDATE huertos.gremio SET puntos_gremio=COALESCE(puntos_gremio,0)+diferencia WHERE id_gremio=g.id_gremio;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER sincronizar_puntos_gremio AFTER UPDATE OF puntos ON huertos.usuario_general
  FOR EACH ROW WHEN (OLD.puntos IS DISTINCT FROM NEW.puntos)
  EXECUTE FUNCTION huertos.sincronizar_puntos_gremio();

-- Serializar cambios de pertenencia contra cambios del saldo del mismo miembro.
CREATE FUNCTION huertos.bloquear_saldo_membresia() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,huertos AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM 1 FROM huertos.usuario_general WHERE id_usuario=NEW.id_usuario FOR NO KEY UPDATE;
  ELSIF TG_OP='DELETE' THEN
    PERFORM 1 FROM huertos.usuario_general WHERE id_usuario=OLD.id_usuario FOR NO KEY UPDATE;
  ELSE
    PERFORM 1 FROM huertos.usuario_general WHERE id_usuario IN (OLD.id_usuario,NEW.id_usuario)
      ORDER BY id_usuario FOR NO KEY UPDATE;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_saldo_membresia BEFORE INSERT OR UPDATE OR DELETE ON huertos.miembro_gremio
  FOR EACH ROW EXECUTE FUNCTION huertos.bloquear_saldo_membresia();
CREATE FUNCTION huertos.sincronizar_membresia_gremio() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,huertos AS $$
DECLARE anterior bigint=0; siguiente bigint=0; gremio_anterior bigint; gremio_siguiente bigint; g record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    gremio_anterior=OLD.id_gremio;
    SELECT COALESCE(puntos,0) INTO anterior FROM huertos.usuario_general WHERE id_usuario=OLD.id_usuario;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    gremio_siguiente=NEW.id_gremio;
    SELECT COALESCE(puntos,0) INTO siguiente FROM huertos.usuario_general WHERE id_usuario=NEW.id_usuario;
  END IF;
  FOR g IN SELECT id_gremio FROM huertos.gremio WHERE id_gremio IN (gremio_anterior,gremio_siguiente) ORDER BY id_gremio LOOP
    UPDATE huertos.gremio SET puntos_gremio=COALESCE(puntos_gremio,0)
      +CASE WHEN g.id_gremio=gremio_siguiente THEN COALESCE(siguiente,0) ELSE 0 END
      -CASE WHEN g.id_gremio=gremio_anterior THEN COALESCE(anterior,0) ELSE 0 END
      WHERE id_gremio=g.id_gremio;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sincronizar_membresia_gremio AFTER INSERT OR UPDATE OR DELETE ON huertos.miembro_gremio
  FOR EACH ROW EXECUTE FUNCTION huertos.sincronizar_membresia_gremio();

UPDATE huertos.gremio g SET puntos_gremio=(SELECT COALESCE(sum(COALESCE(u.puntos,0)),0)
  FROM huertos.miembro_gremio m JOIN huertos.usuario_general u USING(id_usuario) WHERE m.id_gremio=g.id_gremio);
