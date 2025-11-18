# Guía de Tablas Supabase - Studia

Este documento describe las tablas de Supabase y sus campos para la aplicación Studia.

## Tablas

### 1. `profiles`
Extiende `auth.users` con información de perfil específica de Studia.

**Campos principales:**
- `id` (UUID, PK, FK a auth.users.id)
- `full_name` (TEXT)
- `role` (TEXT: 'ADMIN', 'PROF', 'ESTU')
- `profesor_asignado_id` (UUID, nullable, FK a profiles.id)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase-schema-users.sql` (ya ejecutado)

---

### 2. `piezas`
Almacena las piezas musicales que los estudiantes practican.

**Campos principales:**
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `descripcion` (TEXT, nullable)
- `nivel` (TEXT: 'principiante', 'intermedio', 'avanzado')
- `tiempo_objetivo_seg` (INTEGER)
- `elementos` (JSONB) - Array de `{nombre, mediaLinks[]}`
- `profesor_id` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-piezas.sql`

---

### 3. `bloques`
Almacena los ejercicios/bloques de práctica.

**Campos principales:**
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `code` (TEXT, UNIQUE) - Código único (ej: CA-0001)
- `tipo` (TEXT: 'CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')
- `duracion_seg` (INTEGER)
- `instrucciones` (TEXT, nullable)
- `indicador_logro` (TEXT, nullable)
- `materiales_requeridos` (JSONB) - Array de strings
- `media_links` (JSONB) - Array de strings
- `elementos_ordenados` (JSONB) - Array de strings
- `pieza_ref_id` (TEXT, nullable)
- `profesor_id` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-bloques.sql`

---

### 4. `planes`
Almacena los planes de práctica con estructura anidada.

**Campos principales:**
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `foco_general` (TEXT: 'GEN', 'LIG', 'RIT', 'ART', 'S&A')
- `objetivo_semanal_por_defecto` (TEXT, nullable)
- `pieza_id` (TEXT)
- `profesor_id` (TEXT)
- `semanas` (JSONB) - Estructura anidada completa:
  ```json
  [{
    "nombre": "Semana 1",
    "foco": "GEN",
    "objetivo": "...",
    "sesiones": [{
      "nombre": "Sesión A",
      "foco": "GEN",
      "bloques": [...],
      "rondas": [...]
    }]
  }]
  ```
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-planes.sql`

---

### 5. `asignaciones`
Almacena las asignaciones de práctica con snapshots embebidos.

**Campos principales:**
- `id` (TEXT, PK)
- `alumno_id` (TEXT)
- `profesor_id` (TEXT)
- `pieza_id` (TEXT)
- `semana_inicio_iso` (DATE) - Formato YYYY-MM-DD
- `estado` (TEXT: 'borrador', 'publicada', 'archivada')
- `foco` (TEXT: 'GEN', 'LIG', 'RIT', 'ART', 'S&A')
- `notas` (TEXT, nullable)
- `plan` (JSONB) - Snapshot completo del plan
- `pieza_snapshot` (JSONB) - Snapshot completo de la pieza
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-asignaciones.sql`

---

### 6. `registros_sesion`
Almacena los registros de sesiones de práctica.

**Campos principales:**
- `id` (TEXT, PK)
- `asignacion_id` (TEXT)
- `alumno_id` (TEXT)
- `profesor_asignado_id` (TEXT)
- `semana_idx` (INTEGER)
- `sesion_idx` (INTEGER)
- `inicio_iso` (TIMESTAMPTZ)
- `fin_iso` (TIMESTAMPTZ, nullable)
- `duracion_real_seg` (INTEGER)
- `duracion_objetivo_seg` (INTEGER)
- `bloques_totales` (INTEGER)
- `bloques_completados` (INTEGER)
- `bloques_omitidos` (INTEGER)
- `finalizada` (BOOLEAN)
- `fin_anticipado` (BOOLEAN)
- `motivo_fin` (TEXT, nullable)
- `calificacion` (INTEGER, nullable, 1-4)
- `notas` (TEXT, nullable)
- `dispositivo` (TEXT, nullable)
- `version_schema` (TEXT, nullable)
- `pieza_nombre`, `plan_nombre`, `semana_nombre`, `sesion_nombre` (TEXT, nullable) - Snapshots
- `foco` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-registros-sesion.sql`

---

### 7. `registros_bloque`
Almacena los registros detallados de cada bloque ejecutado.

**Campos principales:**
- `id` (TEXT, PK)
- `registro_sesion_id` (TEXT)
- `asignacion_id` (TEXT)
- `alumno_id` (TEXT)
- `semana_idx` (INTEGER)
- `sesion_idx` (INTEGER)
- `orden_ejecucion` (INTEGER)
- `tipo` (TEXT: 'CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')
- `code` (TEXT)
- `nombre` (TEXT)
- `duracion_objetivo_seg` (INTEGER)
- `duracion_real_seg` (INTEGER)
- `estado` (TEXT: 'completado', 'omitido')
- `inicios_pausa` (INTEGER)
- `inicio_iso` (TIMESTAMPTZ)
- `fin_iso` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

**Script SQL**: `docs/supabase/schema-registros-bloque.sql`

---

### 8. `feedbacks_semanal`
Almacena los feedbacks semanales de profesores a estudiantes.

**Campos principales:**
- `id` (TEXT, PK)
- `alumno_id` (TEXT)
- `profesor_id` (TEXT)
- `semana_inicio_iso` (DATE) - Formato YYYY-MM-DD
- `nota_profesor` (TEXT)
- `media_links` (JSONB) - Array de strings
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Índice único**: `(alumno_id, profesor_id, semana_inicio_iso)` para evitar duplicados

**Script SQL**: `docs/supabase/schema-feedbacks-semanal.sql`

---

## Convenciones

### Nombres de Campos
- **Frontend (camelCase)**: `alumnoId`, `profesorId`, `createdAt`
- **Supabase (snake_case)**: `alumno_id`, `profesor_id`, `created_at`
- El mapeo automático se hace en `remoteDataAPI.ts`

### IDs
- Todos los IDs son `TEXT` para mantener compatibilidad con IDs existentes
- No se usan UUIDs estrictos (excepto en `profiles.id` que referencia `auth.users.id`)

### JSONB
- Estructuras complejas se almacenan como JSONB:
  - `piezas.elementos`
  - `planes.semanas`
  - `asignaciones.plan` y `asignaciones.pieza_snapshot`
  - Arrays simples como `bloques.materiales_requeridos`, `feedbacks_semanal.media_links`

### Timestamps
- `created_at`: Se genera automáticamente con `NOW()`
- `updated_at`: Se actualiza automáticamente con triggers

### Políticas RLS
- Todas las tablas tienen RLS habilitado
- Políticas básicas:
  - Estudiantes pueden leer/crear/actualizar sus propios registros
  - Profesores pueden leer registros de sus estudiantes
  - Admins tienen acceso completo

---

## Instalación

1. Ejecutar los scripts SQL en orden de dependencias:
   ```sql
   -- 1. profiles (ya existe)
   -- 2. piezas
   -- 3. bloques
   -- 4. planes
   -- 5. asignaciones
   -- 6. registros_sesion
   -- 7. registros_bloque
   -- 8. feedbacks_semanal
   ```

2. Verificar que las políticas RLS funcionan correctamente

3. Configurar `VITE_DATA_SOURCE=remote` en `.env` para usar Supabase

---

## Migración de Datos

Para migrar datos desde localStorage a Supabase:

1. Exportar datos desde localStorage (usar página de import-export)
2. Ejecutar script de importación (pendiente crear)
3. Verificar integridad referencial

---

## Notas

- Las relaciones se mantienen por ID (no hay FKs estrictas inicialmente)
- Los snapshots en `asignaciones` permiten versionado histórico
- La estructura anidada en `planes.semanas` se mantiene como JSONB para flexibilidad

