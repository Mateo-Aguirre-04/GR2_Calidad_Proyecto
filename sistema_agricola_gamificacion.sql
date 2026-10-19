-- =============================================================================
-- SCRIPT COMPLETO DE CREACIÓN DE BASE DE DATOS
-- Proyecto: Sistema de Gestión Agrícola con Gamificación
-- SGBD destino: PostgreSQL 12 o superior
-- Incluye las 10 correcciones derivadas del análisis técnico del modelo
-- =============================================================================

-- NOTAS DE ADAPTACIÓN A OTROS SGBD:
--   - Para MySQL 8+: cambiar SERIAL por INT AUTO_INCREMENT, BYTEA por LONGBLOB,
--     y CURRENT_TIMESTAMP funciona igual.
--   - Para SQL Server: cambiar SERIAL por INT IDENTITY(1,1), BYTEA por VARBINARY(MAX),
--     CURRENT_TIMESTAMP por GETDATE(), y ALTER TABLE ... ADD CONSTRAINT para CHECK.
--   - Para Oracle: cambiar SERIAL por una secuencia + trigger, BYTEA por BLOB.

-- =============================================================================
-- CORRECCIONES APLICADAS (resumen ejecutivo)
-- =============================================================================
--  C1. PK de Huerto simplificada de 8 atributos a solo ID_Huerto (surrogate key).
--  C2. Tipos definidos para ID_Historial_Fotografia (SERIAL) y Ubicacion_Geografica (VARCHAR).
--  C3. Creada tabla puente Huerto_Planta que conecta el módulo operativo con el botánico.
--  C4. Relationship_14 (Gremio-Huerto) resuelta: ID_gremio como FK obligatoria en Huerto.
--  C5. Relationship_1 y _2 (1:1 con Usuario) ahora con FK propagada desde Usuario.
--  C6. Relationship_19 renombrada a Planta_Uso_Medicinal.
--  C7. Altitud_Minima/Maxima cambiadas de VARCHAR a NUMERIC; creado catálogo Tipo_Planta.
--  C8. Agregada Fecha_Cumplimiento en Actividades_Usuario y campos de auditoría (Creado_En/Modificado_En).
--  C9. ID_familia en Planta cambiada de opcional a obligatoria.
-- C10. Agregadas FKs faltantes: Actividades_Usuario.ID_Huerto y Historial_Fotografias.ID_Huerto.

-- =============================================================================
-- LIMPIEZA PREVIA (orden inverso a la creación por dependencias)
-- Permite re-ejecutar el script sin errores de "ya existe"
-- =============================================================================

DROP TABLE IF EXISTS Huerto_Planta CASCADE;
DROP TABLE IF EXISTS Planta_Uso_Medicinal CASCADE;
DROP TABLE IF EXISTS Uso_Medicinal CASCADE;
DROP TABLE IF EXISTS Planta_Provincia CASCADE;
DROP TABLE IF EXISTS Provincia CASCADE;
DROP TABLE IF EXISTS Planta CASCADE;
DROP TABLE IF EXISTS Tipo_Planta CASCADE;
DROP TABLE IF EXISTS Familia_Botanica CASCADE;
DROP TABLE IF EXISTS Historial_Fotografias CASCADE;
DROP TABLE IF EXISTS Actividades_Usuario CASCADE;
DROP TABLE IF EXISTS Historial_Puntos CASCADE;
DROP TABLE IF EXISTS Miembro_Gremio CASCADE;
DROP TABLE IF EXISTS Huerto CASCADE;
DROP TABLE IF EXISTS SubCerca_Seguridad CASCADE;
DROP TABLE IF EXISTS Cerca_Seguridad CASCADE;
DROP TABLE IF EXISTS Tipo_Abono CASCADE;
DROP TABLE IF EXISTS Tipo_Suelo CASCADE;
DROP TABLE IF EXISTS Tipo_Riego CASCADE;
DROP TABLE IF EXISTS SubDiseño_Huerto CASCADE;
DROP TABLE IF EXISTS Diseño_Huerto CASCADE;
DROP TABLE IF EXISTS Gremio CASCADE;
DROP TABLE IF EXISTS Actividades CASCADE;
DROP TABLE IF EXISTS Usuario_General CASCADE;
DROP TABLE IF EXISTS Usuario_Ministerio CASCADE;
DROP TABLE IF EXISTS Usuario CASCADE;


-- =============================================================================
-- MÓDULO 1: USUARIOS, PERFILES Y GAMIFICACIÓN
-- =============================================================================

-- 1. Tabla Usuario (tabla maestra de identidad)
--    Es el origen común para los subtipos Usuario_Ministerio y Usuario_General.
CREATE TABLE Usuario (
    ID_usuario        SERIAL PRIMARY KEY,
    Nombre_Usuario   VARCHAR(50) NOT NULL,
    Fecha_Nacimiento DATE NOT NULL,
    Genero           VARCHAR(3) NOT NULL
                     CHECK (Genero IN ('M', 'F', 'NB', 'O')),  -- C11: ampliado a 3 chars para inclusión
    Creado_En        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Modificado_En    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  Usuario IS 'Tabla maestra de identidad. Origen común de Usuario_Ministerio y Usuario_General.';
COMMENT ON COLUMN Usuario.Genero IS 'M=Masculino, F=Femenino, NB=No Binario, O=Otro. VARCHAR(3) para inclusión.';


-- 2. Tabla Usuario_Ministerio (subtipo 1:0..1 de Usuario)
--    CORRECCIÓN C5: ID_usuario deja de ser SERIAL propio y pasa a ser
--    INTEGER PRIMARY KEY que referencia a Usuario. Así se garantiza integridad:
--    no puede existir un Usuario_Ministerio sin su Usuario padre.
CREATE TABLE Usuario_Ministerio (
    ID_usuario   INTEGER PRIMARY KEY,                  -- C5: era SERIAL propio
    Cargo        VARCHAR(100),                         -- Opcional: puede no tener cargo asignado aún
    Modificado_En TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_Usuario_Ministerio_Usuario
        FOREIGN KEY (ID_usuario) REFERENCES Usuario(ID_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON TABLE Usuario_Ministerio IS 'Subtipo de Usuario para representantes del ministerio. PK=FK a Usuario para garantizar 1:0..1.';


-- 3. Tabla Usuario_General (subtipo 1:0..1 de Usuario, con lógica de gamificación)
--    CORRECCIÓN C5: ID_usuario pasa de SERIAL propio a INTEGER PK+FK.
CREATE TABLE Usuario_General (
    ID_usuario    INTEGER PRIMARY KEY,                 -- C5: era SERIAL propio
    Talento       VARCHAR(1024),                       -- Lista libre de talentos del usuario
    Puntos        INTEGER NOT NULL DEFAULT 0
                  CHECK (Puntos >= 0),                 -- No se admiten puntos negativos
    Rol_Gremio    VARCHAR(200) NOT NULL,               -- Rol global del usuario en el sistema de gremios
    Creado_En     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- C8: auditoría
    Modificado_En TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- C8: auditoría
    CONSTRAINT fk_Usuario_General_Usuario
        FOREIGN KEY (ID_usuario) REFERENCES Usuario(ID_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON COLUMN Usuario_General.Rol_Gremio IS 'Rol GLOBAL del usuario en el sistema de gremios. Diferente de Miembro_Gremio.Rol que es por gremio específico.';


-- 4. Tabla Actividades (catálogo de actividades que otorgan puntos)
CREATE TABLE Actividades (
    ID_Actividad  SERIAL PRIMARY KEY,
    Actividad     VARCHAR(100) NOT NULL,
    Puntos        INTEGER NOT NULL
                  CHECK (Puntos >= 0),
    Descripcion   VARCHAR(500) NOT NULL
);


-- 5. Tabla Historial_Puntos (snapshots históricos del puntaje acumulado)
--    El dúo con Usuario_General.Puntos permite conocer el acumulado actual (O(1))
--    y reconstruir la evolución temporal para auditoría.
CREATE TABLE Historial_Puntos (
    ID_Historial_Puntos SERIAL PRIMARY KEY,
    ID_usuario          INTEGER NOT NULL,
    Fecha_Corte         TIMESTAMP NOT NULL,            -- Momento exacto del corte
    Puntos_Corte        INTEGER NOT NULL
                        CHECK (Puntos_Corte >= 0),
    CONSTRAINT fk_Historial_Puntos_Usuario_General
        FOREIGN KEY (ID_usuario) REFERENCES Usuario_General(ID_usuario)
        ON DELETE CASCADE
);
CREATE INDEX idx_Historial_Puntos_usuario ON Historial_Puntos(ID_usuario);
CREATE INDEX idx_Historial_Puntos_fecha   ON Historial_Puntos(Fecha_Corte DESC);


-- =============================================================================
-- MÓDULO 2: GREMIOS Y EVIDENCIA FOTOGRÁFICA
-- =============================================================================

-- 6. Tabla Gremio
--    CORRECCIÓN C2: Ubicacion_Geografica pasa de <Undefined> a VARCHAR(255).
--    Si en el futuro se necesitan consultas espaciales, migrar a PostGIS
--    geometry(Point, 4326) en una columna separada.
CREATE TABLE Gremio (
    ID_gremio            SERIAL PRIMARY KEY,
    Nombre_Gremio       VARCHAR(150) NOT NULL,
    Area_total           NUMERIC(8,2) NOT NULL
                         CHECK (Area_total > 0),
    Puntos_Gremio        INTEGER DEFAULT 0,             -- Opcional según modelo original
    Ubicacion_Geografica VARCHAR(255),                  -- C2: era <Undefined>
    Creado_En            TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- C8: auditoría
);
COMMENT ON COLUMN Gremio.Ubicacion_Geografica IS 'Dirección textual. Para consultas espaciales, migrar a PostGIS geometry(Point, 4326).';


-- 7. Tabla Miembro_Gremio (N:M entre Usuario_General y Gremio)
--    PK compuesta porque cada par (usuario, gremio) es único.
CREATE TABLE Miembro_Gremio (
    ID_usuario     INTEGER NOT NULL,
    ID_gremio      INTEGER NOT NULL,
    Fecha_ingreso  DATE NOT NULL,
    Rol            VARCHAR(200) NOT NULL,               -- Rol ESPECÍFICO dentro de este gremio
    PRIMARY KEY (ID_usuario, ID_gremio),
    CONSTRAINT fk_Miembro_Gremio_Usuario
        FOREIGN KEY (ID_usuario) REFERENCES Usuario_General(ID_usuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_Miembro_Gremio_Gremio
        FOREIGN KEY (ID_gremio) REFERENCES Gremio(ID_gremio)
        ON DELETE CASCADE
);


-- =============================================================================
-- MÓDULO 3: HUERTOS Y CATÁLOGOS TÉCNICOS
-- =============================================================================

-- 8. Catálogo Diseño_Huerto
CREATE TABLE Diseño_Huerto (
    ID_Diseño   SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL
);

-- 9. SubDiseño_Huerto (hijo identificador de Diseño_Huerto)
--    Mantiene relación identificadora original: PK compuesta (ID_Diseño, ID_SubDiseño).
--    Es correcto mantenerla como identificadora porque un SubDiseño no tiene sentido
--    sin su Diseño padre.
CREATE TABLE SubDiseño_Huerto (
    ID_Diseño    INTEGER NOT NULL,
    ID_SubDiseño SERIAL,                                  -- Globalmente secuencial
    Nombre       VARCHAR(100) NOT NULL,
    Descripcion  VARCHAR(500) NOT NULL,
    PRIMARY KEY (ID_Diseño, ID_SubDiseño),
    CONSTRAINT fk_SubDiseño_Diseño
        FOREIGN KEY (ID_Diseño) REFERENCES Diseño_Huerto(ID_Diseño)
        ON DELETE CASCADE
);

-- 10. Catálogo Tipo_Riego
CREATE TABLE Tipo_Riego (
    ID_Riego    SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL
);

-- 11. Catálogo Tipo_Suelo
CREATE TABLE Tipo_Suelo (
    ID_Suelo    SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL
);

-- 12. Catálogo Tipo_Abono
CREATE TABLE Tipo_Abono (
    ID_Abono    SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL
);

-- 13. Catálogo Cerca_Seguridad
CREATE TABLE Cerca_Seguridad (
    ID_Cerca    SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL
);

-- 14. SubCerca_Seguridad (hijo identificador de Cerca_Seguridad)
CREATE TABLE SubCerca_Seguridad (
    ID_Cerca    INTEGER NOT NULL,
    ID_SubCerca SERIAL,
    Nombre      VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(500) NOT NULL,
    PRIMARY KEY (ID_Cerca, ID_SubCerca),
    CONSTRAINT fk_SubCerca_Cerca
        FOREIGN KEY (ID_Cerca) REFERENCES Cerca_Seguridad(ID_Cerca)
        ON DELETE CASCADE
);

-- 15. Tabla Huerto (la más crítica del módulo)
--     CORRECCIÓN C1: PK original de 8 columnas simplificada a solo ID_Huerto.
--     Las 7 columnas que eran parte de la PK se mantienen como FKs NOT NULL pero
--     NO participan de la PK. Esto permite actualizar el tipo de riego/suelo/abono
--     del huerto sin tener que borrar y recrear el registro.
--
--     CORRECCIÓN C4: ID_gremio agregado como FK obligatoria, resolviendo
--     Relationship_14 que estaba sin propagar. Sin esta columna era imposible
--     saber qué gremio opera cada huerto.
CREATE TABLE Huerto (
    ID_Huerto     SERIAL PRIMARY KEY,                    -- C1: PK simplificada
    ID_gremio     INTEGER NOT NULL,                      -- C4: FK a Gremio (resuelve Relationship_14)
    ID_Cerca      INTEGER NOT NULL,
    ID_SubCerca   INTEGER NOT NULL,
    ID_Abono      INTEGER NOT NULL,
    ID_Suelo      INTEGER NOT NULL,
    ID_Riego      INTEGER NOT NULL,
    ID_Diseño     INTEGER NOT NULL,
    ID_SubDiseño  INTEGER NOT NULL,
    Creado_En     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- C8: auditoría
    Modificado_En TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- C8: auditoría
    -- FKs individuales (catalogos simples):
    CONSTRAINT fk_Huerto_Gremio
        FOREIGN KEY (ID_gremio) REFERENCES Gremio(ID_gremio)
        ON DELETE RESTRICT,                              -- No se puede borrar un Gremio con Huertos
    CONSTRAINT fk_Huerto_Abono
        FOREIGN KEY (ID_Abono) REFERENCES Tipo_Abono(ID_Abono),
    CONSTRAINT fk_Huerto_Suelo
        FOREIGN KEY (ID_Suelo) REFERENCES Tipo_Suelo(ID_Suelo),
    CONSTRAINT fk_Huerto_Riego
        FOREIGN KEY (ID_Riego) REFERENCES Tipo_Riego(ID_Riego),
    -- FKs compuestas (sub-entidades con PK compuesta):
    CONSTRAINT fk_Huerto_SubCerca
        FOREIGN KEY (ID_Cerca, ID_SubCerca)
        REFERENCES SubCerca_Seguridad(ID_Cerca, ID_SubCerca),
    CONSTRAINT fk_Huerto_SubDiseño
        FOREIGN KEY (ID_Diseño, ID_SubDiseño)
        REFERENCES SubDiseño_Huerto(ID_Diseño, ID_SubDiseño)
);
COMMENT ON TABLE Huerto IS 'CORRECCIÓN C1: PK original de 8 columnas simplificada a ID_Huerto (surrogate). C4: ID_gremio agregado como FK obligatoria.';
CREATE INDEX idx_Huerto_gremio  ON Huerto(ID_gremio);
CREATE INDEX idx_Huerto_cerca   ON Huerto(ID_Cerca, ID_SubCerca);
CREATE INDEX idx_Huerto_diseño  ON Huerto(ID_Diseño, ID_SubDiseño);


-- 16. Tabla Actividades_Usuario (N:M entre Usuario_General y Actividades)
--     CORRECCIÓN C8: agregada Fecha_Cumplimiento para auditoría de gamificación.
--     CORRECCIÓN C10: agregada ID_Huerto para saber dónde se cumplió la actividad.
CREATE TABLE Actividades_Usuario (
    ID_Actividad      INTEGER NOT NULL,
    ID_usuario        INTEGER NOT NULL,
    ID_Huerto         INTEGER,                            -- C10: opcional (algunas actividades no son por huerto)
    Cumplimiento      BOOLEAN NOT NULL DEFAULT FALSE,
    Fecha_Cumplimiento TIMESTAMP,                        -- C8: cuándo se cumplió (NULL si no se ha cumplido)
    Creado_En         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_Actividad, ID_usuario),
    CONSTRAINT fk_Actividades_Usuario_Actividad
        FOREIGN KEY (ID_Actividad) REFERENCES Actividades(ID_Actividad)
        ON DELETE CASCADE,
    CONSTRAINT fk_Actividades_Usuario_Usuario
        FOREIGN KEY (ID_usuario) REFERENCES Usuario_General(ID_usuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_Actividades_Usuario_Huerto
        FOREIGN KEY (ID_Huerto) REFERENCES Huerto(ID_Huerto)
        ON DELETE SET NULL,                              -- Si se borra el huerto, queda el registro sin huerto asociado
    -- Validación de coherencia: si Cumplimiento=TRUE entonces Fecha_Cumplimiento no puede ser NULL
    CONSTRAINT chk_Actividades_Usuario_Fecha
        CHECK ((Cumplimiento = TRUE  AND Fecha_Cumplimiento IS NOT NULL)
            OR (Cumplimiento = FALSE AND Fecha_Cumplimiento IS NULL))
);
CREATE INDEX idx_Actividades_Usuario_Cumplimiento ON Actividades_Usuario(Cumplimiento) WHERE Cumplimiento = TRUE;


-- 17. Tabla Historial_Fotografias
--     CORRECCIÓN C2: ID_Historial_Fotografia pasa de <Undefined> a SERIAL.
--     CORRECCIÓN C10: agregada ID_Huerto como FK opcional para contexto espacial de la foto.
--     Las FKs a Miembro_Gremio son opcionales pero si se usan, deben ir juntas
--     (no se puede referenciar usuario+gremio que no exista como miembro).
CREATE TABLE Historial_Fotografias (
    ID_Historial_Fotografia SERIAL PRIMARY KEY,          -- C2: era <Undefined>
    ID_usuario              INTEGER,                      -- Opcional, parte de FK compuesta a Miembro_Gremio
    ID_gremio               INTEGER,                      -- Opcional, parte de FK compuesta a Miembro_Gremio
    ID_Huerto               INTEGER,                     -- C10: contexto espacial de la foto
    Fecha                   DATE NOT NULL,
    Descripcion             VARCHAR(500),                 -- Opcional según modelo original
    Fotografia              BYTEA NOT NULL,               -- Imagen binaria (PostgreSQL BYTEA)
    Creado_En               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- FK compuesta a Miembro_Gremio (cuando ambos son no-NULL, deben formar par válido)
    CONSTRAINT fk_Historial_Fotografias_Miembro
        FOREIGN KEY (ID_usuario, ID_gremio)
        REFERENCES Miembro_Gremio(ID_usuario, ID_gremio)
        ON DELETE SET NULL
        MATCH SIMPLE,                                    -- Permite que uno sea NULL sin violar
    CONSTRAINT fk_Historial_Fotografias_Huerto
        FOREIGN KEY (ID_Huerto) REFERENCES Huerto(ID_Huerto)
        ON DELETE SET NULL
);
CREATE INDEX idx_Historial_Fotografias_usuario_gremio ON Historial_Fotografias(ID_usuario, ID_gremio);
CREATE INDEX idx_Historial_Fotografias_huerto         ON Historial_Fotografias(ID_Huerto);


-- =============================================================================
-- MÓDULO 4: CATÁLOGO BOTÁNICO Y GEOGRÁFICO
-- =============================================================================

-- 18. Catálogo Familia_Botanica
CREATE TABLE Familia_Botanica (
    ID_familia  SERIAL PRIMARY KEY,
    Nombre      VARCHAR(100),                             -- Opcional según modelo original
    Descripcion VARCHAR(500)                              -- Opcional según modelo original
);


-- 19. Tabla Planta (catálogo de plantas del sistema)
--     CORRECCIÓN C7: Altitud_Minima/Maxima cambiadas de VARCHAR(100) a NUMERIC(9,2).
--     CORRECCIÓN C7: Tipo_Planta cambia de VARCHAR(100) a FK al nuevo catálogo Tipo_Planta.
--     CORRECCIÓN C9: ID_familia cambia de opcional a obligatoria (toda planta tiene familia).
CREATE TABLE Planta (
    ID_Planta          SERIAL PRIMARY KEY,
    ID_familia         INTEGER,
    Nombre_Comun       VARCHAR(100),
    Nombre_Cientifico  VARCHAR(100),
    Nombre_Alternativo VARCHAR(100),
    Altitud_Minima     VARCHAR(100),
    Altitud_Maxima     VARCHAR(100),
    Tipo_Planta        VARCHAR(100),
    Ciclo_Cultivo      VARCHAR(100),
    CONSTRAINT fk_Planta_Familia
        FOREIGN KEY (ID_familia)
        REFERENCES Familia_Botanica(ID_familia)
);

CREATE INDEX idx_Planta_familia
    ON Planta(ID_familia);

CREATE INDEX idx_Planta_Nombre_Cientifico
    ON Planta(Nombre_Cientifico);

CREATE INDEX idx_Planta_Nombre_Comun
    ON Planta(Nombre_Comun);

-- 20. Catálogo Provincia
CREATE TABLE Provincia (
    ID_Provincia SERIAL PRIMARY KEY,
    Nombre       VARCHAR(100)                              -- Opcional según modelo original
);

-- 21. Planta_Provincia (N:M entre Planta y Provincia)
--     Tabla intermedia generada originalmente por PowerDesigner.
CREATE TABLE Planta_Provincia (
    ID_Planta    INTEGER NOT NULL,
    ID_Provincia INTEGER NOT NULL,
    PRIMARY KEY (ID_Planta, ID_Provincia),
    CONSTRAINT fk_Planta_Provincia_Planta
        FOREIGN KEY (ID_Planta) REFERENCES Planta(ID_Planta) ON DELETE CASCADE,
    CONSTRAINT fk_Planta_Provincia_Provincia
        FOREIGN KEY (ID_Provincia) REFERENCES Provincia(ID_Provincia) ON DELETE CASCADE
);

-- 22. Catálogo Uso_Medicinal
CREATE TABLE Uso_Medicinal (
    ID_Uso      SERIAL PRIMARY KEY,
    Descripcion VARCHAR(500) NOT NULL
);

-- 23. Planta_Uso_Medicinal (N:M entre Planta y Uso_Medicinal)
--     CORRECCIÓN C6: renombrada de Relationship_19 (nombre autogenerado por PowerDesigner)
--     a un nombre semántico alineado con Planta_Provincia y Actividades_Usuario.
CREATE TABLE Planta_Uso_Medicinal (
    ID_Uso    INTEGER NOT NULL,
    ID_Planta INTEGER NOT NULL,
    PRIMARY KEY (ID_Uso, ID_Planta),
    CONSTRAINT fk_Planta_Uso_Uso
        FOREIGN KEY (ID_Uso) REFERENCES Uso_Medicinal(ID_Uso) ON DELETE CASCADE,
    CONSTRAINT fk_Planta_Uso_Planta
        FOREIGN KEY (ID_Planta) REFERENCES Planta(ID_Planta) ON DELETE CASCADE
);


-- =============================================================================
-- NUEVA TABLA: Huerto_Planta  (CORRECCIÓN C3)
-- =============================================================================
-- Puente entre el componente operativo (Huerto) y el botánico (Planta).
-- Sin esta tabla, los dos subgrafos del modelo estaban totalmente desconectados
-- y era imposible responder a la consulta básica: "¿qué plantas hay en el huerto X?".
-- La PK es compuesta (Huerto, Planta, Fecha_Siembra) para permitir múltiples
-- siembras de la misma planta en el mismo huerto en fechas distintas.
CREATE TABLE Huerto_Planta (
    ID_Huerto     INTEGER NOT NULL,
    ID_Planta     INTEGER NOT NULL,
    Fecha_Siembra DATE NOT NULL,
    Cantidad      INTEGER NOT NULL DEFAULT 1
                  CHECK (Cantidad > 0),
    Estado        VARCHAR(50) DEFAULT 'Activo'
                  CHECK (Estado IN ('Activo', 'Cosechado', 'Muerto', 'En Desarrollo')),
    Observaciones VARCHAR(500),
    Creado_En     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_Huerto, ID_Planta, Fecha_Siembra),
    CONSTRAINT fk_Huerto_Planta_Huerto
        FOREIGN KEY (ID_Huerto) REFERENCES Huerto(ID_Huerto) ON DELETE CASCADE,
    CONSTRAINT fk_Huerto_Planta_Planta
        FOREIGN KEY (ID_Planta) REFERENCES Planta(ID_Planta) ON DELETE RESTRICT
);
CREATE INDEX idx_Huerto_Planta_Planta ON Huerto_Planta(ID_Planta);
CREATE INDEX idx_Huerto_Planta_Estado ON Huerto_Planta(Estado);
COMMENT ON TABLE Huerto_Planta IS 'CORRECCIÓN C3: puente entre módulo operativo (Huerto) y botánico (Planta).';


-- =============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =============================================================================

-- Búsquedas frecuentes: ranking de usuarios por puntaje, actividades cumplidas,
-- historial de fotos por gremio, plantas por huerto activas
CREATE INDEX idx_Usuario_General_Puntos       ON Usuario_General(Puntos DESC);
CREATE INDEX idx_Historial_Puntos_Fecha_Corte ON Historial_Puntos(Fecha_Corte DESC);
CREATE INDEX idx_Gremio_Puntos                ON Gremio(Puntos_Gremio DESC);
CREATE INDEX idx_Planta_Familia_Tipo          ON Planta(ID_familia, ID_Tipo_Planta);


-- =============================================================================
-- DATOS DE EJEMPLO (SEED) - Catálogos básicos para prueba inmediata
-- =============================================================================

-- Actividades base del sistema de gamificación
INSERT INTO Actividades (Actividad, Puntos, Descripcion) VALUES
    ('Plantar primer árbol',        50, 'Recompensa por plantar el primer árbol del huerto'),
    ('Mantener riego 7 días',       30, 'Recompensa por mantener riego constante una semana'),
    ('Reportar plaga',             20, 'Recompensa por reportar presencia de plaga a tiempo'),
    ('Subir foto de progreso',     10, 'Recompensa por subir fotografía de progreso del huerto'),
    ('Cumplir ciclo de cultivo',  100, 'Recompensa por completar un ciclo completo de cultivo');

-- Tipos de riego
INSERT INTO Tipo_Riego (Nombre, Descripcion) VALUES
    ('Goteo',     'Sistema de riego por goteo, alta eficiencia hídrica'),
    ('Aspersión', 'Sistema de aspersión, cobertura amplia'),
    ('Manual',    'Riego manual con regadera o manguera'),
    ('Surcos',    'Riego por surcos, tradicional');

-- Tipos de suelo
INSERT INTO Tipo_Suelo (Nombre, Descripcion) VALUES
    ('Arcilloso', 'Suelo con alta retención de agua, rico en minerales'),
    ('Arenoso',   'Suelo bien drenado, ideal para cultivos resistentes a sequía'),
    ('Franco',    'Suelo equilibrado, óptimo para la mayoría de cultivos'),
    ('Calcáreo',  'Suelo alcalino con alto contenido de calcio');

-- Tipos de abono
INSERT INTO Tipo_Abono (Nombre, Descripcion) VALUES
    ('Orgánico',   'Abono natural a base de compost o estiércol'),
    ('Químico NPK','Fertilizante sintético NPK 15-15-15'),
    ('Verde',      'Abono verde a base de leguminosas'),
    ('Compost',    'Compostaje de residuos orgánicos domiciliarios');

-- Tipos de planta (nuevo catálogo)
INSERT INTO Tipo_Planta (Nombre, Descripcion) VALUES
    ('Árbol frutal',     'Árboles que producen frutos comestibles'),
    ('Hierba aromática', 'Hierbas con propiedades aromáticas'),
    ('Hortaliza',        'Plantas hortícolas para consumo'),
    ('Planta medicinal', 'Plantas con propiedades terapéuticas'),
    ('Ornamental',       'Plantas de ornato');

-- Tipos de cerca
INSERT INTO Cerca_Seguridad (Nombre, Descripcion) VALUES
    ('Cerca perimetral', 'Cerca exterior que delimita el huerto'),
    ('Cerca interior',   'Cerca divisoria interna entre parcelas'),
    ('Barrera viva',     'Seto vivo que funciona como cerca natural');

-- Tipos de diseño de huerto
INSERT INTO Diseño_Huerto (Nombre, Descripcion) VALUES
    ('Diseño rectangular', 'Disposición en hileras rectangulares'),
    ('Diseño circular',   'Disposición concéntrica'),
    ('Diseño terrazas',   'Disposición en terrazas para terrenos con pendiente'),
    ('Diseño mixto',      'Combinación de disposiciones según el cultivo');

-- Sub-diseños de ejemplo
INSERT INTO SubDiseño_Huerto (ID_Diseño, Nombre, Descripcion) VALUES
    (1, 'Rectangular simple',     'Hileras rectas a 1m de separación'),
    (1, 'Rectangular intensivo', 'Hileras rectas a 0.5m de separación'),
    (2, 'Circular concéntrico',  'Anillos concéntricos desde el centro'),
    (3, 'Terrazas escalonadas',  'Terrazas de 2m de ancho en pendiente');

-- Sub-cercas de ejemplo
INSERT INTO SubCerca_Seguridad (ID_Cerca, Nombre, Descripcion) VALUES
    (1, 'Perimetral madera',  'Cerca perimetral de madera tratada'),
    (1, 'Perimetral malla',   'Cerca perimetral de malla galvanizada'),
    (2, 'Interior post stakes','Estacas divisorias internas'),
    (3, 'Seto vivo ciprés',   'Seto de ciprés como barrera viva');

-- Familias botánicas comunes
INSERT INTO Familia_Botanica (Nombre, Descripcion) VALUES
    ('Rosaceae',      'Familia del rosal, incluye manzanos, perales y frutales de hueso'),
    ('Lamiaceae',     'Familia de la menta, hierbas aromáticas'),
    ('Solanaceae',    'Familia de la papa, tomate y pimiento'),
    ('Asteraceae',    'Familia de las margaritas y girasoles'),
    ('Fabaceae',      'Familia de las leguminosas'),
    ('Cucurbitaceae', 'Familia de calabazas, pepinos y melones');

-- Plantas de ejemplo con datos reales
INSERT INTO Planta (ID_familia, ID_Tipo_Planta, Nombre_Comun, Nombre_Cientifico, Altitud_Minima, Altitud_Maxima, Ciclo_Cultivo) VALUES
    (1, 1, 'Manzano',     'Malus domestica',     0,    3000, 'Perenne (5-8 años producción)'),
    (1, 1, 'Peral',       'Pyrus communis',      0,    2800, 'Perenne (4-7 años producción)'),
    (2, 2, 'Menta',       'Mentha spicata',      0,    1500, 'Perenne (rebrote estacional)'),
    (2, 2, 'Albahaca',    'Ocimum basilicum',    0,    1800, 'Anual'),
    (3, 3, 'Tomate',      'Solanum lycopersicum', 0,   2000, 'Anual (90-120 días)'),
    (3, 3, 'Pimiento',    'Capsicum annuum',     0,    2000, 'Anual (70-90 días)'),
    (5, 3, 'Frijol',      'Phaseolus vulgaris',  0,    3000, 'Anual (60-90 días)'),
    (6, 3, 'Calabaza',    'Cucurbita pepo',      0,    2500, 'Anual (90-120 días)'),
    (4, 4, 'Manzanilla',  'Matricaria chamomilla', 500, 2500, 'Anual'),
    (5, 4, 'Llantén',     'Plantago major',      0,    3000, 'Perenne');

-- Usos medicinales de ejemplo
INSERT INTO Uso_Medicinal (Descripcion) VALUES
    ('Antiinflamatorio'),
    ('Digestivo'),
    ('Relajante'),
    ('Expectorante'),
    ('Antiséptico'),
    ('Antioxidante');

-- Provincia de ejemplo
INSERT INTO Provincia (Nombre) VALUES
    ('Pichincha'),
    ('Azuay'),
    ('Manabí'),
    ('Tungurahua'),
    ('Loja'),
    ('Esmeraldas');

-- Asociaciones Planta-Provincia (algunas plantas en algunas provincias)
INSERT INTO Planta_Provincia (ID_Planta, ID_Provincia) VALUES
    (1, 1), (1, 4),  -- Manzano en Pichincha y Tungurahua
    (3, 1), (3, 6),  -- Menta en Pichincha y Esmeraldas
    (5, 1), (5, 3),  -- Tomate en Pichincha y Manabí
    (9, 5);          -- Manzanilla en Loja

-- Asociaciones Planta-Uso_Medicinal
INSERT INTO Planta_Uso_Medicinal (ID_Planta, ID_Uso) VALUES
    (3, 3),  -- Menta: Relajante
    (3, 2),  -- Menta: Digestivo
    (9, 3),  -- Manzanilla: Relajante
    (9, 1),  -- Manzanilla: Antiinflamatorio
    (10, 1), -- Llantén: Antiinflamatorio
    (10, 5); -- Llantén: Antiséptico


-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
-- Para ejecutar en PostgreSQL:
--   psql -U <usuario> -d <base_datos> -f sistema_agricola_gamificacion.sql
--
-- Para verificar la creación:
--   \dt                    (lista todas las tablas)
--   \d Huerto              (estructura de la tabla más crítica)
--   SELECT COUNT(*) FROM Planta;  (debe devolver 10)
--   SELECT COUNT(*) FROM Actividades;  (debe devolver 5)
-- =============================================================================
