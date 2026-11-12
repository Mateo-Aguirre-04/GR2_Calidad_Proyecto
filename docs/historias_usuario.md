# Historias de Usuario

## HISTORIAS DE USUARIO IMPLEMENTADAS V1

### HU-001: Registro e inicio de sesión del jugador

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-001</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Registro e inicio de sesión del jugador</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>crear una cuenta con mis datos personales e iniciar sesión en el sistema, <strong>para </strong>entrar al juego empezando como Novato y acceder a los huertos comunitarios.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Registro correcto de un nuevo jugador: Dada </strong>una persona sin cuenta que llena el formulario con su nombre, apellido, nombre de usuario, fecha de nacimiento, género y una contraseña de mínimo 8 caracteres, <strong>cuando </strong>presiona el botón de registrarse <strong>entonces </strong>el sistema guarda el nuevo usuario con 0 puntos y rango Novato, protege su contraseña y lo lleva a la pantalla de inicio de sesión. [ESCENARIO IDEAL]</li>
          <li><strong>Inicio de sesión correcto: Dada </strong>una cuenta de jugador ya registrada, <strong>cuando </strong>el usuario escribe su nombre de usuario y contraseña correctos y presiona iniciar sesión <strong>entonces </strong>el sistema inicia su sesión y lo lleva a la pantalla de selección de gremio. [ESCENARIO IDEAL]</li>
          <li><strong>Contraseña muy corta o nombre de usuario repetido: Dada </strong>una contraseña de menos de 8 caracteres o un nombre de usuario que ya está ocupado por otra persona, <strong>cuando </strong>el usuario intenta registrarse <strong>entonces </strong>el sistema no crea la cuenta y muestra un mensaje claro indicando qué dato debe corregir. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
          <li><strong>Datos incorrectos al iniciar sesión: Dada </strong>una contraseña equivocada o un usuario que no existe, <strong>cuando </strong>el jugador intenta iniciar sesión <strong>entonces </strong>el sistema rechaza el ingreso y muestra un mensaje avisando que el usuario o la contraseña son incorrectos. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar las pantallas de Inicio de sesión y Registro en React (2 horas).</li>
          <li>Codificar el registro y el inicio de sesión en el servidor guardando la sesión del usuario (3 horas).</li>
          <li>Incluir validaciones para exigir todos los campos, usuario único y contraseña de al menos 8 caracteres (2 horas).</li>
          <li>Probar el registro y el login con datos válidos e inválidos (2 horas).</li>
          <li>Depurar el código y corregir detalles visuales del formulario (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-002: Creación y ubicación real del gremio

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-002</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Creación y ubicación real del gremio</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 12 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador que quiere fundar una comunidad <strong>quiero </strong>crear un gremio poniendo su nombre, descripción, tamaño en metros cuadrados, tipo de suelo, tipo de riego y su ubicación real en el mapa, <strong>para </strong>registrar el huerto de mi comunidad, quedar como Fundador y obtener un código para invitar a mis compañeros.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Creación correcta del gremio marcando su ubicación en el mapa: Dada </strong>una sesión iniciada en la pantalla de crear gremio donde el usuario llena el nombre, la descripción (máximo 120 caracteres), el área en m², el tipo de suelo, el tipo de riego y marca un punto en el mapa, <strong>cuando </strong>confirma la creación del gremio <strong>entonces </strong>el sistema guarda el gremio con su huerto, le asigna un código único de 6 dígitos, registra al usuario como Fundador y abre la pantalla del juego. [ESCENARIO IDEAL]</li>
          <li><strong>Datos incompletos o sin ubicación seleccionada en el mapa: Dada </strong>un formulario donde falta elegir el punto en el mapa, el área es menor o igual a cero, o la descripción pasa de 120 caracteres, <strong>cuando </strong>el usuario intenta crear el gremio <strong>entonces </strong>el sistema detiene el guardado y muestra un aviso indicando qué campo falta llenar o corregir. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la pantalla de Crear Gremio e integrar el mapa interactivo para elegir la ubicación (3 horas).</li>
          <li>Codificar en el servidor el guardado del gremio, su huerto inicial y la asignación del rol de Fundador (4 horas).</li>
          <li>Incluir validaciones de campos obligatorios, área mayor a cero y límite de 120 caracteres en la descripción (2 horas).</li>
          <li>Probar la creación de gremios eligiendo distintas ubicaciones del Ecuador en el mapa (2 horas).</li>
          <li>Depurar el código y la carga de los íconos del mapa (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-003: Unirse a un gremio mediante código o código QR

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-003</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Unirse a un gremio mediante código o código QR</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 8 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>unirme a un gremio ya creado escribiendo su código de 6 dígitos o escaneando su código QR, <strong>para </strong>entrar a la comunidad de mi barrio o grupo y participar en su huerto.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Ingreso correcto a un gremio con código válido: Dada </strong>una comunidad que ya existe y tiene un código de 6 dígitos (por ejemplo, 000001), <strong>cuando </strong>el jugador escribe ese código en la ventana &#x27;Unirse a un gremio&#x27; o escanea el código QR <strong>entonces </strong>el sistema agrega al jugador como miembro del gremio y lo lleva directamente al huerto de esa comunidad. [ESCENARIO IDEAL]</li>
          <li><strong>Código de gremio inexistente o mal escrito: Dada </strong>una entrada con un código que no existe o que no tiene 6 números, <strong>cuando </strong>el jugador intenta unirse al gremio <strong>entonces </strong>el sistema no lo une y muestra un mensaje informando que no se encontró ningún gremio con ese código. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar las ventanas para unirse con código y para compartir el código QR de invitación (2 horas).</li>
          <li>Codificar las rutas del servidor para validar el código de 6 dígitos y agregar al usuario al gremio (3 horas).</li>
          <li>Incluir validaciones de formato del código y evitar que un usuario se duplique en el mismo gremio (1 hora).</li>
          <li>Probar la unión con códigos válidos (como 000001) y códigos inexistentes (1 hora).</li>
          <li>Depurar el cambio de pantalla al entrar al gremio (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-004: Consulta y filtrado del catálogo de plantas ecuatorianas

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-004</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Consulta y filtrado del catálogo de plantas ecuatorianas</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Media</p>
        <p><strong>Estimación:</strong> 8 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>buscar y filtrar el catálogo de plantas ecuatorianas por región, tipo o nombre y ver su información de cuidado, <strong>para </strong>saber qué suelo, clima, riego y abono necesita cada planta antes de sembrarla.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Filtro de plantas y apertura de su ventana de información: Dada </strong>la pantalla del catálogo con plantas de la Sierra y la Costa, <strong>cuando </strong>el jugador filtra por región (Sierra, Costa o Ambas), escribe el nombre de una planta y hace clic sobre ella <strong>entonces </strong>el sistema muestra solo las plantas que coinciden y abre una ventana con su nombre científico, clima, suelo, abono y usos medicinales. [ESCENARIO IDEAL]</li>
          <li><strong>Búsqueda de una planta que no está en el catálogo: Dada </strong>una palabra escrita en el buscador que no coincide con ninguna planta registrada, <strong>cuando </strong>el jugador realiza la búsqueda <strong>entonces </strong>la pantalla muestra un mensaje indicando que no se encontraron plantas con ese nombre y permite limpiar el filtro fácilmente. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la pantalla del Catálogo de plantas, las tarjetas y la ventana de detalle de cada planta (2 horas).</li>
          <li>Codificar la consulta de plantas en el servidor y cargar los datos de plantas del Ecuador en la base de datos (3 horas).</li>
          <li>Incluir los filtros por nombre, tipo de cultivo y región (Sierra, Costa, Ambas) (1 hora).</li>
          <li>Probar los filtros y la visualización de datos de cada planta (1 hora).</li>
          <li>Depurar la carga de imágenes e íconos de las plantas (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-005: Siembra y visualización del crecimiento de plantas en el huerto

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-005</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Siembra y visualización del crecimiento de plantas en el huerto</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 12 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador miembro de un gremio <strong>quiero </strong>elegir una planta y sembrarla en un espacio del huerto virtual para ver cómo va creciendo con los días, <strong>para </strong>llevar el control de lo que tenemos sembrado en el huerto de nuestro gremio.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Sembrar una planta en una posición del huerto: Dada </strong>la pantalla del huerto abierta con el selector de plantas activo, <strong>cuando </strong>el jugador escoge una planta y hace clic en un lugar del terreno o presiona Enter <strong>entonces </strong>el sistema dibuja la planta recién sembrada en esa parcela, guarda el cultivo y suma los puntos correspondientes. [ESCENARIO IDEAL]</li>
          <li><strong>Cambio de imagen de la planta según sus días de crecimiento: Dada </strong>una o más plantas ya sembradas en el huerto en diferentes fechas, <strong>cuando </strong>el jugador abre la pantalla del huerto <strong>entonces </strong>cada planta se muestra con el dibujo que corresponde a su etapa actual (recién sembrada, brotando, en crecimiento o lista para cosechar). [ESCENARIO IDEAL]</li>
          <li><strong>Intento de sembrar sin haber elegido una planta: Dada </strong>una acción de siembra donde no se seleccionó ninguna planta válida, <strong>cuando </strong>se intenta guardar la siembra <strong>entonces </strong>el sistema muestra un aviso pidiendo seleccionar una planta y no modifica el huerto. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar el terreno interactivo del huerto y la ventana para elegir qué planta sembrar (3 horas).</li>
          <li>Codificar las rutas para obtener los cultivos del huerto y guardar nuevas siembras con su posición (4 horas).</li>
          <li>Incluir validaciones de posición dentro del terreno y el cálculo de la etapa de crecimiento según la fecha (2 horas).</li>
          <li>Probar la siembra en las parcelas del huerto verificando que aparezca el cultivo en pantalla (2 horas).</li>
          <li>Depurar el cierre de la ventana de selección y la actualización del huerto (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-006: Consulta del clima actual y la fase lunar en el huerto

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-006</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Consulta del clima actual y la fase lunar en el huerto</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Media</p>
        <p><strong>Estimación:</strong> 8 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>ver en la pantalla del huerto el clima actual de la ubicación de mi gremio y la fase de la luna del día, <strong>para </strong>saber si las condiciones del día son buenas para regar, sembrar o cosechar.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Mostrar el clima real y la fase lunar del día: Dada </strong>la ubicación en el mapa que tiene configurada el huerto del gremio, <strong>cuando </strong>el jugador entra a la pantalla del juego <strong>entonces </strong>el sistema muestra la temperatura y el estado del clima actual junto con la fase lunar del día (Luna Nueva, Creciente, Llena o Menguante) y un consejo de cultivo. [ESCENARIO IDEAL]</li>
          <li><strong>Fallo de internet al consultar el servicio del clima: Dada </strong>una caída temporal del servicio externo de clima o falta de conexión, <strong>cuando </strong>se abre la pantalla del huerto <strong>entonces </strong>el sistema muestra valores de clima por defecto para que el juego siga funcionando sin trabarse y calcula normalmente la fase de la luna. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar los cuadros informativos de clima y fase lunar dentro de la pantalla del huerto (2 horas).</li>
          <li>Codificar la consulta del clima según las coordenadas del huerto y el cálculo de la fase lunar según la fecha (3 horas).</li>
          <li>Incluir datos de respaldo en caso de que falle la consulta del clima en internet (1 hora).</li>
          <li>Probar que el clima y la fase lunar se muestren correctamente con huertos de distintas ciudades (1 hora).</li>
          <li>Depurar la visualización de íconos del clima y de la luna (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-007: Completar recordatorios, cosechar plantas y subir de rango con puntos

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-007</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Completar recordatorios, cosechar plantas y sumar puntos</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 12 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>marcar como completados mis recordatorios de cuidado (como regar o deshierbar) y cosechar las plantas listas, <strong>para </strong>ganar puntos para mí y para mi gremio.</p>
        <p>Nota: La actualización en tiempo real del rango no está prevista. Se planea implementar en la versión 2.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Suma de puntos al completar tareas o cosechar: Dada </strong>una tarea pendiente en la lista de recordatorios o una planta que ya está lista para cosechar, <strong>cuando </strong>el jugador completa el recordatorio o cosecha la planta <strong>entonces </strong>el sistema le suma los puntos ganados, actualiza los puntos del gremio. [ESCENARIO IDEAL]</li>
          <li><strong>Evitar puntos dobles si se intenta cosechar o completar dos veces lo mismo: Dada </strong>una planta que ya fue cosechada o un recordatorio que ya estaba completado, <strong>cuando </strong>el jugador intenta repetir la misma acción <strong>entonces </strong>el sistema no vuelve a sumar puntos ni permite completar dos veces la misma tarea. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la lista de recordatorios con filtros y el botón de cosechar en el huerto (3 horas).</li>
          <li>Codificar en el servidor las rutas para completar recordatorios, cosechar cultivos y sumar los puntos (4 horas).</li>
          <li>Incluir validaciones para evitar cosechas repetidas y calcular el rango según los puntos acumulados (2 horas).</li>
          <li>Probar la entrega de puntos y el bloqueo de tareas repetidas (2 horas).</li>
          <li>Depurar que los puntos se actualicen al instante en la pantalla del juego y en el perfil (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-008: Ver perfil del jugador y editar descripción de habilidades

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-008</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Ver perfil del jugador y editar descripción de habilidades</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Media</p>
        <p><strong>Estimación:</strong> 6 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>abrir mi perfil para ver mi rango, mis puntos y escribir mis habilidades o conocimientos de agricultura, <strong>para </strong>que los demás miembros de mi gremio conozcan en qué tareas puedo ayudar mejor.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Guardar descripción de habilidades en el perfil: Dada </strong>la ventana de perfil abierta por el jugador que inició sesión, <strong>cuando </strong>escribe o modifica su descripción de habilidades y presiona guardar <strong>entonces </strong>el sistema guarda el texto en la base de datos y lo muestra actualizado junto con sus puntos y su medalla actual. [ESCENARIO IDEAL]</li>
          <li><strong>Texto demasiado largo o error al guardar: Dada </strong>una descripción que supera el límite permitido o un fallo de conexión al guardar, <strong>cuando </strong>el jugador intenta guardar los cambios <strong>entonces </strong>el sistema avisa del problema con un mensaje en pantalla sin borrar lo que el usuario había escrito. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la ventana de Perfil del jugador mostrando su medalla, puntos y cuadro de texto editable (2 horas).</li>
          <li>Codificar las rutas para consultar los datos del perfil y actualizar la descripción del usuario (2 horas).</li>
          <li>Incluir validaciones para verificar que se cargue el perfil del usuario que inició sesión (1 hora).</li>
          <li>Probar el guardado de la descripción y la visualización de puntos reales (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-009: Ver miembros en línea y consultar el ranking de gremios

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-009</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Ver miembros en línea y consultar el ranking de gremios</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador miembro de un gremio <strong>quiero </strong>ver quiénes están en línea en mi gremio en este momento y consultar la tabla de ranking entre todos los gremios, <strong>para </strong>saber qué compañeros están conectados y comparar el puntaje acumulado de nuestro gremio frente a los demás.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Mostrar miembros en línea y actualizar cuando se desconectan: Dada </strong>la pestaña &#x27;Miembros&#x27; dentro de la pantalla del gremio, <strong>cuando </strong>uno o varios compañeros tienen su sesión abierta y activa en los últimos 15 minutos <strong>entonces </strong>el sistema los muestra como &#x27;En línea&#x27;, actualiza la lista cada 30 segundos y los pasa a desconectados cuando cierran sesión o llevan más de 15 minutos sin actividad. [ESCENARIO IDEAL]</li>
          <li><strong>Consultar la tabla de Ranking de gremios: Dada </strong>la pestaña &#x27;Ranking de gremios&#x27; dentro de la pantalla del gremio, <strong>cuando </strong>el jugador abre la pestaña o presiona el botón &#x27;Actualizar ranking&#x27; <strong>entonces </strong>el sistema muestra la tabla ordenada por puntaje con la posición, el nombre de cada gremio, sus puntos acumulados y sus miembros actuales. [ESCENARIO IDEAL]</li>
          <li><strong>Rechazo de presencia si el usuario no ha iniciado sesión: Dada </strong>una petición para actualizar el estado en línea desde un navegador sin sesión iniciada, <strong>cuando </strong>intenta reportar que está conectado <strong>entonces </strong>el servidor rechaza la petición con error 401 y no marca a nadie como conectado. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar las pestañas de &#x27;Miembros&#x27; y &#x27;Ranking de gremios&#x27; en la pantalla del gremio con estados en línea (2 horas).</li>
          <li>Codificar el control de sesiones activas, el cierre de sesión y la consulta del ranking de gremios (4 horas).</li>
          <li>Incluir el tiempo límite de inactividad de sesión y el ordenamiento de miembros y gremios por puntos (2 horas).</li>
          <li>Probar con pruebas automatizadas el estado en línea con varias sesiones, el cierre de sesión y la tabla de ranking (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-010: Edición de la descripción y anuncios del gremio por Oficiales y Maestros

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-010</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Edición de la descripción y anuncios del gremio por Oficiales y Maestros</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 8 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador con rango de Oficial o Maestro en el gremio <strong>quiero </strong>editar la descripción de mi gremio y publicar anuncios importantes para la comunidad, <strong>para </strong>avisar a mis compañeros sobre reuniones, mingas o cuidados urgentes del huerto.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Edición permitida para Oficial y Maestro: Dada </strong>la sesión de un jugador que tiene el rol de &#x27;Oficial&#x27; o &#x27;Maestro&#x27; dentro de ese gremio, <strong>cuando </strong>entra a la sección Comunidad, edita la descripción (hasta 120 caracteres) o el anuncio (hasta 160 caracteres) y presiona guardar <strong>entonces </strong>el servidor comprueba su rol en la base de datos, guarda los cambios y todos los miembros del gremio pueden leer el nuevo texto. [ESCENARIO IDEAL]</li>
          <li><strong>Bloqueo de edición para miembros con otro rol: Dada </strong>un jugador cuyo rol en el gremio es Novato, Aprendiz, Miembro o Fundador sin rango de Oficial/Maestro, <strong>cuando </strong>abre la pantalla del gremio o intenta enviar un cambio de descripción/anuncio al servidor <strong>entonces </strong>no se le muestra el botón de editar y, si envía la petición directamente, el servidor la rechaza con error 403 sin cambiar los textos. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la sección de descripción y anuncios en la pantalla del gremio mostrando el botón de editar solo a Oficiales y Maestros (2 horas).</li>
          <li>Codificar la ruta PATCH /api/gremios/:id/perfil verificando en la base de datos el rol real del usuario conectado (3 horas).</li>
          <li>Incluir validaciones de máximo 120 caracteres para la descripción y 160 caracteres para los anuncios (1 hora).</li>
          <li>Probar que Oficiales y Maestros puedan guardar cambios y que otros roles reciban rechazo 403 (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

## HISTORIAS DE USUARIO DE SECCIONES NO IMPLEMENTADAS

### HU-011: Revisión de gremios y huertos por el personal del Ministerio

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-011</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Revisión de gremios y huertos por el personal del Ministerio</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>personal del Ministerio (supervisor) <strong>quiero </strong>entrar con una cuenta de supervisor para elegir cualquier gremio y ver sus miembros, sus rangos y las actividades que han hecho, <strong>para </strong>revisar cómo avanzan los huertos comunitarios sin participar ni alterar el juego como si fuera un jugador.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Consulta de datos de una comunidad en modo supervisor: Dada </strong>una cuenta perteneciente al personal del Ministerio, <strong>cuando </strong>inicia sesión y selecciona un gremio de la lista <strong>entonces </strong>el sistema le muestra la lista de miembros, sus rangos, sus puntos y el historial del huerto en modo de solo revisión, sin botones para jugar o sembrar. [ESCENARIO IDEAL]</li>
          <li><strong>Bloqueo de la vista del Ministerio para cuentas de jugadores: Dada </strong>una sesión normal de un jugador, <strong>cuando </strong>intenta abrir la pantalla exclusiva del personal del Ministerio <strong>entonces </strong>el sistema le niega el paso y lo devuelve a su pantalla normal de juego. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la pantalla de revisión de gremios para el usuario del Ministerio (3 horas).</li>
          <li>Codificar las consultas en el servidor para listar gremios, miembros y actividades en modo supervisor (3 horas).</li>
          <li>Incluir validaciones para diferenciar una cuenta del Ministerio de una cuenta de jugador (2 horas).</li>
          <li>Probar el ingreso como personal del Ministerio y el bloqueo para jugadores normales (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-012: Registro y actualización de los datos físicos del huerto real por el Ministerio

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-012</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Registro y actualización de los datos físicos del huerto real por el Ministerio</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 12 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>personal del Ministerio <strong>quiero </strong>registrar y actualizar los datos reales del huerto cuando visito una comunidad (provincia, parroquia, forma del huerto, tipo de cerca, suelo, agua de riego y abono), <strong>para </strong>dejar constancia oficial de cómo está construido realmente el huerto en el terreno.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Guardado de los datos físicos del huerto tras una visita: Dada </strong>una visita presencial del personal del Ministerio a una comunidad, <strong>cuando </strong>llena el formulario eligiendo el diseño del huerto (en tierra, vertical, colgante o en macetas), el tipo de cerca (cerca viva, natural, reciclada, metálica o bloque), el área, el suelo, el riego y el abono <strong>entonces </strong>el sistema guarda la información técnica verificada del huerto junto con la fecha de la revisión. [ESCENARIO IDEAL]</li>
          <li><strong>Formulario con datos físicos incompletos: Dada </strong>una ficha donde falta elegir el tipo de cerca, el diseño del huerto o el área es inválida, <strong>cuando </strong>el supervisor intenta guardar los datos <strong>entonces </strong>el sistema no guarda el registro e indica qué campos obligatorios faltan completar. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar el formulario para que el Ministerio registre los datos físicos del huerto real (3 horas).</li>
          <li>Codificar el guardado conectando las tablas de diseño de huerto, cercas de seguridad, suelo, riego y abono (4 horas).</li>
          <li>Incluir validaciones de campos obligatorios y valores positivos de superficie (2 horas).</li>
          <li>Probar el registro y la actualización de los datos físicos de un huerto (2 horas).</li>
          <li>Depurar la visualización de estos datos dentro de la información del gremio (1 hora).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-013: Registro y actualización del inventario de la bodega del gremio

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-013</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Registro y actualización del inventario de la bodega del gremio</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Media</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>personal del Ministerio (en la primera visita) y Maestro u Oficial del gremio (en las siguientes actualizaciones) <strong>quiero </strong>registrar y actualizar lo que hay en la bodega de la comunidad (herramientas, semillas o plántulas y abonos), <strong>para </strong>saber con qué materiales cuenta el gremio para trabajar en su huerto.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Registro inicial por el Ministerio y actualización por el Maestro u Oficiales: Dada </strong>una comunidad donde el agente del Ministerio llena por primera vez el inventario de herramientas (palas, azadones, rastrillos, regaderas), semillas y abono, <strong>cuando </strong>más adelante el Maestro o un Oficial del gremio actualiza las cantidades disponibles <strong>entonces </strong>el sistema guarda el nuevo inventario de la bodega indicando quién hizo el cambio y la fecha. [ESCENARIO IDEAL]</li>
          <li><strong>Intento de editar la bodega antes de la primera visita del Ministerio o con números negativos: Dada </strong>una bodega que todavía no ha sido inaugurada por el Ministerio o un intento de poner cantidades menores a cero, <strong>cuando </strong>un usuario intenta guardar cambios en el inventario <strong>entonces </strong>el sistema rechaza el guardado y explica que primero debe registrarla el Ministerio o que las cantidades no pueden ser negativas. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la pantalla de Bodega dividida en herramientas, semillas/plántulas y abonos (2 horas).</li>
          <li>Codificar el guardado inicial por parte del Ministerio y la actualización por parte del Maestro y los Oficiales (4 horas).</li>
          <li>Incluir validaciones para no permitir números negativos ni ediciones de usuarios sin permiso (2 horas).</li>
          <li>Probar el registro inicial del Ministerio y la actualización posterior de un Maestro (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-014: Subir fotos de respaldo al realizar actividades del huerto

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-014</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Subir fotos de respaldo al realizar actividades del huerto</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Media</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>jugador <strong>quiero </strong>subir las fotos que pide cada actividad del huerto (como preparar la tierra, hacer los surcos, poner letreros a las plantas o cosechar), <strong>para </strong>demostrar que sí hicimos el trabajo en el huerto real y que el Ministerio nos apruebe los puntos.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Subida completa de las fotos pedidas en la actividad: Dada </strong>una actividad del huerto que pide fotos (por ejemplo, 3 fotos del antes, durante y después al preparar la tierra, o 2 fotos al hacer los surcos luego de 15 días), <strong>cuando </strong>el jugador sube todas las fotos requeridas y selecciona qué compañeros participaron <strong>entonces </strong>el sistema guarda las fotos en el historial del huerto y deja la actividad como &#x27;Pendiente de revisión&#x27; para el Ministerio. [ESCENARIO IDEAL]</li>
          <li><strong>Faltan fotos por subir o aún no pasan los 15 días de espera: Dada </strong>una entrega donde el jugador sube menos fotos de las pedidas, o intenta subir fotos de los surcos antes de que pasen 15 días desde la preparación de la tierra, <strong>cuando </strong>intenta enviar la actividad <strong>entonces </strong>el sistema no permite enviarla y le avisa cuántas fotos le faltan o cuántos días debe esperar. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la ventana para seleccionar y previsualizar las fotos de cada actividad (3 horas).</li>
          <li>Codificar la subida de imágenes al almacenamiento y su registro en la tabla Historial_Fotografias (3 horas).</li>
          <li>Incluir validaciones del número obligatorio de fotos por tarea y los 15 días de espera para los surcos (2 horas).</li>
          <li>Probar la subida con las fotos completas y el aviso de error cuando faltan imágenes (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### HU-015: Revisión y aprobación de fotos por el Ministerio para entregar puntos

<table class="hu-table">
  <tbody>
    <tr>
      <td class="hu-col-nro">
        <p><strong>Nro:</strong> HU-015</p>
      </td>
      <td class="hu-col-titulo">
        <p><strong>Título: Revisión y aprobación de fotos por el Ministerio para entregar puntos</strong></p>
      </td>
      <td class="hu-col-meta">
        <p><strong>Prioridad:</strong> Alta</p>
        <p><strong>Estimación:</strong> 10 horas</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Historia de usuario:</strong></p>
        <p><strong>Como </strong>personal del Ministerio <strong>quiero </strong>revisar las fotos que subieron los gremios en la semana y aprobar o rechazar sus actividades, <strong>para </strong>dar los puntos a todos los miembros que participaron y entregar una medalla a quien subió las fotos cuando el trabajo esté bien hecho.</p>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Sabré que he terminado cuando se cumplan todos los criterios de aceptación a continuación:</strong></p>
        <ul>
          <li><strong>Aprobar fotos y entregar puntos al grupo: Dada </strong>una actividad en estado &#x27;Pendiente de revisión&#x27; con todas sus fotos subidas, <strong>cuando </strong>el personal del Ministerio revisa las imágenes y aprueba el trabajo <strong>entonces </strong>el sistema marca la tarea como completada, suma los puntos a todos los miembros que participaron en esa actividad y le da una medalla al jugador que subió las fotos. [ESCENARIO IDEAL]</li>
          <li><strong>Rechazar fotos que no cumplen con la actividad: Dada </strong>unas fotos borrosas o que no muestran el trabajo que decía la tarea, <strong>cuando </strong>el personal del Ministerio rechaza la entrega y escribe el motivo <strong>entonces </strong>el sistema no entrega los puntos y le muestra el comentario al gremio para que puedan volver a subir las fotos correctas. [ESCENARIO EXCEPCIONAL O PROBLEMÁTICO]</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <p><strong>Tareas de implementación:</strong></p>
        <ul>
          <li>Diseñar la pantalla para que el Ministerio vea las fotos enviadas por cada gremio y tenga botones de aprobar o rechazar (3 horas).</li>
          <li>Codificar la entrega automática de puntos a los participantes y la medalla a quien subió las fotos al aprobarse (4 horas).</li>
          <li>Incluir la validación para exigir un comentario cuando se rechacen las fotos y evitar que una misma entrega se apruebe dos veces (1 hora).</li>
          <li>Probar la aprobación con suma grupal de puntos y el rechazo con mensaje de corrección (2 horas).</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>
