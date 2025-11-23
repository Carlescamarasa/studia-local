# Información Técnica y Privacidad

Información técnica y sobre privacidad de datos para administradores y usuarios avanzados.

## Arquitectura General

### Stack Tecnológico

Studia está construida con:
- **Frontend**: React 18 + Vite 6
- **UI**: Tailwind CSS + Radix UI + Lucide Icons
- **Estado**: TanStack Query (React Query)
- **Backend**: Supabase (Auth, PostgreSQL con RLS, Edge Functions)
- **Persistencia local**: localStorage (para modo offline)

### Modos de Funcionamiento

La aplicación puede funcionar en dos modos:

- **Modo Local**: Los datos se guardan en localStorage del navegador. Útil para desarrollo y pruebas.
- **Modo Remoto**: Los datos se guardan en Supabase. Modo de producción.

## Roles y Permisos

### Roles Disponibles

Tres roles principales:
- **ESTU** (Estudiante): Acceso a sus propias asignaciones y estadísticas
- **PROF** (Profesor): Puede crear asignaciones y gestionar sus estudiantes
- **ADMIN** (Administrador): Acceso completo al sistema

### Permisos por Rol

**Estudiantes (ESTU)**:
- Ver sus propias asignaciones (solo publicadas)
- Completar sesiones de estudio
- Ver sus estadísticas
- Usar el Centro de Dudas (crear tickets)

**Profesores (PROF)**:
- Crear y gestionar asignaciones
- Ver estadísticas de sus estudiantes
- Dar feedback semanal
- Responder tickets del Centro de Dudas
- Crear y editar plantillas (ejercicios, piezas, planes)

**Administradores (ADMIN)**:
- Todas las capacidades de Profesor, más:
- Gestión de usuarios (crear, editar, cambiar roles, activar/desactivar)
- Acceso al Panel de Diseño
- Acceso a Tests & Seeds
- Ver todos los tickets del sistema

## Base de Datos Supabase

### Row Level Security (RLS)

Todas las tablas usan Row Level Security para garantizar que:
- Los estudiantes solo ven sus propios datos
- Los profesores ven datos de sus estudiantes
- Los administradores ven todos los datos

### Tablas Principales

- **profiles**: Información de usuarios y roles
- **piezas**: Piezas musicales
- **bloques**: Ejercicios/bloques de práctica
- **planes**: Planes de estudio completos
- **asignaciones**: Conexión entre estudiantes y planes
- **registros_sesion**: Sesiones completadas
- **registros_bloque**: Detalle de ejercicios completados
- **feedbacks_semanal**: Feedback del profesor
- **support_tickets**: Tickets del Centro de Dudas

## Política de Logs y Errores

### Reportes de Error

Cuando un usuario reporta un error:
- Se guarda información sobre qué estaba haciendo
- Se incluye mensaje de error y contexto
- Se registra información técnica útil (navegador, sistema operativo, etc.)
- Solo los administradores pueden ver los reportes

### Logs de Sesión

- Se registran inicios y cierres de sesión
- Se guarda información básica de uso (no datos personales sensibles)
- Los logs se usan solo para debugging y mejora de la aplicación

## Privacidad de Datos (LOPD)

### Datos que se Guardan

**Datos de usuario**:
- Email, nombre, nivel, rol
- Profesor asignado (si es estudiante)

**Datos de estudio**:
- Tiempos de práctica
- Sesiones completadas
- Ejercicios realizados
- Feedback y valoraciones

**Comunicaciones**:
- Mensajes en tickets del Centro de Dudas
- Enlaces multimedia compartidos

### Quién Puede Ver Tus Datos

- **Tu profesor**: Puede ver tu progreso, estadísticas y mensajes del Centro de Dudas
- **Administradores**: Tienen acceso a todos los datos para gestionar la aplicación

### Derechos del Usuario

Según la LOPD, tienes derecho a:
- **Acceso**: Ver tus datos personales
- **Rectificación**: Corregir datos incorrectos
- **Supresión**: Solicitar la eliminación de tus datos
- **Oposición**: Oponerte al tratamiento de tus datos
- **Portabilidad**: Recibir tus datos en formato estructurado

Para ejercer estos derechos, contacta con:
**[carles@latrompetasonara.com](mailto:carles@latrompetasonara.com)**

### Seguridad

- Los datos se almacenan en Supabase, que cumple con estándares de seguridad europeos
- Las contraseñas se encriptan y nunca se almacenan en texto plano
- Las conexiones se realizan mediante HTTPS
- Row Level Security garantiza que solo los usuarios autorizados ven los datos correspondientes

## Beta y Desarrollo

### Estado Actual

**Studia está actualmente en versión beta**, lo que significa:

- La aplicación está en desarrollo activo
- Pueden aparecer nuevas funcionalidades
- Puede haber cambios en la interfaz
- Se pueden encontrar bugs o problemas
- Tu feedback es muy valioso para mejorar

### Notas para Administradores

- **Backups**: Es recomendable hacer backups regulares de los datos
- **Actualizaciones**: La aplicación se actualiza regularmente. Los cambios se notifican cuando son importantes
- **Soporte**: Para problemas técnicos serios, contacta con [carles@latrompetasonara.com](mailto:carles@latrompetasonara.com)

---

Para más información técnica detallada, consulta [ARQUITECTURA.md](../../../docs/ARQUITECTURA.md) (documentación para desarrolladores).

