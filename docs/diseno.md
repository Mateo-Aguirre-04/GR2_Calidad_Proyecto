# Diseño del Producto

Esta sección presenta el diseño de la base de datos en Supabase, los diagramas de secuencia de las historias de usuario implementadas y las reglas de rangos y actividades del juego.

---

## 1. Diseño de Base de Datos (Modelo Entidad-Relación)

La base de datos en PostgreSQL (esquema `huertos` en Supabase) está organizada en 4 dominios:

### 1.1. Modelo Entidad-Relación Completo

![Modelo Entidad-Relación Completo](diagramas/mer_supabase.svg)

---

### 1.2. Dominio 1: Usuarios y Gremios

Guarda las cuentas de los jugadores (`usuario` y `usuario_general`), los datos de cada comunidad (`gremio`), los miembros con su rol (`miembro_gremio`) y los códigos de invitación de 6 dígitos (`invitacion_gremio`).

![MER Dominio 1 - Usuarios y Gremios](diagramas/mer_1_usuarios_gremios.svg)

---

### 1.3. Dominio 2: Huerto y Configuración Física

Guarda la configuración física del huerto de cada gremio (`huerto`) junto con los catálogos de tipo de diseño, número de parcelas, cerca de seguridad, suelo, riego y abono.

![MER Dominio 2 - Huerto y Configuración Física](diagramas/mer_2_huerto_configuracion.svg)

---

### 1.4. Dominio 3: Catálogo de Plantas Ecuatorianas

Guarda la información de las plantas del Ecuador (`planta`), su familia botánica, tipo de cultivo, provincias donde se cultiva y sus usos medicinales.

![MER Dominio 3 - Catálogo de Plantas Ecuatorianas](diagramas/mer_3_catalogo_plantas.svg)

---

### 1.5. Dominio 4: Cultivos, Parcelas y Tareas del Huerto

Registra las secciones y parcelas del huerto (`zonas_huerto`), los ciclos de preparación (`ciclos_zona`), las plantas sembradas (`huerto_planta`), las tareas del huerto (`tareas_huerto`) y los participantes que reciben puntos (`participantes_tarea`).

![MER Dominio 4 - Cultivos, Parcelas y Tareas del Huerto](diagramas/mer_4_cultivos_tareas.svg)

---

## 2. Diagramas de Secuencia

A continuación se muestran los diagramas de secuencia para las 10 historias de usuario implementadas:

### HU-001: Registro e Inicio de Sesión del Jugador

![Secuencia HU-001](diagramas/secuencia_01_registro_login.svg)

### HU-002: Creación y Ubicación Real del Gremio

![Secuencia HU-002](diagramas/secuencia_02_crear_gremio.svg)

### HU-003: Unirse a un Gremio con Código o QR

![Secuencia HU-003](diagramas/secuencia_03_unirse_gremio.svg)

### HU-004: Consulta y Filtrado del Catálogo de Plantas

![Secuencia HU-004](diagramas/secuencia_04_catalogo_plantas.svg)

### HU-005: Siembra por Parcelas y Crecimiento en el Huerto

![Secuencia HU-005](diagramas/secuencia_05_siembra_parcela.svg)

### HU-006: Consulta del Clima Actual y Fase Lunar

![Secuencia HU-006](diagramas/secuencia_06_clima_luna.svg)

### HU-007: Completar Recordatorios, Cosechar y Subir de Rango

![Secuencia HU-007](diagramas/secuencia_07_cuidado_cosecha_puntos.svg)

### HU-008: Ver Perfil del Jugador y Editar Habilidades

![Secuencia HU-008](diagramas/secuencia_08_perfil_habilidades.svg)

### HU-009: Ver Miembros en Línea y Consultar Ranking de Gremios

![Secuencia HU-009](diagramas/secuencia_09_miembros_en_linea_ranking.svg)

### HU-010: Edición de Descripción y Anuncios por Oficiales y Maestros

![Secuencia HU-010](diagramas/secuencia_10_editar_anuncios_gremio.svg)

---

## 3. Rangos y Puntajes del Juego

### 3.1. Rangos del Jugador

| Rango | Puntos | Descripción |
| :--- | :---: | :--- |
| **Novato** | 0 - 50 | Rango inicial al registrarse en el sistema. |
| **Aprendiz** | 51 - 120 | Jugador que ya participa de forma activa en el cuidado del huerto. |
| **Oficial** | 121 - 250 | Puede editar la descripción y publicar anuncios en su gremio. |
| **Maestro** | Más de 250 | Rango máximo dentro del gremio; también puede editar la descripción y anuncios. |

### 3.2. Actividades y Puntos

| Actividad | Modalidad | Puntos |
| :--- | :---: | :---: |
| **Retiro de maleza** | Individual | 15 puntos |
| **Preparación de tierra** | Grupal | 30 puntos por inscrito |
| **Siembra** | Individual | 30 puntos |
| **Colocar señalética** | Individual | 25 puntos |
| **Riego de parcela** | Individual | 5 puntos |
| **Aplicación de abono** | Grupal | 20 puntos |
| **Limpieza del huerto** | Grupal | 30 puntos por inscrito |
| **Ritual de agradecimiento** | Grupal (opcional) | 20 puntos por inscrito |
| **Cosecha** | Individual | 35 puntos |
| **Secado y almacenamiento** | Individual o Grupal | 20 puntos |
