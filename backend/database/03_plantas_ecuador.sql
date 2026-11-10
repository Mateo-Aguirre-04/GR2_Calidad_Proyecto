-- =============================================================================
-- SCRIPT DE MIGRACIÓN E INSERCIÓN DE PLANTAS ANDINAS / ECUADOR
-- Esquema: huertos
-- Con soporte para las 6 fases:
--   - Fases 1 a 5: Ciclo de crecimiento normal (1: Germinación ... 5: Cosecha/Madurez/Ícono)
--   - Fase 6: Estado marchito / seco / muerto (withered)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASO 1: Asegurar columnas para el Catálogo y Estado Muerto en huertos.planta
-- -----------------------------------------------------------------------------
ALTER TABLE huertos.planta 
  ADD COLUMN IF NOT EXISTS imagen TEXT,
  ADD COLUMN IF NOT EXISTS imagen_muerta TEXT,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS region VARCHAR(50) DEFAULT 'Sierra',
  ADD COLUMN IF NOT EXISTS cuidados JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fases JSONB DEFAULT '[]'::jsonb;

-- -----------------------------------------------------------------------------
-- PASO 2: Registrar Familias Botánicas faltantes
-- -----------------------------------------------------------------------------
INSERT INTO huertos.familia_botanica (nombre, descripcion)
SELECT f.nombre, f.descripcion
FROM (VALUES
  ('Bixaceae', 'Familia del achiote, árboles y arbustos de regiones tropicales y subtropicales'),
  ('Apiaceae', 'Familia de umbelíferas: anís, apio, cilantro, plantas herbáceas aromáticas'),
  ('Boraginaceae', 'Familia de la borraja, plantas con hojas ásperas y flores con néctar abundante'),
  ('Verbenaceae', 'Familia del cedrón, arbustos aromáticos de zonas templadas y valles andinos'),
  ('Phyllanthaceae', 'Familia de la chanca piedra, plantas medicinales de bosque húmedo y subandino'),
  ('Equisetaceae', 'Familia de la cola de caballo, plantas vasculares sin flor ancestrales'),
  ('Zingiberaceae', 'Familia de jengibre y cúrcuma, hierbas perennes con rizomas medicinales y aromáticos'),
  ('Myrtaceae', 'Familia del eucalipto y arrayán, árboles y arbustos aromáticos con aceites esenciales'),
  ('Poaceae', 'Familia de gramíneas: hierba luisa, caña y pastos de gran adaptación'),
  ('Malvaceae', 'Familia de la malva, hierbas y arbustos emolientes con flores mucilaginosas'),
  ('Passifloraceae', 'Familia del maracuyá y taxo, enredaderas trepadoras con frutos de pulpa aromática'),
  ('Piperaceae', 'Familia del matico, arbustos medicinales con inflorescencias en espiga'),
  ('Urticaceae', 'Familia de la ortiga, plantas andinas con hojas medicinales ricas en hierro y minerales'),
  ('Rutaceae', 'Familia de la ruda y cítricos, plantas con glándulas secretoras de aceites balsámicos'),
  ('Asphodelaceae', 'Familia de la sábila, plantas suculentas medicinales de hojas carnosas'),
  ('Euphorbiaceae', 'Familia de la sangre de drago, árboles de bosque montano con látex cicatrizante'),
  ('Adoxaceae', 'Familia del saúco, árboles y arbustos de valles interandinos y climas templados'),
  ('Rubiaceae', 'Familia de la uña de gato y la quina, lianas y árboles con corteza medicinal'),
  ('Caprifoliaceae', 'Familia de la valeriana, hierbas de páramo y bosque andino con propiedades sedantes')
) AS f(nombre, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM huertos.familia_botanica fb WHERE LOWER(fb.nombre) = LOWER(f.nombre)
);

-- -----------------------------------------------------------------------------
-- PASO 3: Registrar e insertar las 29 Plantas con las 6 Fases (incluyendo Marchita/Muerta)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_fam BIGINT;
  v_tipo BIGINT;
  base_url CONSTANT TEXT := 'https://aceafqbfposisfmjxgkj.supabase.co/storage/v1/object/public/huertos-assets/plantas/';
BEGIN

  -- 1. ACHIOTE
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Bixaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'achiote') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Achiote', 'Bixa orellana', 'Urucu, Bija, Ipiák', 0, 1400, 'Perenne (120-180 días)', 'Costa / Amazonía',
      'Arbusto nativo andino-amazónico cultivado por sus semillas rojizas ricas en bixina, antioxidantes y propiedades antiinflamatorias.',
      base_url || 'Achiote/achiote5.png',
      base_url || 'Achiote/achiote6.png',
      '{"suelo": ["Suelo profundo, franco-arenoso y con buen drenaje orgánico."], "ambiente": ["Clima cálido a templado húmedo, sol pleno y precipitaciones moderadas."], "abono": ["Compost maduro o estiércol fermentado cada 3 meses."], "extras": ["Poda anual de despunte para favorecer la floración y formación de cápsulas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Achiote/achiote1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Achiote/achiote2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Achiote/achiote3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Achiote/achiote4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Achiote/achiote5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Achiote/achiote6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 2. ALBAHACA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'albahaca') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Albahaca', 'Ocimum basilicum', 'Albahaca dulce', 0, 2400, 'Anual (60-90 días)', 'Valles / Sierra',
      'Hierba aromática muy apreciada en la cocina ecuatoriana y en infusiones relajantes. Actúa como repelente natural en el huerto.',
      base_url || 'Albahaca/albahaca5.png',
      base_url || 'Albahaca/albahaca6.png',
      '{"suelo": ["Suelo fértil, ligero, rico en humus y con excelente drenaje."], "ambiente": ["Temperatura templada, protegida de vientos fuertes y heladas andinas."], "abono": ["Humus de lombriz líquido cada 15 días."], "extras": ["Podar las inflorescencias para prolongar la producción de hojas tiernas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Albahaca/albahaca1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Albahaca/albahaca2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Albahaca/albahaca3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Albahaca/albahaca4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Albahaca/albahaca5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Albahaca/albahaca6.png', 'muerta', true)
      )::jsonb);
  ELSE
    UPDATE huertos.planta SET 
      imagen = base_url || 'Albahaca/albahaca5.png',
      imagen_muerta = base_url || 'Albahaca/albahaca6.png',
      region = 'Valles / Sierra',
      descripcion = 'Hierba aromática muy apreciada en la cocina ecuatoriana y en infusiones relajantes. Actúa como repelente natural en el huerto.',
      cuidados = '{"suelo": ["Suelo fértil, ligero, rico en humus y con excelente drenaje."], "ambiente": ["Temperatura templada, protegida de vientos fuertes y heladas andinas."], "abono": ["Humus de lombriz líquido cada 15 días."], "extras": ["Podar las inflorescencias para prolongar la producción de hojas tiernas."]}'::jsonb,
      fases = json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Albahaca/albahaca1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Albahaca/albahaca2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Albahaca/albahaca3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Albahaca/albahaca4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Albahaca/albahaca5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Albahaca/albahaca6.png', 'muerta', true)
      )::jsonb
    WHERE LOWER(nombre_comun) = 'albahaca';
  END IF;

  -- 3. ANÍS
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Apiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'anís' OR LOWER(nombre_comun) = 'anis') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Anís', 'Pimpinella anisum', 'Matalahúva', 1000, 2800, 'Anual (90-120 días)', 'Sierra',
      'Planta herbácea cultivada en los valles interandinos por sus semillas carminativas y digestivas de aroma dulce.',
      base_url || 'Anis/anis5.png',
      base_url || 'Anis/anis6.png',
      '{"suelo": ["Suelo franco-arenoso, ligero, permeable y moderadamente calcáreo."], "ambiente": ["Sol directo, clima templado a frío moderado, baja humedad relativa."], "abono": ["Abono orgánico descompuesto al inicio de la siembra."], "extras": ["Cosechar los frutos cuando las umbelas adquieran un color castaño grisáceo."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Anis/anis1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Anis/anis2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Anis/anis3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Anis/anis4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Anis/anis5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Anis/anis6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 4. BORRAJA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Boraginaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'borraja') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Borraja', 'Borago officinalis', 'Flor de estrella', 1500, 3100, 'Anual (60-80 días)', 'Sierra',
      'Planta medicinal y melífera tradicional de la Sierra ecuatoriana. Sus flores azules se usan en jarabes expectorantes.',
      base_url || 'Borraja/borraja5.png',
      base_url || 'Borraja/borraja6.png',
      '{"suelo": ["Tolera suelos pobres, pero prefiere tierra aireada y húmeda."], "ambiente": ["Clima frío y templado andino, exposición semisombra o sol suave."], "abono": ["Compost suave una vez al mes durante el crecimiento."], "extras": ["Atrae abejas y polinizadores que benefician a todo el huerto comunitario."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Borraja/borraja1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Borraja/borraja2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Borraja/borraja3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Borraja/borraja4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Borraja/borraja5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Borraja/borraja6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 5. CEDRÓN
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Verbenaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'cedrón' OR LOWER(nombre_comun) = 'cedron') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Cedrón', 'Aloysia citrodora', 'Hierba Luisa de monte, Cedrón andino', 1200, 2900, 'Perenne (90-120 días)', 'Sierra',
      'Arbusto andino de intenso aroma a limón. Infusión reina de los hogares ecuatorianos para la digestión y el descanso.',
      base_url || 'Cedron/cedron5.png',
      base_url || 'Cedron/cedron6.png',
      '{"suelo": ["Suelo franco bien drenado, no tolera el encharcamiento en las raíces."], "ambiente": ["Pleno sol, valles interandinos protegidos de heladas extremas."], "abono": ["Aporte de compost o ceniza vegetal cada cambio de estación."], "extras": ["Podar las ramas secas al finalizar el periodo de lluvias para vigorizarlo."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Cedron/cedron1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Cedron/cedron2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Cedron/cedron3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Cedron/cedron4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Cedron/cedron5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Cedron/cedron6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 6. CHANCA PIEDRA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Phyllanthaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'chanca piedra' OR LOWER(nombre_comun) = 'chanca_piedra') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Chanca Piedra', 'Phyllanthus niruri', 'Quiebra piedra, Sasfrás', 100, 1800, 'Anual (60-90 días)', 'Costa / Amazonía',
      'Planta medicinal silvestre de climas tropicales y subandinos, reconocida ancestralmente para cuidar los riñones y vías urinarias.',
      base_url || 'Chanca_piedra/chanca_piedra5.png',
      base_url || 'Chanca_piedra/chanca_piedra6.png',
      '{"suelo": ["Suelo húmedo, arenoso y rico en materia orgánica."], "ambiente": ["Clima cálido o templado húmedo, con semisombra."], "abono": ["Biofertilizante foliar orgánico mensual."], "extras": ["Recolectar la planta completa antes de que caigan las semillas minúsculas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Chanca_piedra/chanca_piedra1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Chanca_piedra/chanca_piedra2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Chanca_piedra/chanca_piedra3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Chanca_piedra/chanca_piedra4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Chanca_piedra/chanca_piedra5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Chanca_piedra/chanca_piedra6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 7. CHUQUIRAGUA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Asteraceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'chuquiragua') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Chuquiragua', 'Chuquiraga jussieui', 'Flor del andinista, Chuquirahua', 3000, 4500, 'Perenne (120-150 días)', 'Páramo / Sierra',
      'Arbusto emblemático de los páramos andinos ecuatorianos. Sus flores anaranjadas brindan energía y fortaleza frente al frío de la montaña.',
      base_url || 'Chuquiragua/chuquiragua5.png',
      base_url || 'Chuquiragua/chuquiragua6.png',
      '{"suelo": ["Suelo andino volcánico, suelto, pedregoso y con drenaje impecable."], "ambiente": ["Ambiente frío de gran altura, alta radiación UV y vientos constantes."], "abono": ["No tolera abonos químicos ni exceso de nitrógeno; requiere micorrizas andinas."], "extras": ["Muy sensible al calor sofocante y al exceso de humedad en maceta."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Chuquiragua/chuquiragua1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Chuquiragua/chuquiragua2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Chuquiragua/chuquiragua3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Chuquiragua/chuquiragua4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Chuquiragua/chuquiragua5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Chuquiragua/chuquiragua6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 8. COLA DE CABALLO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Equisetaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'cola de caballo' OR LOWER(nombre_comun) = 'cola_de_caballo') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Cola de Caballo', 'Equisetum bogotense', 'Peluquín, Limpiaplata', 1500, 3600, 'Perenne (90-120 días)', 'Sierra',
      'Planta medicinal andina rica en silicio y minerales. Se usa como diurético natural y en el huerto como fungicida ecológico.',
      base_url || 'Cola_de_caballo/cola_de_caballo5.png',
      base_url || 'Cola_de_caballo/cola_de_caballo6.png',
      '{"suelo": ["Suelo arcilloso o cenagoso, constantemente saturado de humedad."], "ambiente": ["Orillas de acequias y vertientes andinas, tolera semisombra."], "abono": ["Materia orgánica en descomposición de orilla de río."], "extras": ["Excelente para preparar purín de silicio y proteger otros cultivos contra hongos."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo3.png'),
        json_build_object('fase', 4, 'nombre', 'Esporulación', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Cola_de_caballo/cola_de_caballo6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 9. CÚRCUMA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Zingiberaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'cúrcuma' OR LOWER(nombre_comun) = 'curcuma') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Cúrcuma', 'Curcuma longa', 'Azafrán de raíz', 0, 1600, 'Perenne (180-240 días)', 'Costa / Amazonía',
      'Rizoma de color dorado con alto contenido de curcumina, potente antioxidante y desinflamante natural adaptado en huertos húmedos.',
      base_url || 'Curcuma/curcuma5.png',
      base_url || 'Curcuma/curcuma6.png',
      '{"suelo": ["Suelo suelto, esponjoso, rico en materia orgánica y sin piedras."], "ambiente": ["Clima cálido-húmedo o invernadero templado, luz indirecta."], "abono": ["Bokashi o compost enriquecido al momento de la brotación del rizoma."], "extras": ["Cosechar cuando las hojas comiencen a secarse y amarillear por completo."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Curcuma/curcuma1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Curcuma/curcuma2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Curcuma/curcuma3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Curcuma/curcuma4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Curcuma/curcuma5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Curcuma/curcuma6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 10. EUCALIPTO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Myrtaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'eucalipto') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Eucalipto', 'Eucalyptus globulus', 'Eucalipto blanco andino', 1500, 3400, 'Perenne (180-360 días)', 'Sierra',
      'Árbol medicinal aclimatado en el paisaje andino de Ecuador. Sus hojas aromáticas se usan en vahos y jarabes respiratorios.',
      base_url || 'Eucalipto/eucalipto5.png',
      base_url || 'Eucalipto/eucalipto6.png',
      '{"suelo": ["Suelo profundo, tolera sequedad y suelos arcillosos andinos."], "ambiente": ["Pleno sol, vientos andinos y clima templado a frío."], "abono": ["Poco exigente; basta con materia orgánica superficial anual."], "extras": ["Sembrar en linderos del huerto debido a su fuerte consumo de agua subterránea."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Eucalipto/eucalipto1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Eucalipto/eucalipto2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Eucalipto/eucalipto3.png'),
        json_build_object('fase', 4, 'nombre', 'Desarrollo Foliar', 'imagen', base_url || 'Eucalipto/eucalipto4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Eucalipto/eucalipto5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Eucalipto/eucalipto6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 11. HIERBA LUISA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Poaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'hierba luisa' OR LOWER(nombre_comun) = 'hierba_luisa') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Hierba Luisa', 'Cymbopogon citratus', 'Limoncillo, Zacate limón', 0, 2400, 'Perenne (90-120 días)', 'Valles / Costa',
      'Gramínea perenne de fresco sabor cítrico. Imprescindible en los huertos familiares ecuatorianos para infusiones digestivas y calmantes.',
      base_url || 'Hierba luisa/hierba luisa5.png',
      base_url || 'Hierba luisa/hierba luisa6.png',
      '{"suelo": ["Suelo fértil, franco-arenoso y con retención moderada de humedad."], "ambiente": ["Exposición a pleno sol, clima cálido o templado libre de heladas."], "abono": ["Humus de lombriz o compost semestral al pie del macollo."], "extras": ["Dividir la mata cada 2 años para rejuvenecer el cultivo y multiplicarlo."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Hierba luisa/hierba luisa1.png'),
        json_build_object('fase', 2, 'nombre', 'Enraizamiento', 'imagen', base_url || 'Hierba luisa/hierba luisa2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Hierba luisa/hierba luisa3.png'),
        json_build_object('fase', 4, 'nombre', 'Frondosidad', 'imagen', base_url || 'Hierba luisa/hierba luisa4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Hierba luisa/hierba luisa5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Hierba luisa/hierba luisa6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 12. HIERBABUENA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'hierbabuena') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Hierbabuena', 'Mentha spicata', 'Menta verde, Menta dulce', 800, 3000, 'Perenne (60-90 días)', 'Sierra / Valles',
      'Hierba aromática de rápida expansión. Tradicional en sopas, caldos andinos, ensaladas y remedios contra el dolor estomacal.',
      base_url || 'Hierbabuena/hierbabuena5.png',
      base_url || 'Hierbabuena/hierbabuena6.png',
      '{"suelo": ["Suelo muy húmedo, fértil y con alto contenido de materia orgánica."], "ambiente": ["Semisombra o sol filtrado, resiste bien el clima frío andino."], "abono": ["Compost de hojas y riego regular frecuente."], "extras": ["Cultivar preferentemente en macetas o bancales delimitados para controlar sus estolones."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Hierbabuena/hierbabuena1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Hierbabuena/hierbabuena2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Hierbabuena/hierbabuena3.png'),
        json_build_object('fase', 4, 'nombre', 'Ramificación', 'imagen', base_url || 'Hierbabuena/hierbabuena4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Hierbabuena/hierbabuena5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Hierbabuena/hierbabuena6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 13. JENGIBRE
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Zingiberaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'jengibre') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Jengibre', 'Zingiber officinale', 'Kion', 0, 1800, 'Perenne (180-240 días)', 'Costa / Amazonía',
      'Rizoma aromático picante y medicinal, esencial para afecciones de garganta, digestión y calentar el organismo en época fría.',
      base_url || 'Jengibre/jengibre5.png',
      base_url || 'Jengibre/jengibre6.png',
      '{"suelo": ["Tierra suelta, rica en compost y sin piedras que deformen el rizoma."], "ambiente": ["Semisombra, alta humedad ambiental y calor moderado."], "abono": ["Abonado quincenal con biol o té de compost."], "extras": ["Aporcar tierra suave sobre los brotes conforme crezca el tallo falso."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Jengibre/jengibre1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Jengibre/jengibre2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Jengibre/jengibre3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Jengibre/jengibre4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Jengibre/jengibre5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Jengibre/jengibre6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 14. LLANTÉN
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Plantaginaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'llantén' OR LOWER(nombre_comun) = 'llanten') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Llantén', 'Plantago major', 'Llantén mayor, Plantén', 500, 3200, 'Perenne (50-70 días)', 'Sierra',
      'Hierba medicinal andina de hojas anchas y espigas florales. Célebre por su acción desinflamante, cicatrizante y depurativa.',
      base_url || 'Llanten/llanten5.png',
      base_url || 'Llanten/llanten6.png',
      '{"suelo": ["Suelo arcilloso o franco, tolera suelos pisoteados y pesados."], "ambiente": ["Sol directo o semisombra, clima templado a frío andino."], "abono": ["Poco exigente; compost ligero en primavera."], "extras": ["Cosechar las hojas inferiores bien desarrolladas para cataplasmas o infusiones."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Llanten/llanten1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Llanten/llanten2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Llanten/llanten3.png'),
        json_build_object('fase', 4, 'nombre', 'Espiga Floral', 'imagen', base_url || 'Llanten/llanten4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Llanten/llanten5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Llanten/llanten6.png', 'muerta', true)
      )::jsonb);
  ELSE
    UPDATE huertos.planta SET 
      imagen = base_url || 'Llanten/llanten5.png',
      imagen_muerta = base_url || 'Llanten/llanten6.png',
      region = 'Sierra',
      descripcion = 'Hierba medicinal andina de hojas anchas y espigas florales. Célebre por su acción desinflamante, cicatrizante y depurativa.',
      cuidados = '{"suelo": ["Suelo arcilloso o franco, tolera suelos pisoteados y pesados."], "ambiente": ["Sol directo o semisombra, clima templado a frío andino."], "abono": ["Poco exigente; compost ligero en primavera."], "extras": ["Cosechar las hojas inferiores bien desarrolladas para cataplasmas o infusiones."]}'::jsonb,
      fases = json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Llanten/llanten1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Llanten/llanten2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Llanten/llanten3.png'),
        json_build_object('fase', 4, 'nombre', 'Espiga Floral', 'imagen', base_url || 'Llanten/llanten4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Llanten/llanten5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Llanten/llanten6.png', 'muerta', true)
      )::jsonb
    WHERE LOWER(nombre_comun) = 'llantén' OR LOWER(nombre_comun) = 'llanten';
  END IF;

  -- 15. MALVA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Malvaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'malva') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Malva', 'Malva sylvestris', 'Malva común andina', 1500, 3300, 'Bianual (60-90 días)', 'Sierra',
      'Planta medicinal tradicional de la serranía ecuatoriana rica en mucílagos calmantes para la irritación de garganta y piel.',
      base_url || 'Malva/malva5.png',
      base_url || 'Malva/malva6.png',
      '{"suelo": ["Suelo profundo, fresco y nitrogenado."], "ambiente": ["Pleno sol o semisombra ligera en valles andinos."], "abono": ["Estiércol ovino o vacuno descompuesto al sembrar."], "extras": ["Recolectar las flores a media mañana cuando los pétalos estén abiertos y secos."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Malva/malva1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Malva/malva2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Malva/malva3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Malva/malva4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Malva/malva5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Malva/malva6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 16. MANZANILLA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Asteraceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'manzanilla') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Manzanilla', 'Matricaria chamomilla', 'Camomila', 1000, 3100, 'Anual (60-90 días)', 'Sierra',
      'Flores aromáticas de pétalos blancos y centro amarillo. Infusión predilecta en Ecuador para aliviar cólicos y conciliar el sueño.',
      base_url || 'Manzanilla/manzanilla5.png',
      base_url || 'Manzanilla/manzanilla6.png',
      '{"suelo": ["Suelo ligero, bien drenado, con pH neutro."], "ambiente": ["Pleno sol para maximizar la concentración de aceites esenciales en la flor."], "abono": ["Compost maduro ligero; evitar exceso de nitrógeno que reduce la floración."], "extras": ["Cosechar las cabezuelas florales en días soleados cuando estén horizontales."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Manzanilla/manzanilla1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Manzanilla/manzanilla2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Manzanilla/manzanilla3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Manzanilla/manzanilla4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Manzanilla/manzanilla5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Manzanilla/manzanilla6.png', 'muerta', true)
      )::jsonb);
  ELSE
    UPDATE huertos.planta SET 
      imagen = base_url || 'Manzanilla/manzanilla5.png',
      imagen_muerta = base_url || 'Manzanilla/manzanilla6.png',
      region = 'Sierra',
      descripcion = 'Flores aromáticas de pétalos blancos y centro amarillo. Infusión predilecta en Ecuador para aliviar cólicos y conciliar el sueño.',
      cuidados = '{"suelo": ["Suelo ligero, bien drenado, con pH neutro."], "ambiente": ["Pleno sol para maximizar la concentración de aceites esenciales en la flor."], "abono": ["Compost maduro ligero; evitar exceso de nitrógeno que reduce la floración."], "extras": ["Cosechar las cabezuelas florales en días soleados cuando estén horizontales."]}'::jsonb,
      fases = json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Manzanilla/manzanilla1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Manzanilla/manzanilla2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Manzanilla/manzanilla3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Manzanilla/manzanilla4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Manzanilla/manzanilla5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Manzanilla/manzanilla6.png', 'muerta', true)
      )::jsonb
    WHERE LOWER(nombre_comun) = 'manzanilla';
  END IF;

  -- 17. MARACUYÁ
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Passifloraceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'maracuyá' OR LOWER(nombre_comun) = 'maracuya') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Maracuyá', 'Passiflora edulis', 'Fruta de la pasión', 0, 1500, 'Perenne (150-210 días)', 'Costa / Valles',
      'Enredadera trepadora emblemática del litoral ecuatoriano, produce frutos cítricos y perfumados ricos en vitamina C y carotenos.',
      base_url || 'Maracuya/maracuya5.png',
      base_url || 'Maracuya/maracuya6.png',
      '{"suelo": ["Suelo profundo, permeable, rico en materia orgánica."], "ambiente": ["Clima cálido con insolación constante, requiere espaldera o alambrado de guía."], "abono": ["Abono rico en fósforo y potasio en floración."], "extras": ["Polinización manual o mediante abejorros para elevar el cuajado de frutos."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Maracuya/maracuya1.png'),
        json_build_object('fase', 2, 'nombre', 'Guía Trepadora', 'imagen', base_url || 'Maracuya/maracuya2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Maracuya/maracuya3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Maracuya/maracuya4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Maracuya/maracuya5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Maracuya/maracuya6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 18. MATICO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Piperaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'matico') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Matico', 'Piper carpunya', 'Hierba del soldado, Guayusa de monte', 500, 2600, 'Perenne (90-120 días)', 'Sierra / Valles',
      'Arbusto medicinal nativo de Ecuador con hojas aromáticas rugosas. Poderoso cicatrizante natural, antibacteriano y digestivo.',
      base_url || 'Matico/matico5.png',
      base_url || 'Matico/matico6.png',
      '{"suelo": ["Suelo húmedo, con buen contenido orgánico y mantillo."], "ambiente": ["Semisombra en quebradas y valles interandinos templados."], "abono": ["Compost de bosque o abono verde dos veces al año."], "extras": ["Las hojas enteras son utilizadas en baños postparto y curación de heridas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Matico/matico1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Matico/matico2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Matico/matico3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración en Espiga', 'imagen', base_url || 'Matico/matico4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Matico/matico5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Matico/matico6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 19. ORÉGANO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'orégano' OR LOWER(nombre_comun) = 'oregano') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Orégano', 'Origanum vulgare', 'Orégano silvestre', 1000, 2800, 'Perenne (60-90 días)', 'Sierra / Valles',
      'Hierba aromática indispensable en la gastronomía andina. Sus hojas secas poseen gran poder antimicrobiano y sabor penetrante.',
      base_url || 'Oregano/oregano5.png',
      base_url || 'Oregano/oregano6.png',
      '{"suelo": ["Suelo seco, pedregoso o calcáreo con excelente drenaje."], "ambiente": ["Sol pleno, soporta sequías moderadas y calor interandino."], "abono": ["Abonado ligero al inicio de la siembra."], "extras": ["Cosechar tallos justo antes de que abran sus flores para conservar más aroma."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Oregano/oregano1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Oregano/oregano2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Oregano/oregano3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Oregano/oregano4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Oregano/oregano5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Oregano/oregano6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 20. ORTIGA NEGRA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Urticaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'ortiga negra' OR LOWER(nombre_comun) = 'ortiga_negra') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Ortiga Negra', 'Urtica urens', 'Ortiga menor andina, Pringamoza', 1800, 3800, 'Anual (50-70 días)', 'Sierra / Páramo',
      'Planta medicinal andina sagrada en la cosmovisión indígena para baños de energía y limpias. Excepcional aporte de hierro y depuración sanguínea.',
      base_url || 'Ortiga_negra/ortiganegra5.png',
      base_url || 'Ortiga_negra/ortiganegra6.png',
      '{"suelo": ["Suelo muy rico en nitrógeno, húmedo y fresco."], "ambiente": ["Clima frío andino, semisombra o sol protegido de heladas secas."], "abono": ["Compost fresco y tierra negra de páramo."], "extras": ["Manipular con guantes gruesos para evitar el ardor de sus tricomas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Ortiga_negra/ortiganegra1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Ortiga_negra/ortiganegra2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Ortiga_negra/ortiganegra3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Ortiga_negra/ortiganegra4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Ortiga_negra/ortiganegra5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Ortiga_negra/ortiganegra6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 21. ROMERO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'romero') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Romero', 'Salvia rosmarinus', 'Romero de castilla', 1000, 3000, 'Perenne (90-120 días)', 'Sierra',
      'Arbusto leñoso aromático de follaje perenne. Estimulante de la memoria, tónico circulatorio y condimento insustituible.',
      base_url || 'Romero/romero5.png',
      base_url || 'Romero/romero6.png',
      '{"suelo": ["Suelo calizo, arenoso, seco y muy bien aireado."], "ambiente": ["Pleno sol, resistente al viento andino y sequías prolongadas."], "abono": ["Abono orgánico mínimo; no le gusta el exceso de abono."], "extras": ["Evitar el riego excesivo, es la causa principal de pudrición radicular."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Esqueje', 'imagen', base_url || 'Romero/romero1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Romero/romero2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Romero/romero3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Romero/romero4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Romero/romero5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Romero/romero6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 22. RUDA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Rutaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'ruda') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Ruda', 'Ruta graveolens', 'Ruda andina hembra/macho', 1200, 3100, 'Perenne (90-120 días)', 'Sierra',
      'Planta medicinal y protectora ancestral en la tradición ecuatoriana. Su potente aroma aleja plagas de insectos en el huerto.',
      base_url || 'Ruda/ruda5.png',
      base_url || 'Ruda/ruda6.png',
      '{"suelo": ["Suelo alcalino o neutro, moderadamente seco y bien drenado."], "ambiente": ["Pleno sol, tolera fríos moderados de la serranía."], "abono": ["Compost de lombriz en baja cantidad."], "extras": ["Sembrar cerca de los accesos del huerto como barrera fitosanitaria natural."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Ruda/ruda1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Ruda/ruda2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Ruda/ruda3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Ruda/ruda4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Ruda/ruda5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Ruda/ruda6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 23. SÁBILA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Asphodelaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'sábila' OR LOWER(nombre_comun) = 'sabila') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Sábila', 'Aloe vera', 'Aloe', 0, 2600, 'Perenne (180-240 días)', 'Costa / Valles',
      'Planta suculenta de pencas carnosas con gel regenerador celular, cicatrizante y depurador del tracto gastrointestinal.',
      base_url || 'Sabila/sabila5.png',
      base_url || 'Sabila/sabila6.png',
      '{"suelo": ["Suelo arenoso, poroso y con drenaje rápido."], "ambiente": ["Sol directo, clima seco a templado, proteger de heladas intensas."], "abono": ["Aporte orgánico superficial una vez por año."], "extras": ["Regar únicamente cuando el sustrato esté completamente seco."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Hijuelo', 'imagen', base_url || 'Sabila/sabila1.png'),
        json_build_object('fase', 2, 'nombre', 'Enraizamiento', 'imagen', base_url || 'Sabila/sabila2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Sabila/sabila3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Sabila/sabila4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Sabila/sabila5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Sabila/sabila6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 24. SANGRE DE DRAGO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Euphorbiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'sangre de drago' OR LOWER(nombre_comun) = 'sangre_de_drago') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Sangre de Drago', 'Croton lechleri', 'Drago, Esi', 100, 1800, 'Perenne (180-360 días)', 'Amazonía / Sierra baja',
      'Árbol nativo ecuatoriano cuya resina de color rojo oscuro es uno de los cicatrizantes y antivirales naturales más potentes del planeta.',
      base_url || 'Sangre_de_drago/sangre_de_drago5.png',
      base_url || 'Sangre_de_drago/sangre_de_drago6.png',
      '{"suelo": ["Suelo arcilloso-arenoso de bosque tropical, rico en humus."], "ambiente": ["Alta humedad, clima cálido o montano bajo, sol pleno a semisombra."], "abono": ["Mulch orgánico de corteza y hojarasca."], "extras": ["La resina se extrae de manera sustentable con cortes diagonales finos en corteza."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago3.png'),
        json_build_object('fase', 4, 'nombre', 'Desarrollo', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Sangre_de_drago/sangre_de_drago6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 25. SAÚCO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Adoxaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'saúco' OR LOWER(nombre_comun) = 'sauco') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Saúco', 'Sambucus nigra subsp. peruviana', 'Tilo andino, Rayán', 2000, 3600, 'Perenne (120-180 días)', 'Sierra',
      'Árbol frutal y medicinal de los valles interandinos. Con sus bayas moradas se elaboran mermeladas y con sus flores blancas jarabes para la tos.',
      base_url || 'Sauco/sauco5.png',
      base_url || 'Sauco/sauco6.png',
      '{"suelo": ["Suelo húmedo, profundo, rico en humus y nitrógeno."], "ambiente": ["Clima frío y templado andino, resiste viento y heladas ligeras."], "abono": ["Compostaje de estiércol y ceniza en la base del tronco."], "extras": ["Poda invernal para abrir la copa y facilitar la recolección de las umbelas."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Sauco/sauco1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Sauco/sauco2.png'),
        json_build_object('fase', 3, 'nombre', 'Crecimiento', 'imagen', base_url || 'Sauco/sauco3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración Blanca', 'imagen', base_url || 'Sauco/sauco4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Sauco/sauco5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Sauco/sauco6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 26. TOMILLO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'tomillo') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Tomillo', 'Thymus vulgaris', 'Tomillo común', 1200, 3000, 'Perenne (60-90 días)', 'Sierra / Valles',
      'Planta rastrera leñosa aromática de hojas diminutas ricas en timol. Excelente antiséptico respiratorio y aderezo gastronómico.',
      base_url || 'Tomillo/tomillo5.png',
      base_url || 'Tomillo/tomillo6.png',
      '{"suelo": ["Suelo seco, pedregoso, calcáreo y muy bien drenado."], "ambiente": ["Pleno sol, tolera calor y vientos secos."], "abono": ["Abono mínimo; prefiere suelos pobres."], "extras": ["Recortar tras la floración para mantener la mata compacta y tupida."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Tomillo/tomillo1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Tomillo/tomillo2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Tomillo/tomillo3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Tomillo/tomillo4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Tomillo/tomillo5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Tomillo/tomillo6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 27. TORONJIL
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Lamiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Hierba aromática' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'toronjil') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Toronjil', 'Melissa officinalis', 'Melisa, Hierba de limón', 1200, 2900, 'Perenne (60-90 días)', 'Sierra',
      'Hierba perenne de agradable aroma alimonado. Aliada ancestral para la calma del sistema nervioso, estrés y palpitaciones.',
      base_url || 'Toronjil/toronjil5.png',
      base_url || 'Toronjil/toronjil6.png',
      '{"suelo": ["Suelo ligero, húmedo y enriquecido con mantillo."], "ambiente": ["Semisombra o sol suave matinal en climas andinos templados."], "abono": ["Humus de lombriz cada dos meses en época vegetativa."], "extras": ["Cosechar las hojas antes de la floración para aprovechar su máxima fragancia."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Toronjil/toronjil1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Toronjil/toronjil2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Toronjil/toronjil3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Toronjil/toronjil4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Toronjil/toronjil5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Toronjil/toronjil6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 28. UÑA DE GATO
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Rubiaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'uña de gato' OR LOWER(nombre_comun) = 'una_de_gato') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Uña de Gato', 'Uncaria tomentosa', 'Garabato, Samento', 100, 1500, 'Perenne (180-360 días)', 'Amazonía / Sierra baja',
      'Liana medicinal andino-amazónica provista de espinas curvadas. Reconocida mundialmente por su capacidad inmunoestimulante y antiinflamatoria.',
      base_url || 'Una_de_gato/una_de_gato5.png',
      base_url || 'Una_de_gato/una_de_gato6.png',
      '{"suelo": ["Suelo fértil de bosque húmedo, profundo y arcillo-arenoso."], "ambiente": ["Calor tropical a subtropical húmedo, requiere soporte o árbol tutor para trepar."], "abono": ["Materia orgánica boscosa en superficie."], "extras": ["Se recolecta la corteza externa madura preservando la vida de la planta."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Brote', 'imagen', base_url || 'Una_de_gato/una_de_gato1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula con Espinas', 'imagen', base_url || 'Una_de_gato/una_de_gato2.png'),
        json_build_object('fase', 3, 'nombre', 'Guía Trepadora', 'imagen', base_url || 'Una_de_gato/una_de_gato3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración', 'imagen', base_url || 'Una_de_gato/una_de_gato4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Una_de_gato/una_de_gato5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Una_de_gato/una_de_gato6.png', 'muerta', true)
      )::jsonb);
  END IF;

  -- 29. VALERIANA
  SELECT id_familia INTO v_fam FROM huertos.familia_botanica WHERE nombre = 'Caprifoliaceae' LIMIT 1;
  SELECT id_tipo_planta INTO v_tipo FROM huertos.tipo_planta WHERE nombre = 'Planta medicinal' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM huertos.planta WHERE LOWER(nombre_comun) = 'valeriana') THEN
    INSERT INTO huertos.planta (id_familia, id_tipo_planta, nombre_comun, nombre_cientifico, nombre_alternativo, altitud_minima, altitud_maxima, ciclo_cultivo, region, descripcion, imagen, imagen_muerta, cuidados, fases)
    VALUES (v_fam, v_tipo, 'Valeriana', 'Valeriana officinalis', 'Hierba de los gatos andina', 1800, 3600, 'Perenne (90-120 días)', 'Sierra / Páramo',
      'Planta medicinal andina perenne cuyas raíces acumulan valepotriatos y aceites calmantes. El remedio por excelencia para el insomnio y la tensión nerviosa.',
      base_url || 'Valeriana/valeriana5.png',
      base_url || 'Valeriana/valeriana6.png',
      '{"suelo": ["Suelo húmedo, suelto, rico en turba y compost orgánico."], "ambiente": ["Clima frío andino, semisombra o exposición a sol suave."], "abono": ["Compost de lombriz y acolchado vegetal."], "extras": ["Recolectar las raíces y rizomas en otoño/verano andino cuando la parte aérea comience a marchitarse."]}'::jsonb,
      json_build_array(
        json_build_object('fase', 1, 'nombre', 'Germinación', 'imagen', base_url || 'Valeriana/valeriana1.png'),
        json_build_object('fase', 2, 'nombre', 'Plántula', 'imagen', base_url || 'Valeriana/valeriana2.png'),
        json_build_object('fase', 3, 'nombre', 'Desarrollo', 'imagen', base_url || 'Valeriana/valeriana3.png'),
        json_build_object('fase', 4, 'nombre', 'Floración Rosa', 'imagen', base_url || 'Valeriana/valeriana4.png'),
        json_build_object('fase', 5, 'nombre', 'Cosecha', 'imagen', base_url || 'Valeriana/valeriana5.png'),
        json_build_object('fase', 6, 'nombre', 'Marchita', 'imagen', base_url || 'Valeriana/valeriana6.png', 'muerta', true)
      )::jsonb);
  END IF;

END $$;

COMMIT;
