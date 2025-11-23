# Manual del Administrador - Studia

Guía completa para administradores sobre cómo gestionar la aplicación Studia.

## Introducción

Como administrador, tienes acceso completo a todas las funciones de la aplicación Studia. Puedes gestionar usuarios, crear y editar contenido, y personalizar el diseño de la aplicación.

## Gestión de Usuarios

La página **Usuarios** es tu centro de gestión de todos los usuarios del sistema.

### Vista General

En la parte superior verás:
- **Barra de búsqueda**: Busca usuarios por nombre o email
- **Filtros**: Filtra por rol (Todos, Administrador, Profesor, Estudiante), estado (Activo, Inactivo) y profesor asignado

### Crear Usuario

Tienes dos opciones para dar de alta nuevos usuarios:

#### Opción 1: Crear Usuario Directamente

1. Haz clic en **"Crear usuario"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
2. Se abrirá un modal donde deberás completar:
   - **Email**: Dirección de correo del usuario (requerido)
   - **Nombre completo**: Nombre completo del usuario (requerido)
   - **Experiencia (Nivel)**: Opcional - Principiante, Intermedio, Avanzado, Profesional
   - **Profesor asignado**: Opcional - Solo para estudiantes, selecciona el profesor
3. Selecciona el modo **"Directo"**
4. Haz clic en **"Crear usuario"**
5. El sistema:
   - Crea el usuario en el sistema de autenticación
   - Confirma el email automáticamente
   - Genera un enlace de restablecimiento de contraseña
   - Actualiza el perfil con nivel y profesor (si se especificaron)
6. El usuario recibirá un email con un enlace para establecer su contraseña

#### Opción 2: Enviar Invitación

1. Haz clic en **"Crear usuario"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
2. Completa el formulario igual que en la opción 1
3. Selecciona el modo **"Invitación"**
4. Haz clic en **"Enviar invitación"**
5. El sistema:
   - Crea el usuario pero no confirma el email
   - Genera un enlace de invitación
   - Actualiza el perfil con nivel y profesor (si se especificaron)
6. El usuario recibirá un email con un enlace de invitación donde completará su registro y establecerá su contraseña

**Diferencia clave**: En modo "Directo" el usuario solo necesita establecer la contraseña. En modo "Invitación" el usuario completa el formulario de registro.

### Cambiar Rol de Usuario

1. Haz clic en el menú de acciones (⋮) junto al usuario
2. Selecciona **"Editar perfil"**
3. En el modal que se abre, cambia el **Rol** (Administrador, Profesor, Estudiante)
4. Haz clic en **"Guardar cambios"**

### Asignar Profesor a Estudiante

#### Asignación Individual

1. Haz clic en el menú de acciones (⋮) junto al estudiante
2. Selecciona **"Asignar profesor"**
3. Elige el profesor de la lista
4. Haz clic en **"Asignar"**

#### Asignación Masiva

1. Selecciona varios estudiantes usando los checkboxes
2. Haz clic en el botón **"Asignar profesor"** en la barra de acciones
3. Elige el profesor de la lista
4. Haz clic en **"Asignar"**

**Nota**: También puedes asignar múltiples estudiantes a un profesor desde el perfil del profesor.

### Activar/Desactivar Usuario

1. Haz clic en el menú de acciones (⋮) junto al usuario
2. Selecciona **"Editar perfil"**
3. Cambia el estado **"Activo"** (marca/desmarca)
4. Haz clic en **"Guardar cambios"**

Los usuarios desactivados no pueden iniciar sesión.

### Restablecer Contraseña de Usuario

1. Haz clic en el menú de acciones (⋮) junto al usuario
2. Selecciona **"Enviar enlace de cambio de contraseña"**
3. El usuario recibirá un email con un enlace para restablecer su contraseña

**Nota**: También puedes restablecer tu propia contraseña desde tu perfil personal.

### Restablecer Tu Propia Contraseña

1. Haz clic en tu nombre/avatar en el menú lateral (parte inferior)
2. Se abrirá el panel de perfil
3. En la sección "Contraseña", haz clic en **"Enviar enlace de cambio de contraseña"**
4. Recibirás un email con un enlace para establecer una nueva contraseña

### Otras Acciones sobre Usuarios

Desde el menú de acciones (⋮) también puedes:
- **Ver perfil**: Ver detalles completos del usuario
- **Enviar enlace mágico**: Enviar un enlace para iniciar sesión sin contraseña
- **Reenviar invitación**: Reenviar el email de invitación si el usuario no lo recibió

## Gestión de Contenido

Como admin, puedes gestionar todo el contenido de la aplicación: piezas, ejercicios/bloques y planes.

### Piezas

Las **piezas** son obras musicales completas que luego se asignan a estudiantes.

1. Ve a **Plantillas** → Pestaña **"Piezas"**
2. Haz clic en **"Nueva pieza"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Nombre**: Nombre de la pieza (requerido)
   - **Descripción**: Descripción opcional
   - **Nivel**: Principiante, Intermedio, Avanzado
   - **Tiempo objetivo**: Duración objetivo en minutos
   - **Elementos**: Añade secciones/movimientos con enlaces multimedia
4. Haz clic en **"Guardar"**

### Ejercicios/Bloques

Los **ejercicios** (también llamados bloques) son unidades individuales de práctica que luego se combinan en sesiones.

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

### Planes

Los **planes** son estructuras completas de estudio que organizan ejercicios en semanas y sesiones.

1. Ve a **Plantillas** → Pestaña **"Planes"**
2. Haz clic en **"Nuevo plan"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario:
   - **Nombre**: Nombre del plan (requerido)
   - **Pieza**: Selecciona la pieza asociada
   - **Foco general**: GEN, LIG, RIT, ART, S&A
   - **Semanas**: Añade semanas y sesiones con sus ejercicios
4. Haz clic en **"Guardar"**

**Estructura de un plan**:
- Plan → Semanas (ej: Semana 1, Semana 2, ...)
  - Cada semana → Sesiones (ej: Sesión A, Sesión B, ...)
    - Cada sesión → Ejercicios/Rondas

## Importar y Exportar

La página **Importar y Exportar** te permite compartir contenido entre instancias de la aplicación.

### Exportar Plantillas

1. Ve a **Importar y Exportar**
2. En la sección **"Exportar"**, selecciona el tipo:
   - **Piezas**: Exporta todas las piezas como JSON
   - **Ejercicios**: Exporta todos los ejercicios como JSON
   - **Planes**: Exporta todos los planes como JSON
3. El archivo JSON se descargará automáticamente

**Formato JSON**: Los archivos JSON contienen todas las plantillas con su estructura completa (IDs, códigos, enlaces multimedia, etc.).

### Importar Plantillas

1. Ve a **Importar y Exportar**
2. En la sección **"Importar"**, selecciona el tipo (Piezas, Ejercicios o Planes)
3. Haz clic en **"Seleccionar archivo"** y elige el archivo JSON
4. Haz clic en **"Subir JSON"**
5. Las plantillas se importarán al sistema

**Importante**: 
- Los archivos JSON contienen **plantillas** (piezas, ejercicios, planes) que puedes reutilizar
- Los **IDs se preservan**, así que si importas una plantilla que ya existe, puede sobrescribirse
- Usa **códigos únicos** (`code`) para identificar ejercicios de forma segura entre diferentes sistemas
- Si un ejercicio ya existe con el mismo código, puede actualizarse

### Exportar Datos (CSV)

También puedes exportar datos como CSV:
- **Asignaciones**: Exporta todas las asignaciones como CSV

Los archivos CSV contienen **datos** (asignaciones, registros) y se usan para análisis externos o backups.

**Diferencia clave**:
- **JSON**: Plantillas reutilizables (piezas, ejercicios, planes)
- **CSV**: Datos de seguimiento (asignaciones, registros de sesiones)

### Descargar CSV de Ejemplo

Si necesitas crear un CSV de datos desde cero, puedes descargar un archivo de ejemplo:
1. Ve a **Importar y Exportar**
2. Haz clic en **"Descargar CSV de ejemplo"** en la sección correspondiente
3. Usa el archivo descargado como plantilla

## Tests & Seeds

La página **Tests & Seeds** (`/testseed`) es una herramienta manual para generar datos de prueba y realizar pruebas de funcionalidad.

### Acceso

1. Ve a la URL `/testseed` en tu navegador
2. O accede desde el menú lateral si está disponible (solo visible para administradores)

**Importante**: Esta herramienta solo está disponible en modo remoto (Supabase). No funciona en modo local.

### Generar Datos de Prueba

La herramienta te permite generar diferentes tipos de datos de prueba:

#### Crear Usuarios de Prueba

1. En la pestaña **"Seeds"**, haz clic en **"Crear usuarios de prueba"**
2. El sistema creará automáticamente:
   - **2 profesores**: Profesor Prueba 1 y Profesor Prueba 2
   - **5 estudiantes**: Estudiante Prueba 1 a Estudiante Prueba 5
3. Los usuarios se crearán con emails tipo `prof1@test.studia` y `estudiante1@test.studia`
4. Si un usuario ya existe, se saltará y no se duplicará

**Nota**: Los usuarios de prueba se crean en Supabase y requieren autenticación activa.

#### Generar Piezas, Ejercicios y Planes de Prueba

1. En la pestaña **"Seeds"**, haz clic en **"Generar piezas, ejercicios y planes"**
2. El sistema creará:
   - **Piezas de prueba**: Varias piezas con diferentes niveles
   - **Ejercicios de prueba**: Ejercicios de diferentes tipos (CA, CB, TC, etc.)
   - **Planes de prueba**: Planes completos con semanas y sesiones
3. Los datos se generan con nombres y códigos de prueba claramente identificables

#### Generar Asignaciones de Prueba

1. Primero asegúrate de tener usuarios y planes creados
2. Haz clic en **"Generar asignaciones de prueba"**
3. El sistema creará asignaciones para los estudiantes de prueba usando los planes disponibles

#### Generar Registros de Sesión

1. Haz clic en **"Generar registros de sesión"**
2. El sistema creará registros de sesiones completadas para los estudiantes de prueba
3. Incluye:
   - Registros de sesión completas
   - Registros de bloques (ejercicios individuales)
   - Calificaciones y notas

#### Generar Feedbacks Semanales

1. Haz clic en **"Generar feedbacks semanales"**
2. El sistema creará feedbacks del profesor para los estudiantes de prueba
3. Incluye observaciones y enlaces multimedia de ejemplo

### Resetear Datos de Prueba

Si quieres limpiar los datos de prueba generados:

1. Haz clic en **"Resetear datos de prueba"**
2. El sistema eliminará:
   - Registros de sesión de prueba
   - Registros de bloques de prueba
   - Feedbacks semanales de prueba
   - Asignaciones de prueba
3. **No elimina**: Usuarios, piezas, ejercicios ni planes (para poder reutilizarlos)

**Advertencia**: Esta acción no se puede deshacer. Asegúrate de que realmente quieres eliminar estos datos.

### Ver Estadísticas de Seeds

En la parte superior de la página verás un resumen de los datos actuales:
- Número de usuarios
- Número de piezas
- Número de planes
- Número de bloques
- Número de asignaciones
- Número de registros de sesión
- Número de registros de bloques
- Número de feedbacks semanales

Haz clic en **"Actualizar"** para refrescar estas estadísticas.

### Auditorías y Tests

La herramienta también incluye funciones de auditoría y tests:

#### Auditoría de Enlaces

1. En la pestaña **"Auditoría"**, puedes ejecutar auditorías de enlaces multimedia
2. Verifica que todos los enlaces en piezas, ejercicios y planes sean válidos
3. Muestra un reporte de enlaces rotos o inválidos

#### Tests de Funcionalidad

1. En la pestaña **"Tests"**, puedes ejecutar tests manuales de funcionalidad
2. Verifica que las funciones principales del sistema funcionen correctamente
3. Muestra un reporte de tests pasados y fallidos

### Aclaración Importante

**NO hay framework de tests automatizados** en este proyecto:
- No existe `npm test` ni comandos de testing automatizado
- No hay tests unitarios ni tests de integración configurados
- `testseed.jsx` es una **herramienta manual** para:
  - Generar datos de prueba
  - Realizar pruebas manuales de funcionalidad
  - Verificar que el sistema funciona correctamente después de cambios

**Para testing real**, debes:
1. Usar la herramienta de seeds para generar datos
2. Probar manualmente las funcionalidades
3. Verificar que todo funciona como se espera

## Panel de Diseño

El **Panel de Diseño** (`/design`) te permite personalizar la apariencia visual de la aplicación en tiempo real.

### Acceso

Ve a **Panel de Diseño** desde el menú lateral o usa el atajo `Ctrl + Alt + O` (Mac: `⌘ + ⌥ + O`).

### Personalización Disponible

Desde el panel puedes ajustar:

#### Colores
- **Color primario**: Color principal de la marca (usado en botones, enlaces, etc.)
- **Color de fondo**: Color de fondo de la aplicación
- **Color de superficie**: Color de tarjetas y paneles
- **Colores de estado**: Success, Warning, Danger, Info

#### Tipografía
- **Familia de fuente base**: Fuente principal para textos
- **Familia de encabezados**: Fuente para títulos y encabezados
- **Tamaños**: Escala de tamaños de texto

#### Espaciado
- **Densidad**: Compacta, Normal, Espaciosa
- **Radios**: Bordes redondeados de tarjetas, botones, etc.
- **Sombras**: Intensidad de sombras

#### Tema
- **Tema claro/oscuro**: Puedes alternar entre tema claro y oscuro
- **Personalización por tema**: Algunas opciones se pueden ajustar por tema

### Aplicar Cambios

Los cambios se aplican **inmediatamente** en la aplicación mientras navegas.

**Nota**: Las personalizaciones son temporales por defecto. Si quieres que persistan, consulta la documentación técnica sobre cómo guardar configuraciones en `docs/ARQUITECTURA.md`.

### Pestaña QA

En la pestaña **"QA"** puedes:
- Verificar variables CSS críticas
- Validar accesibilidad (A11Y)
- Revisar componentes estandarizados

## Asignaciones Globales

Como admin, puedes ver y gestionar **todas** las asignaciones del sistema, no solo las tuyas.

1. Ve a **Asignaciones**
2. Usa los filtros para:
   - Filtrar por profesor
   - Filtrar por estado
   - Buscar por estudiante o pieza
3. Puedes crear, editar y eliminar cualquier asignación

**Nota**: Si editas una asignación de otro profesor, ten cuidado ya que puede afectar el trabajo del estudiante.

## Estadísticas Globales

En **Estadísticas** puedes ver métricas de todos los estudiantes del sistema.

1. Ve a **Estadísticas**
2. Selecciona un estudiante del selector en la parte superior
3. Verás las mismas pestañas que los profesores, pero con acceso a todos los estudiantes

### Vista Comparativa

También puedes ver una vista comparativa de todos los estudiantes:
1. Ve a **Estadísticas**
2. Haz clic en la pestaña **"Comparativa"** (si está disponible)
3. Verás una tabla comparando métricas entre estudiantes

## Atajos de Teclado

Como admin, tienes acceso a todos los atajos de teclado del sistema.

### Atajos Más Importantes

| Función | Windows/Linux | Mac |
|---------|---------------|-----|
| Ir a Asignaciones | `Ctrl + Alt + A` | `⌘ + ⌥ + A` |
| Ir a Agenda | `Ctrl + Alt + G` | `⌘ + ⌥ + G` |
| Ir a Plantillas | `Ctrl + Alt + P` | `⌘ + ⌥ + P` |
| Ir a Estadísticas | `Ctrl + Alt + E` | `⌘ + ⌥ + E` |
| Ir a Usuarios | `Ctrl + Alt + U` | `⌘ + ⌥ + U` |
| Ir a Panel de Diseño | `Ctrl + Alt + O` | `⌘ + ⌥ + O` |
| Crear nuevo elemento (contextual) | `Ctrl + N` | `⌘ + N` |

**Nota**: Los atajos **NO** se activan cuando estás escribiendo en un campo de texto.

Para ver la lista completa de atajos, consulta [HOTKEYS.md](HOTKEYS.md).

## Preguntas Frecuentes

### ¿Puedo cambiar el rol de un usuario después de crearlo?

Sí, puedes cambiar el rol de cualquier usuario desde el menú de acciones (⋮) → "Editar perfil".

### ¿Qué pasa si importo plantillas con IDs duplicados?

Si importas plantillas con IDs que ya existen, pueden sobrescribirse. Usa códigos únicos (`code`) para ejercicios para evitar conflictos.

### ¿Puedo exportar datos de estudiantes?

Actualmente puedes exportar asignaciones como CSV. Los datos de sesiones y registros se pueden exportar desde la página de import-export si está habilitado.

### ¿Se guardan los cambios del Panel de Diseño?

Los cambios del Panel de Diseño son temporales por defecto. Consulta `docs/ARQUITECTURA.md` para más detalles sobre cómo hacer que persistan.

### ¿Puedo desactivar un usuario temporalmente?

Sí, puedes desactivar cualquier usuario desde "Editar perfil" → desmarcar "Activo". Los usuarios desactivados no pueden iniciar sesión.

### ¿Qué pasa si elimino una pieza que está siendo usada en asignaciones?

Las asignaciones guardan un snapshot de la pieza, así que si eliminas una pieza, las asignaciones existentes seguirán funcionando. Sin embargo, no podrás crear nuevas asignaciones con esa pieza.

