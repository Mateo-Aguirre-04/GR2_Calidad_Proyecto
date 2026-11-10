# Catálogo medicinal del huerto

El catálogo queda limitado a las 31 entradas del paquete de plantas medicinales
con imágenes de las fases 1 a 5. Menta e hierbabuena conservan sus entradas
actuales y sus siembras, aunque comparten especie e imágenes.

Calabaza, tomate, pimiento, frijol, peral y manzano quedan fuera del catálogo y
de nuevas siembras. Sus registros anteriores permanecen para conservar las
relaciones y el historial de recompensas. Maracuyá y saúco se conservan por
indicación del usuario y se clasifican como plantas medicinales en este catálogo.

## Ciclos que faltaban

| Planta | Rango del juego | Día usado para madurez |
|---|---|---|
| Menta | 60–90 días | 90 |
| Manzanilla | 60–90 días | 90 |
| Albahaca | 60–90 días | 90 |
| Llantén | 50–70 días | 70 |

Se conserva el criterio existente: el sistema usa el extremo superior del rango
para crecimiento, cosecha y recordatorios. Los ciclos son estimaciones del juego,
coherentes con `insert_plantas_ecuador.sql`; la etapa cosechada y las condiciones
de cultivo reales pueden dar tiempos distintos.

La menta adopta el mismo rango que la hierbabuena ya registrada, ambas
`Mentha spicata`. University of Delaware publica 60–70 días para menta y 64–74
días para variedades de albahaca. Estos valores orientan el rango de 60–90 días
del proyecto, que añade margen y mantiene la consistencia del catálogo:
[menta](https://www.udel.edu/academics/colleges/canr/cooperative-extension/fact-sheets/mint/),
[albahaca](https://www.udel.edu/academics/colleges/canr/cooperative-extension/fact-sheets/basil/).

Johnny's Selected Seeds publica 60–65 días para manzanilla en su
[catálogo de 2024](https://www.johnnyseeds.com/on/demandware.static/-/Library-Sites-JSSSharedLibrary/default/dw6b02211a/assets/information/2024-johnnys-digital-master-catalog.pdf).
El proyecto ya propone 60–90 días y conserva ese margen.

Llantén conserva los 50–70 días previstos en los datos del proyecto como
aproximación jugable a una recolección temprana de hojas. No representa una
estimación de máxima biomasa: una referencia de cultivo recomienda unos cuatro
meses tras plantarlo en su lugar definitivo para esa recolección:
[Plantago major, colheita](https://fitoterapiabrasil.com.br/content/colheita-79).

## Plantas que ya estaban sembradas

La migración 006 actualiza el ciclo de la especie y completa las fechas vacías
de cosechas pendientes a partir de la siembra original. No reinicia el cultivo.
Las demás reglas de cosecha se mantienen. En modo de prueba se omite la espera
del ciclo, manteniendo los requisitos de sección, riego y confirmaciones.
