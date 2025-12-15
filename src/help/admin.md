# Guía para Administradores

Guía completa para administradores sobre cómo gestionar la aplicación Studia.

## Rol de Administrador

Como administrador, tienes acceso completo a todas las funciones de la aplicación:
- Gestión de usuarios (crear, editar, cambiar roles, activar/desactivar)
- Gestión de contenido (piezas, ejercicios, planes, asignaciones)
- Panel de diseño para personalizar la apariencia
- Importar y exportar datos
- Acceso a todas las estadísticas y reportes

## Usuarios

### Diferencia Entre "Crear Usuario" e "Invitar Usuario"

Tienes dos opciones para dar de alta nuevos usuarios:

#### Crear Usuario Directamente

1. Ve a **Usuarios** → Haz clic en **"Crear usuario"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
2. Completa el formulario:
   - Email (requerido)
   - Nombre completo (requerido)
   - Nivel (opcional)
   - Profesor asignado (opcional, solo para estudiantes)
3. Selecciona el modo **"Directo"**
4. Haz clic en **"Crear usuario"**
5. El usuario recibirá un email con un enlace para establecer su contraseña

**Ideal para**: Cuando conoces bien al usuario y quieres que entre rápido.

#### Enviar Invitación

1. Ve a **Usuarios** → Haz clic en **"Crear usuario"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
2. Completa el mismo formulario
3. Selecciona el modo **"Invitación"**
4. Haz clic en **"Enviar invitación"**
5. El usuario recibirá un email con un enlace de invitación donde completará su registro

**Ideal para**: Cuando quieres que el usuario complete algunos datos adicionales durante el registro.

**Diferencia clave**: En modo "Directo" el usuario solo establece la contraseña. En modo "Invitación" el usuario completa el formulario de registro completo.

### Asignar Rol (Alumno/Profesor/Admin)

1. Ve a **Usuarios**
2. Haz clic en el menú de acciones (⋮) junto al usuario
3. Selecciona **"Editar perfil"**
4. En el modal, cambia el **Rol**:
   - **Estudiante**: Acceso limitado a sus propias asignaciones y estadísticas
   - **Profesor**: Puede crear asignaciones y gestionar sus estudiantes
   - **Administrador**: Acceso completo al sistema
5. Haz clic en **"Guardar cambios"**

**Advertencia**: Si cambias tu propio rol, tu acceso y navegación cambiarán automáticamente.

### Pausar/Reanudar Acceso

Para desactivar temporalmente el acceso de un usuario:

1. Ve a **Usuarios**
2. Haz clic en el menú de acciones (⋮) junto al usuario
3. Selecciona **"Editar perfil"**
4. Desmarca **"Activo"**
5. Haz clic en **"Guardar cambios"**

Los usuarios desactivados **no pueden iniciar sesión**.

Para reactivarlo, simplemente vuelve a marcar **"Activo"**.

### Resetear Contraseña para Otros

Si un usuario necesita restablecer su contraseña:

1. Ve a **Usuarios**
2. Haz clic en el menú de acciones (⋮) junto al usuario
3. Selecciona **"Enviar enlace de cambio de contraseña"**
4. El usuario recibirá un email con un enlace para restablecer su contraseña

**Nota**: También puedes resetear tu propia contraseña desde tu perfil personal.

## Planificación General

### Crear / Editar Planes

Los **planes** organizan ejercicios en semanas y sesiones. Puedes:

1. Crear nuevos planes desde **Biblioteca** → Pestaña **"Planes"**
2. Editar planes existentes (añadir/quitar sesiones, cambiar ejercicios)
3. Ver todos los planes disponibles en la escuela

**Nota importante**: Si editas un plan que ya está en uso, los cambios no afectan a las asignaciones ya publicadas (que tienen un snapshot del plan).

### Crear / Editar Asignaciones

Puedes crear y gestionar asignaciones para cualquier estudiante:

1. Ve a **Asignaciones**
2. Haz clic en **"Nueva asignación"** o presiona `Ctrl + N` (Mac: `⌘ + N`)
3. Completa el formulario (estudiante, pieza, plan, fecha de inicio, foco)
4. Haz clic en **"Crear asignación"**

Puedes editar cualquier asignación después de crearla, pero ten cuidado al modificar asignaciones de otros profesores.

### Ver Visión Global de la Escuela

- **Agenda**: Ver todas las asignaciones y progreso de todos los estudiantes
- **Calendario**: Ver todos los eventos, sesiones y feedbacks
- **Estadísticas**: Ver estadísticas comparativas de todos los estudiantes

## Soporte

### Recibir Reportes de Error de la App

Cuando usuarios reportan errores usando el botón flotante:

1. Ve a **Reportes** desde el menú lateral
2. Verás los reportes con:
   - Estado (Nuevo, En revisión, Resuelto)
   - Información del usuario
   - Mensaje de error y contexto
   - Información técnica útil
3. Puedes cambiar el estado y hacer seguimiento

### Hacer Seguimiento a Tickets

Si necesitas revisar tickets de soporte a nivel administrativo:

1. Ve a **Tickets de alumnos** desde el menú lateral
2. Verás todos los tickets del sistema
3. Puedes filtrar por estado, profesor, alumno, etc.
4. Puedes responder a tickets si es necesario

## Import/Export

### Importar CSV

Puedes importar datos desde archivos CSV:
- **Piezas**: Importar múltiples piezas a la vez
- **Ejercicios**: Importar ejercicios en lote
- **Planes**: Importar planes completos

**Formato**: Los CSV deben seguir un formato específico. Puedes descargar un ejemplo desde **Importar y Exportar**.

### Exportar Datos

Puedes exportar:
- **Biblioteca como JSON**: Piezas, ejercicios y planes (para reutilizar entre instancias)
- **Datos como CSV**: Asignaciones y registros (para backups o análisis externo)

**Diferencia clave**:
- **JSON**: Biblioteca reutilizable (piezas, ejercicios, planes)
- **CSV**: Datos de seguimiento (asignaciones, registros de sesiones)

**Nota**: Los archivos JSON preservan IDs y estructura completa. Los CSV son para análisis en herramientas externas.

### Advertencias sobre IDs/UUID

- Al importar CSV, usa códigos únicos (`code`) para identificar piezas/ejercicios de forma segura
- Los IDs se preservan en JSON, así que ten cuidado al importar biblioteca que ya existe (pueden sobrescribirse)

## LOPD y Datos

### Qué Tipo de Datos se Guardan

La aplicación guarda:
- **Datos de usuario**: Email, nombre, nivel, rol
- **Datos de estudio**: Tiempos de práctica, sesiones completadas, ejercicios realizados
- **Feedback**: Valoraciones, notas, enlaces multimedia
- **Comunicaciones**: Mensajes en tickets del Centro de Dudas

### Responder a Solicitudes de Usuarios

Si un usuario solicita:

#### Ver Sus Datos

Puedes:
1. Ver el perfil del usuario desde **Usuarios**
2. Ver sus estadísticas completas desde **Estadísticas**
3. Exportar sus datos si es necesario

#### Eliminar Sus Datos

Para eliminar un usuario y todos sus datos:

1. Ve a **Usuarios**
2. Haz clic en el menú de acciones (⋮) junto al usuario
3. Selecciona **"Eliminar"** (si está disponible)
4. Confirma la acción

**Advertencia**: Esta acción puede ser irreversible. Asegúrate de que realmente quieres eliminar todos los datos del usuario.

### Correo de Contacto

Para cualquier consulta sobre LOPD, privacidad o gestión de datos:
**[carles@latrompetasonara.com](mailto:carles@latrompetasonara.com)**

---

¿Tienes más dudas? Consulta la [información técnica](tecnico.md) o contacta a [carles@latrompetasonara.com](mailto:carles@latrompetasonara.com).

