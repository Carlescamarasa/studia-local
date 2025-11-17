# Modelo de Datos: Usuarios

## Resumen

Este documento describe el modelo de datos para usuarios en Studia, diseñado para migrar desde localStorage a Supabase.

## Arquitectura

### Relación entre `auth.users` y `profiles`

- **`auth.users`** (tabla de Supabase Auth): Gestiona autenticación (email, contraseña, sesiones)
- **`profiles`** (tabla personalizada): Extiende `auth.users` con datos de perfil de la aplicación

Cada usuario tiene:
- Una fila en `auth.users` (gestionada por Supabase Auth)
- Una fila correspondiente en `profiles` (vinculada por `profiles.id = auth.users.id`)

### Estructura de la tabla `profiles`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK, FK) | Referencia a `auth.users.id` |
| `full_name` | TEXT | Nombre completo del usuario |
| `role` | TEXT (ENUM) | Rol: `'ADMIN'`, `'PROF'` o `'ESTU'` |
| `profesor_asignado_id` | UUID (FK, nullable) | ID del profesor asignado (solo estudiantes) |
| `is_active` | BOOLEAN | Indica si el usuario está activo |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

### Mapeo desde el modelo local

El modelo local (`localUsers.js`) tiene estos campos que se mapean así:

| Campo Local | Campo Supabase | Notas |
|-------------|----------------|-------|
| `id` | `profiles.id` | Se convertirá de MongoDB ObjectId a UUID |
| `email` | `auth.users.email` | Ya gestionado por Supabase Auth |
| `nombreCompleto` / `full_name` | `profiles.full_name` | Se usa `full_name` |
| `rolPersonalizado` | `profiles.role` | `'ADMIN'` → `'ADMIN'`, `'PROF'` → `'PROF'`, `'ESTU'` → `'ESTU'` |
| `profesorAsignadoId` | `profiles.profesor_asignado_id` | Solo para estudiantes |
| `estado` | `profiles.is_active` | `'activo'` → `true` |
| `fechaRegistro` | `profiles.created_at` | Se convierte de ISO string a TIMESTAMPTZ |

**Campos que NO se migran** (se derivan si es necesario):
- `first_name`, `last_name`: Se pueden derivar de `full_name` si hace falta

## Tipo TypeScript

El tipo de dominio `StudiaUser` está definido en `src/types/domain.ts`:

```typescript
export interface StudiaUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole; // 'ADMIN' | 'PROF' | 'ESTU'
  profesor_asignado_id: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

Este tipo es el contrato compartido que usará tanto `LocalDataProvider` como `RemoteDataProvider` (futuro).

## Migración de Usuarios Existentes

Para migrar los usuarios actuales de `/local-data/localUsers.js` a Supabase:

1. **Crear usuarios en `auth.users`**:
   - Para cada usuario en `localUsers.js`, crear una entrada en `auth.users` con:
     - `email`: del usuario local
     - `password`: generar una contraseña temporal o usar un flujo de reset
     - `raw_user_meta_data`: incluir `full_name` y `role` para que el trigger los use

2. **Crear perfiles en `profiles`**:
   - El trigger `on_auth_user_created` creará automáticamente la fila en `profiles`
   - O crear manualmente con los datos del usuario local:
     ```sql
     INSERT INTO profiles (id, full_name, role, profesor_asignado_id, is_active, created_at)
     VALUES (
       '<uuid-del-usuario-en-auth-users>',
       '<nombreCompleto>',
       '<rolPersonalizado>',
       '<profesorAsignadoId-uuid>', -- NULL si no aplica
       true, -- si estado === 'activo'
       '<fechaRegistro>'::timestamptz
     );
     ```

3. **Mapear relaciones**:
   - Si un estudiante tiene `profesorAsignadoId`, necesitarás el UUID correspondiente del profesor en Supabase
   - Crear un script de migración que:
     - Lea `localUsers.js`
     - Cree usuarios en `auth.users` (o use la API de Supabase)
     - Cree perfiles en `profiles` con las relaciones correctas

## Seguridad (RLS)

Las políticas de Row Level Security (RLS) configuradas permiten:

- **Usuarios**: Leer y actualizar su propio perfil
- **Administradores**: Leer y actualizar todos los perfiles
- **Profesores**: Leer perfiles de sus estudiantes asignados

Ajusta estas políticas según tus necesidades específicas de seguridad.

## Próximos Pasos

1. Ejecutar el SQL en Supabase (ver `supabase-schema-users.sql`)
2. Crear un script de migración para usuarios existentes
3. Implementar `RemoteDataProvider` que use estos tipos y tablas
4. Migrar gradualmente desde `LocalDataProvider` a `RemoteDataProvider`

