# Guía para Profesores

Guía completa para profesores sobre cómo usar Studia para gestionar el estudio musical de tus estudiantes.

> **Importante**: Todo se puede modificar en cualquier momento: planes, asignaciones, semanas, sesiones... No te preocupes si necesitas ajustar algo después de crearlo.

## Visión General del Rol Profesor

Como profesor en Studia, puedes:
- Crear y gestionar asignaciones para tus estudiantes
- Crear ejercicios, piezas y planes de estudio
- Revisar el progreso de tus estudiantes
- Dar feedback semanal y responder dudas
- Ver estadísticas detalladas de cada estudiante

## Gestión de Alumnos

### Ver Asignaciones Activas

1. Ve a **Asignaciones** desde el menú lateral
2. Verás todas las asignaciones de tus estudiantes
3. Puedes filtrar por:
   - **Estado**: Todos, Borrador, Publicada, Archivada
   - **Semana**: Usa el selector de semana en la parte superior
   - **Búsqueda**: Escribe para buscar por pieza, plan o nombre de estudiante

### Ver Calendario de Alumnos

1. Ve a **Calendario** desde el menú lateral
2. Verás todas las sesiones y eventos de tus estudiantes
3. Puedes filtrar por tipo de evento (Sesiones, Asignaciones, Feedback, Eventos)
4. Haz clic en cualquier evento para ver detalles

### Ver Estadísticas Individuales

1. Ve a **Estadísticas** desde el menú lateral
2. Selecciona un estudiante del selector en la parte superior
3. Verás diferentes pestañas con información:
   - **Resumen**: KPIs principales
   - **Progreso**: Evolución temporal
   - **Tipos de bloques**: Análisis por tipo de ejercicio
   - **Top ejercicios**: Ejercicios más practicados
   - **Autoevaluaciones**: Historial de valoraciones
   - **Feedback**: Todos los feedbacks que le has dado

## Crear y Editar Contenido

### Crear Ejercicios

1. Ve a **Plantillas** → Pestaña **"Ejercicios"**
2. Haz clic en **"Nuevo ejercicio"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Nombre**: Nombre del ejercicio (requerido)
   - **Código**: Código único (ej: CA-0001, CB-0002) - **Importante**: Usa códigos únicos
   - **Tipo**: CA, CB, TC, TM, FM, VC, AD
   - **Duración**: Tiempo estimado en segundos
   - **Instrucciones**: Cómo realizar el ejercicio
   - **Indicador de logro**: Qué se busca conseguir
   - **Materiales requeridos**: Lista de materiales
   - **Enlaces multimedia**: Audios, videos o PDFs relacionados
4. Haz clic en **"Guardar"**

**Consejo**: Puedes editar cualquier ejercicio después de crearlo, incluso si ya está en uso en asignaciones.

### Crear Piezas

1. Ve a **Plantillas** → Pestaña **"Piezas"**
2. Haz clic en **"Nueva pieza"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Nombre**: Nombre de la pieza (requerido)
   - **Descripción**: Descripción opcional
   - **Nivel**: Principiante, Intermedio, Avanzado
   - **Tiempo objetivo**: Duración objetivo en minutos
   - **Elementos**: Añade secciones/movimientos con enlaces multimedia
4. Haz clic en **"Guardar"**

### Crear Planes

Los **planes** organizan ejercicios en semanas y sesiones.

1. Ve a **Plantillas** → Pestaña **"Planes"**
2. Haz clic en **"Nuevo plan"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Nombre**: Nombre del plan (requerido)
   - **Pieza**: Selecciona la pieza asociada
   - **Foco general**: GEN, LIG, RIT, ART, S&A
   - **Semanas**: Añade semanas y sesiones con sus ejercicios

**Estructura de un plan**:
- Plan → Semanas (ej: Semana 1, Semana 2, ...)
  - Cada semana → Sesiones (ej: Sesión A, Sesión B, ...)
    - Cada sesión → Ejercicios/Rondas

**Nota importante**: Puedes editar un plan después de crearlo: añadir/quitar sesiones, cambiar ejercicios, modificar objetivos. Los cambios no afectan a las asignaciones ya publicadas (que tienen un snapshot del plan).

### Crear Asignaciones

Una **asignación** conecta un estudiante con un plan de estudio.

1. Ve a **Asignaciones**
2. Haz clic en **"Nueva asignación"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Estudiante**: Selecciona el estudiante
   - **Pieza**: Selecciona la pieza musical
   - **Plan**: Selecciona el plan de estudio asociado a la pieza
   - **Semana de inicio**: Selecciona la fecha de inicio (debe ser un lunes)
   - **Foco**: Selecciona el foco principal (GEN, LIG, RIT, ART, S&A)
   - **Notas**: Añade notas opcionales para el estudiante
4. Haz clic en **"Crear asignación"**

**Estados de asignación**:
- **Borrador**: Solo visible para profesores. El estudiante no la ve aún
- **Publicada**: Visible para el estudiante. Puede comenzar a practicar
- **Archivada**: Ya no visible para el estudiante. Mantiene el historial

Para publicar una asignación:
1. Localiza la asignación que quieres publicar
2. Haz clic en el menú de acciones (⋮) junto a la asignación
3. Selecciona "Publicar" o "Editar" y cambia el estado a "Publicada"

### Editar Cualquier Cosa a Posteriori

**Recuerda**: Todo se puede modificar después de crearlo:
- Puedes añadir/quitar sesiones en un plan
- Puedes cambiar ejercicios en una sesión
- Puedes modificar objetivos y notas
- Puedes cambiar fechas de inicio de asignaciones (con precaución)

**Nota**: Si editas un plan que ya está siendo usado por asignaciones, los cambios no afectarán a las asignaciones ya publicadas (que tienen un snapshot del plan). Solo afectarán a nuevas asignaciones que uses ese plan.

## Feedback del Profesor

Es importante distinguir entre dos formas de comunicarte con tus estudiantes:

### 💬 Centro de Dudas (Tickets)

**Qué es**: Sistema de tickets creados por el estudiante para hacer preguntas.

**Cómo funciona**:
- El estudiante crea un ticket desde "Centro de dudas"
- Tú lo ves en "Tickets de alumnos"
- Puedes responder, adjuntar videos y cambiar el estado del ticket
- La conversación queda registrada

**Cuándo usarlo**: Para responder dudas específicas, resolver problemas técnicos que el estudiante reporta, o mantener conversaciones sobre temas de estudio.

**Dónde está**: Menú lateral → "Tickets de alumnos"

### 📝 Feedback Puntual desde Agenda

**Qué es**: Notas que dejas sobre una sesión o evento concreto, idealmente durante clase.

**Cómo funciona**:
- Ve a **Agenda** desde el menú lateral
- Selecciona un estudiante y una semana
- Haz clic en el botón de feedback (si está disponible)
- Escribe observaciones y adjunta enlaces multimedia
- El estudiante verá este feedback en "Mis Estadísticas" y en el Calendario

**Cuándo usarlo**: Para dejar comentarios sobre el progreso del estudiante, dar orientación después de una clase, o compartir material complementario.

**Dónde está**: Agenda → Seleccionar estudiante y semana → Botón de feedback

## Calendario del Profesor

El **Calendario** te permite ver todas las actividades de tus estudiantes:

### Ver Eventos Propios

Puedes crear eventos (audiciones, conciertos, etc.) que sean visibles para tus estudiantes:
1. Ve a **Calendario**
2. Haz clic en "Crear evento" (si está disponible)
3. Completa los detalles del evento

### Ver Sesiones y Asignaciones de Alumnos

- **Sesiones**: Ver cuándo tus estudiantes han completado sesiones
- **Asignaciones**: Ver todas las asignaciones activas
- **Feedback**: Ver los feedbacks que has dejado

### Filtros Básicos

Puedes filtrar por:
- **Tipo de evento**: Sesiones, Asignaciones, Feedback, Eventos
- **Estudiante**: Selecciona un estudiante específico
- **Vista**: Mes, Semana, Lista

## Errores e Incidencias

### Cómo Interpretar "Reportes de Error"

Cuando un estudiante reporta un error usando el botón flotante:
- Recibirás un reporte (si eres admin) o puedes verlo en "Reportes"
- El reporte incluye:
  - Qué estaba haciendo el estudiante cuando ocurrió el error
  - Mensaje de error (si existe)
  - Información técnica útil para solucionarlo

### Cómo Orientar al Alumno

Si un estudiante te reporta un problema:
1. **Pregunta detalles**: ¿Qué estaba haciendo exactamente? ¿Ocurre siempre o solo a veces?
2. **Prueba básica**: "Vamos a intentar otra vez" - A veces es un problema temporal
3. **Guía hacia soporte**: Si es un problema técnico serio, indícale que:
   - Use el botón de "Reportar error" para que quede registrado
   - Escriba un ticket en "Centro de dudas" con detalles
   - Si es urgente, que contacte directamente

### Contacto Técnico

Para problemas técnicos serios o dudas sobre la aplicación:
**[carles@latrompetasonara.com](mailto:carles@latrompetasonara.com)**

## Estadísticas

### Filtrar por Estudiantes

Puedes seleccionar uno o varios estudiantes para ver sus estadísticas:
1. Ve a **Estadísticas**
2. Usa el selector de estudiantes en la parte superior
3. Si no seleccionas ninguno, verás estadísticas agregadas de todos tus estudiantes

### Filtrar por Focos

Puedes filtrar sesiones por tipo de foco:
- GEN, LIG, RIT, ART, S&A
- Útil para analizar el progreso en áreas específicas

### Vistas Comparativas (Solo Admin)

Si eres admin, también puedes ver una vista comparativa de todos los estudiantes para comparar métricas entre ellos.

**Nota**: Los profesores solo pueden ver estadísticas de sus propios estudiantes.

---

¿Tienes más dudas? Consulta las [preguntas frecuentes](faq.md) o contacta a [carles@latrompetasonara.com](mailto:carles@latrompetasonara.com).

