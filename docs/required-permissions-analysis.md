# Análisis de Permisos Requeridos

Este documento describe qué permisos necesita el código de la aplicación para funcionar correctamente.

## Tabla: `profiles`

### Consultas que hace el código:

1. **SELECT (listar todos)**: `User.list()`
   - Usado en: Calendario, Estadísticas, Usuarios, etc.
   - Necesita: ADMIN puede ver todos, PROF puede ver sus estudiantes, ESTU puede ver su propio perfil
   - Campos: `id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at`

2. **SELECT (obtener uno)**: `User.get(id)`
   - Usado en: PerfilModal, ver detalles de usuario
   - Necesita: ADMIN puede ver cualquier perfil, PROF puede ver sus estudiantes + su propio perfil, ESTU puede ver su propio perfil + su profesor asignado
   - Campos: `id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at`

3. **SELECT (filtrar)**: `User.filter(filters)`
   - Usado en: Búsquedas y filtros
   - Necesita: Mismos permisos que SELECT listar

4. **UPDATE (actualizar perfil)**: `User.update(id, updates)`
   - Usado en: PerfilModal, actualizar nombre, rol, profesor asignado
   - Necesita: ADMIN puede actualizar cualquier perfil, usuarios pueden actualizar su propio perfil (excepto rol)

5. **INSERT (crear perfil)**: `User.create(data)`
   - Usado en: Creación de usuarios
   - Necesita: Solo ADMIN (o función automática al crear usuario en auth.users)

### Problema actual:
Las políticas RLS consultan `profiles` dentro de sus propias políticas, causando recursión infinita:
```sql
-- PROBLEMÁTICO (causa recursión):
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
```

## Tabla: `registros_sesion`

### Consultas que hace el código:

1. **SELECT (listar todos)**: `RegistroSesion.list()`
   - Usado en: Calendario, Estadísticas, Semana
   - Necesita: 
     - ESTU: solo sus propios registros (`alumno_id = auth.uid()`)
     - PROF: registros de sus estudiantes (`profesor_asignado_id = auth.uid()`)
     - ADMIN: todos los registros

2. **SELECT (obtener uno)**: `RegistroSesion.get(id)`
   - Usado en: ModalSesion, ver detalles
   - Necesita: Mismos permisos que SELECT listar

3. **SELECT (filtrar)**: `RegistroSesion.filter(filters)`
   - Usado en: Filtros por alumno, fecha, etc.
   - Necesita: Mismos permisos que SELECT listar

4. **INSERT (crear registro)**: `RegistroSesion.create(data)`
   - Usado en: Finalizar sesión de práctica
   - Necesita: ESTU puede crear sus propios registros, PROF/ADMIN pueden crear registros de estudiantes

5. **UPDATE (actualizar registro)**: `RegistroSesion.update(id, updates)`
   - Usado en: Editar sesión (calificación, notas)
   - Necesita: ESTU puede actualizar sus propios registros, PROF puede actualizar registros de sus estudiantes, ADMIN puede actualizar cualquier registro

6. **DELETE (eliminar registro)**: `RegistroSesion.delete(id)`
   - Usado en: Eliminar sesión desde calendario
   - Necesita: ESTU puede eliminar sus propios registros, PROF puede eliminar registros de sus estudiantes, ADMIN puede eliminar cualquier registro

### Problema actual:
Las políticas RLS consultan `profiles` para verificar roles, lo que puede causar recursión si las políticas de `profiles` también consultan `profiles`:
```sql
-- PROBLEMÁTICO si profiles tiene recursión:
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROF', 'ADMIN'))
```

## Solución Propuesta

Usar `auth.jwt()` para obtener el rol desde el token JWT en lugar de consultar `profiles`, evitando la recursión infinita.

### Verificar si el rol está en el JWT:

Ejecuta esto en Supabase SQL Editor para verificar si el rol está en los metadatos del JWT:

```sql
-- Ver estructura de user_metadata y app_metadata en auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' AS role_in_user_metadata,
  raw_app_meta_data->>'role' AS role_in_app_metadata
FROM auth.users
LIMIT 5;
```

Si el rol NO está en el JWT, necesitaremos:
1. Agregar el rol al JWT cuando se crea/actualiza el usuario, O
2. Usar una función SECURITY DEFINER que pueda leer `profiles` sin activar RLS

