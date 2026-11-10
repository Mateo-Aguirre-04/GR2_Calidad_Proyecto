-- Ejecutar en una transacción. Conserva siembras, tareas, premios y fechas originales.
ALTER TABLE huertos.planta ADD COLUMN IF NOT EXISTS catalogo_activo boolean NOT NULL DEFAULT true;

-- Datos antiguos de prueba: retirados del catálogo y de nuevas siembras.
-- Su historial tiene recompensas inmutables y se conserva sin alterar puntos.
UPDATE huertos.planta SET catalogo_activo=false
WHERE lower(nombre_cientifico) IN ('cucurbita pepo','solanum lycopersicum','capsicum annuum',
  'phaseolus vulgaris','pyrus communis','malus domestica')
  AND catalogo_activo;

-- Estas especies pertenecen al paquete medicinal de imágenes del proyecto.
UPDATE huertos.planta SET id_tipo_planta=(SELECT id_tipo_planta FROM huertos.tipo_planta
  WHERE lower(nombre)='planta medicinal' ORDER BY id_tipo_planta LIMIT 1)
WHERE lower(nombre_cientifico) IN ('passiflora edulis','sambucus nigra subsp. peruviana')
  AND id_tipo_planta IS DISTINCT FROM (SELECT id_tipo_planta FROM huertos.tipo_planta
    WHERE lower(nombre)='planta medicinal' ORDER BY id_tipo_planta LIMIT 1);

-- Completar solo ciclos sin días; conservar los rangos ya definidos.
WITH ciclos(nombre_cientifico,ciclo) AS (VALUES
  ('matricaria chamomilla','Anual (60-90 días)'),
  ('mentha spicata','Perenne (60-90 días; rebrote estacional)'),
  ('plantago major','Perenne (50-70 días)'),
  ('ocimum basilicum','Anual (60-90 días)')
)
UPDATE huertos.planta p SET ciclo_cultivo=c.ciclo
FROM ciclos c WHERE lower(p.nombre_cientifico)=c.nombre_cientifico AND p.catalogo_activo
  AND (p.ciclo_cultivo IS NULL OR p.ciclo_cultivo !~* '[0-9]+[[:space:]]*d[ií]as');

-- Las cosechas creadas cuando faltaban días tenían programada_para=NULL.
-- La madurez sigue contándose desde la fecha real de la siembra existente.
UPDATE huertos.tareas_huerto t SET programada_para=t.fecha_siembra
  + substring(p.ciclo_cultivo FROM '([0-9]+)[[:space:]]*d[ií]as')::integer * interval '24 hours'
FROM huertos.planta p WHERE p.id_planta=t.id_planta AND p.catalogo_activo
  AND t.codigo_actividad='cosecha' AND t.completada_en IS NULL
  AND t.programada_para IS NULL AND t.fecha_siembra IS NOT NULL
  AND lower(p.nombre_cientifico) IN ('matricaria chamomilla','mentha spicata','plantago major','ocimum basilicum')
  AND p.ciclo_cultivo ~* '[0-9]+[[:space:]]*d[ií]as';
