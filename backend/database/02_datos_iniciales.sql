-- =============================================================================
-- SCRIPT DE DATOS INICIALES (SEED DATA)
-- Proyecto: Sistema de Gestión Agrícola con Gamificación (Huertos.ec)
-- Rama: emilio_llenar_datos
-- SGBD destino: PostgreSQL 12 o superior
--
-- NOTA: Este script es IDEMPOTENTE. Puede ejecutarse múltiples veces de forma
-- segura sin duplicar registros ni violar restricciones de clave primaria/única.
--
-- DISTRIBUCIÓN:
-- 1. 3 Gremios comunitarios ubicados en Quito (Pichincha), Cuenca (Azuay) y Ambato (Tungurahua).
--    (Pichincha, Azuay y Tungurahua).
-- 2. 12 Usuarios únicos (4 por gremio, sin repetición, progresión completa:
--    Maestro, Oficial, Aprendiz y Novato).
-- 3. Membresías por gremio (12 miembros).
-- 4. 3 Huertos comunitarios con parámetros técnicos.
-- 5. Historial de puntos (snapshots cronológicos para gráficas de evolución).
-- =============================================================================

-- =============================================================================
-- 1. GREMIOS COMUNITARIOS (Tabla: Gremio)
-- =============================================================================
INSERT INTO Gremio (Nombre_Gremio, Area_total, Puntos_Gremio, Ubicacion_Geografica)
SELECT 'Gremio Huerto San Francisco', 450.00, 450, 'Quito, Pichincha (Lat: -0.1807, Lng: -78.4678)'
WHERE NOT EXISTS (SELECT 1 FROM Gremio WHERE Nombre_Gremio = 'Gremio Huerto San Francisco');

INSERT INTO Gremio (Nombre_Gremio, Area_total, Puntos_Gremio, Ubicacion_Geografica)
SELECT 'Sembradores del Tomebamba', 320.50, 320, 'Cuenca, Azuay (Lat: -2.9001, Lng: -79.0059)'
WHERE NOT EXISTS (SELECT 1 FROM Gremio WHERE Nombre_Gremio = 'Sembradores del Tomebamba');

INSERT INTO Gremio (Nombre_Gremio, Area_total, Puntos_Gremio, Ubicacion_Geografica)
SELECT 'Guardianes de la Tierra Tungurahua', 580.00, 210, 'Ambato, Tungurahua (Lat: -1.2491, Lng: -78.6168)'
WHERE NOT EXISTS (SELECT 1 FROM Gremio WHERE Nombre_Gremio = 'Guardianes de la Tierra Tungurahua');


-- =============================================================================
-- 2. IDENTIDADES BASE (Tabla: Usuario) - 12 USUARIOS ÚNICOS
-- =============================================================================

-- --- GRUPO 1: Usuarios para Gremio Huerto San Francisco (Quito, Pichincha) ---
INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'patricia_reyes', '1985-09-30', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'patricia_reyes');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'juanito_perez', '1995-04-12', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'juanito_perez');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'carlos_andrade', '2001-11-05', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'carlos_andrade');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'gabriel_mendoza', '2003-06-21', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'gabriel_mendoza');

-- --- GRUPO 2: Usuarios para Sembradores del Tomebamba (Cuenca, Azuay) ---
INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'maria_quispe', '1988-08-23', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'maria_quispe');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'esteban_vintimilla', '1992-03-14', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'esteban_vintimilla');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'lucia_serrano', '2000-12-04', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'lucia_serrano');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'diego_alvarez', '2004-07-19', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'diego_alvarez');

-- --- GRUPO 3: Usuarios para Guardianes de la Tierra Tungurahua (Ambato, Tungurahua) ---
INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'rosa_vallejo', '1980-05-16', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'rosa_vallejo');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'jorge_pazmino', '1994-10-27', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'jorge_pazmino');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'elena_moran', '1999-02-18', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'elena_moran');

INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'mateo_solis', '2002-08-09', 'M'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'mateo_solis');

-- --- USUARIO ADMINISTRATIVO / MINISTERIO (Tabla: Usuario + Usuario_Ministerio) ---
INSERT INTO Usuario (Nombre_Usuario, Fecha_Nacimiento, Genero)
SELECT 'carmen_mag_supervisor', '1982-04-10', 'F'
WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE Nombre_Usuario = 'carmen_mag_supervisor');

INSERT INTO Usuario_Ministerio (ID_usuario, Cargo)
SELECT u.ID_usuario, 'Especialista Zonal de Agricultura Familiar y Huertos Comunitarios - MAG'
FROM Usuario u WHERE u.Nombre_Usuario = 'carmen_mag_supervisor'
  AND NOT EXISTS (SELECT 1 FROM Usuario_Ministerio um WHERE um.ID_usuario = u.ID_usuario);


-- =============================================================================
-- 3. USUARIOS GENERALES CON GAMIFICACIÓN (Tabla: Usuario_General)
-- Convención de rangos / roles del sistema:
--   - Novato (0 - 49 pts)
--   - Aprendiz (50 - 99 pts)
--   - Oficial (100 - 299 pts)
--   - Maestro (300+ pts)
-- =============================================================================

-- --- Perfiles Grupo 1 (Quito - Pichincha) ---
INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Permacultura andina y banco de semillas nativas', 340, 'Maestro'
FROM Usuario u WHERE u.Nombre_Usuario = 'patricia_reyes'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Cultivo de hortalizas y compostaje urbano', 130, 'Oficial'
FROM Usuario u WHERE u.Nombre_Usuario = 'juanito_perez'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Instalación de riego por goteo y preparación de suelo', 45, 'Aprendiz'
FROM Usuario u WHERE u.Nombre_Usuario = 'carlos_andrade'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Elaboración de biofertilizantes y deshierbe', 20, 'Novato'
FROM Usuario u WHERE u.Nombre_Usuario = 'gabriel_mendoza'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

-- --- Perfiles Grupo 2 (Cuenca - Azuay) ---
INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Medicina ancestral andina y plantas aromáticas', 320, 'Maestro'
FROM Usuario u WHERE u.Nombre_Usuario = 'maria_quispe'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Manejo agroecológico de frutales de hueso', 185, 'Oficial'
FROM Usuario u WHERE u.Nombre_Usuario = 'esteban_vintimilla'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Diseño de terrazas y bancales elevados', 60, 'Aprendiz'
FROM Usuario u WHERE u.Nombre_Usuario = 'lucia_serrano'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Siembra de maíz y leguminosas andinas', 15, 'Novato'
FROM Usuario u WHERE u.Nombre_Usuario = 'diego_alvarez'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

-- --- Perfiles Grupo 3 (Ambato - Tungurahua) ---
INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Conservación de suelos volcánicos y rotación de cultivos', 380, 'Maestro'
FROM Usuario u WHERE u.Nombre_Usuario = 'rosa_vallejo'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Manejo integrado de plagas con bioinsumos', 140, 'Oficial'
FROM Usuario u WHERE u.Nombre_Usuario = 'jorge_pazmino'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Control agroecológico de plagas e hidroponía', 75, 'Aprendiz'
FROM Usuario u WHERE u.Nombre_Usuario = 'elena_moran'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);

INSERT INTO Usuario_General (ID_usuario, Talento, Puntos, Rol_Gremio)
SELECT u.ID_usuario, 'Compostaje térmico y recolección de restos orgánicos', 25, 'Novato'
FROM Usuario u WHERE u.Nombre_Usuario = 'mateo_solis'
  AND NOT EXISTS (SELECT 1 FROM Usuario_General ug WHERE ug.ID_usuario = u.ID_usuario);


-- =============================================================================
-- 4. MIEMBROS POR GREMIO (Tabla: Miembro_Gremio) - 4 MIEMBROS ÚNICOS POR GREMIO
-- =============================================================================

-- --- Miembros de: Sembradores de Ficoa - Ambato ---
INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2025-10-10', 'Líder de Gremio'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'patricia_reyes' AND g.Nombre_Gremio = 'Gremio Huerto San Francisco'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-01-15', 'Coordinador de Parcela'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'juanito_perez' AND g.Nombre_Gremio = 'Gremio Huerto San Francisco'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-02-01', 'Técnico de Riego'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'carlos_andrade' AND g.Nombre_Gremio = 'Gremio Huerto San Francisco'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-03-15', 'Miembro Colaborador'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'gabriel_mendoza' AND g.Nombre_Gremio = 'Gremio Huerto San Francisco'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

-- --- Miembros de: Huerto Comunitario Pelileo ---
INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2025-11-10', 'Líder de Gremio'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'maria_quispe' AND g.Nombre_Gremio = 'Sembradores del Tomebamba'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2025-12-01', 'Encargado de Frutales'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'esteban_vintimilla' AND g.Nombre_Gremio = 'Sembradores del Tomebamba'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-01-20', 'Miembro Activo'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'lucia_serrano' AND g.Nombre_Gremio = 'Sembradores del Tomebamba'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-04-05', 'Miembro Aprendiz'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'diego_alvarez' AND g.Nombre_Gremio = 'Sembradores del Tomebamba'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

-- --- Miembros de: Guardianes del Valle de Patate ---
INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2025-09-01', 'Líder de Gremio'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'rosa_vallejo' AND g.Nombre_Gremio = 'Guardianes de la Tierra Tungurahua'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2025-10-20', 'Coordinador Fitosanitario'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'jorge_pazmino' AND g.Nombre_Gremio = 'Guardianes de la Tierra Tungurahua'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-02-15', 'Miembro Activo'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'elena_moran' AND g.Nombre_Gremio = 'Guardianes de la Tierra Tungurahua'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);

INSERT INTO Miembro_Gremio (ID_usuario, ID_gremio, Fecha_ingreso, Rol)
SELECT u.ID_usuario, g.ID_gremio, '2026-03-25', 'Auxiliar de Parcela'
FROM Usuario u, Gremio g
WHERE u.Nombre_Usuario = 'mateo_solis' AND g.Nombre_Gremio = 'Guardianes de la Tierra Tungurahua'
  AND NOT EXISTS (SELECT 1 FROM Miembro_Gremio mg WHERE mg.ID_usuario = u.ID_usuario AND mg.ID_gremio = g.ID_gremio);


-- =============================================================================
-- 5. HUERTOS COMUNITARIOS (Tabla: Huerto)
-- Parámetros según catálogos existentes en sistema_agricola_gamificacion.sql:
--   Cerca/SubCerca: (1, 1: Perimetral madera), (1, 2: Perimetral malla), (3, 4: Seto vivo ciprés)
--   Abono: (1: Orgánico), (3: Verde), (4: Compost)
--   Suelo: (1: Arcilloso), (3: Franco)
--   Riego: (1: Goteo), (2: Aspersión), (3: Manual)
--   Diseño/SubDiseño: (1, 1: Rectangular simple), (2, 3: Circular concéntrico), (3, 4: Terrazas escalonadas)
-- =============================================================================

-- Huerto 1: Gremio Huerto San Francisco (Quito)
INSERT INTO Huerto (ID_gremio, ID_Cerca, ID_SubCerca, ID_Abono, ID_Suelo, ID_Riego, ID_Diseño, ID_SubDiseño)
SELECT g.ID_gremio, 1, 1, 4, 3, 1, 1, 1
FROM Gremio g
WHERE g.Nombre_Gremio = 'Gremio Huerto San Francisco'
  AND NOT EXISTS (
      SELECT 1 FROM Huerto h WHERE h.ID_gremio = g.ID_gremio
  );

-- Huerto 2: Sembradores del Tomebamba (Cuenca)
INSERT INTO Huerto (ID_gremio, ID_Cerca, ID_SubCerca, ID_Abono, ID_Suelo, ID_Riego, ID_Diseño, ID_SubDiseño)
SELECT g.ID_gremio, 3, 4, 1, 1, 2, 3, 4
FROM Gremio g
WHERE g.Nombre_Gremio = 'Sembradores del Tomebamba'
  AND NOT EXISTS (
      SELECT 1 FROM Huerto h WHERE h.ID_gremio = g.ID_gremio
  );

-- Huerto 3: Guardianes de la Tierra Tungurahua (Ambato)
INSERT INTO Huerto (ID_gremio, ID_Cerca, ID_SubCerca, ID_Abono, ID_Suelo, ID_Riego, ID_Diseño, ID_SubDiseño)
SELECT g.ID_gremio, 1, 2, 3, 3, 3, 2, 3
FROM Gremio g
WHERE g.Nombre_Gremio = 'Guardianes de la Tierra Tungurahua'
  AND NOT EXISTS (
      SELECT 1 FROM Huerto h WHERE h.ID_gremio = g.ID_gremio
  );


-- =============================================================================
-- 6. HISTORIAL DE PUNTOS (Tabla: Historial_Puntos)
-- Snapshots cronológicos del puntaje acumulado para gráficas temporales y evolución.
-- =============================================================================

-- --- Historial de Patricia Reyes (Maestro - 340 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-10-15 12:00:00'::timestamp, 50
FROM Usuario u WHERE u.Nombre_Usuario = 'patricia_reyes'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-10-15 12:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-11-30 12:00:00'::timestamp, 140
FROM Usuario u WHERE u.Nombre_Usuario = 'patricia_reyes'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-11-30 12:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-01-15 12:00:00'::timestamp, 230
FROM Usuario u WHERE u.Nombre_Usuario = 'patricia_reyes'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-01-15 12:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-03-01 12:00:00'::timestamp, 340
FROM Usuario u WHERE u.Nombre_Usuario = 'patricia_reyes'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-03-01 12:00:00'::timestamp);

-- --- Historial de Juanito Pérez (Oficial - 130 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-01-20 10:00:00'::timestamp, 25
FROM Usuario u WHERE u.Nombre_Usuario = 'juanito_perez'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-01-20 10:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-02-15 10:00:00'::timestamp, 65
FROM Usuario u WHERE u.Nombre_Usuario = 'juanito_perez'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-02-15 10:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-03-20 10:00:00'::timestamp, 100
FROM Usuario u WHERE u.Nombre_Usuario = 'juanito_perez'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-03-20 10:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-04-15 10:00:00'::timestamp, 130
FROM Usuario u WHERE u.Nombre_Usuario = 'juanito_perez'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-04-15 10:00:00'::timestamp);

-- --- Historial de María Quispe (Maestro - 320 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-11-20 09:00:00'::timestamp, 40
FROM Usuario u WHERE u.Nombre_Usuario = 'maria_quispe'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-11-20 09:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-12-30 09:00:00'::timestamp, 110
FROM Usuario u WHERE u.Nombre_Usuario = 'maria_quispe'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-12-30 09:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-02-15 09:00:00'::timestamp, 220
FROM Usuario u WHERE u.Nombre_Usuario = 'maria_quispe'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-02-15 09:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-04-01 09:00:00'::timestamp, 320
FROM Usuario u WHERE u.Nombre_Usuario = 'maria_quispe'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-04-01 09:00:00'::timestamp);

-- --- Historial de Rosa Vallejo (Maestro - 380 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-09-15 11:00:00'::timestamp, 60
FROM Usuario u WHERE u.Nombre_Usuario = 'rosa_vallejo'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-09-15 11:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2025-11-15 11:00:00'::timestamp, 160
FROM Usuario u WHERE u.Nombre_Usuario = 'rosa_vallejo'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2025-11-15 11:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-01-15 11:00:00'::timestamp, 270
FROM Usuario u WHERE u.Nombre_Usuario = 'rosa_vallejo'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-01-15 11:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-03-15 11:00:00'::timestamp, 380
FROM Usuario u WHERE u.Nombre_Usuario = 'rosa_vallejo'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-03-15 11:00:00'::timestamp);

-- --- Historial de Carlos Andrade (Aprendiz - 45 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-02-15 08:30:00'::timestamp, 15
FROM Usuario u WHERE u.Nombre_Usuario = 'carlos_andrade'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-02-15 08:30:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-03-25 08:30:00'::timestamp, 45
FROM Usuario u WHERE u.Nombre_Usuario = 'carlos_andrade'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-03-25 08:30:00'::timestamp);

-- --- Historial de Elena Morán (Aprendiz - 75 pts) ---
INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-02-20 14:00:00'::timestamp, 20
FROM Usuario u WHERE u.Nombre_Usuario = 'elena_moran'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-02-20 14:00:00'::timestamp);

INSERT INTO Historial_Puntos (ID_usuario, Fecha_Corte, Puntos_Corte)
SELECT u.ID_usuario, '2026-03-30 14:00:00'::timestamp, 75
FROM Usuario u WHERE u.Nombre_Usuario = 'elena_moran'
  AND NOT EXISTS (SELECT 1 FROM Historial_Puntos hp WHERE hp.ID_usuario = u.ID_usuario AND hp.Fecha_Corte = '2026-03-30 14:00:00'::timestamp);

-- =============================================================================
-- FIN DEL SCRIPT SEED
-- =============================================================================
