-- ============================================================================
-- Script SQL para actualizar profiles de Supabase desde localUsers
-- ============================================================================
-- 
-- Este script actualiza la tabla profiles con los datos de localUsers.js
-- usando el email como clave de unión con auth.users
--
-- IMPORTANTE:
-- - PRIMERO ejecuta: add-profiles-extra-fields.sql para añadir nivel, telefono, media_links
-- - Los usuarios deben existir previamente en auth.users con sus emails
-- - El script actualiza los campos: full_name, role, profesor_asignado_id, is_active, nivel, telefono, media_links
-- - Si un perfil no existe, se crea automáticamente
-- - El trigger de validación de roles se deshabilita temporalmente durante la migración
-- ============================================================================

-- Deshabilitar temporalmente el trigger que valida cambios de role
-- (necesario porque desde el SQL Editor no hay un usuario autenticado)
ALTER TABLE profiles DISABLE TRIGGER validate_role_change_trigger;

-- Paso 1: Crear una tabla temporal con los datos de localUsers
-- Mapeo de IDs de MongoDB a emails (según localUsers.js)
-- 
-- IDs de localUsers:
-- - 6913f837bb2b72a49b9d25d2 -> carlescamarasa@gmail.com (ADMIN)
-- - 6913ff6688f046f7e7eb3f3b -> carlescamarasa+profe@gmail.com (PROF)
-- - 6913f9c07890d136d35d0a77 -> carlescamarasa+1@gmail.com (ESTU)
-- - 691432b999585b6c94028617 -> trompetasonara@gmail.com (ESTU)

WITH local_users_data AS (
  SELECT 
    'carlescamarasa@gmail.com'::text AS email,
    'Carles Camarasa Botella'::text AS full_name,
    'ADMIN'::text AS role,
    NULL::text AS profesor_email, -- NULL porque es ADMIN
    NULL::text AS nivel, -- Nivel técnico (puede ser: principiante, intermedio, avanzado, profesional)
    NULL::text AS telefono, -- Teléfono de contacto
    '[]'::jsonb AS media_links, -- Array JSONB de enlaces de medios
    true AS is_active,
    '2024-01-01T00:00:00Z'::timestamptz AS fecha_registro
  UNION ALL
  SELECT 
    'carlescamarasa+profe@gmail.com'::text,
    'Carles Profe'::text,
    'PROF'::text,
    NULL::text, -- NULL porque es PROF
    NULL::text,
    NULL::text,
    '[]'::jsonb,
    true,
    '2024-01-01T00:00:00Z'::timestamptz
  UNION ALL
  SELECT 
    'carlescamarasa+1@gmail.com'::text,
    'Carles Estudiante'::text,
    'ESTU'::text,
    'carlescamarasa+profe@gmail.com'::text, -- Email del profesor (ID: 6913ff6688f046f7e7eb3f3b)
    NULL::text,
    NULL::text,
    '[]'::jsonb,
    true,
    '2024-01-01T00:00:00Z'::timestamptz
  UNION ALL
  SELECT 
    'trompetasonara@gmail.com'::text,
    'La Trompeta Sonará'::text,
    'ESTU'::text,
    'carlescamarasa+profe@gmail.com'::text, -- Email del profesor (ID: 6913ff6688f046f7e7eb3f3b)
    NULL::text,
    NULL::text,
    '[]'::jsonb,
    true,
    '2024-01-01T00:00:00Z'::timestamptz
),
-- Paso 2: Obtener los UUIDs de auth.users por email y resolver profesor_asignado_id
user_mapping AS (
  SELECT 
    lud.email,
    lud.full_name,
    lud.role,
    lud.nivel,
    lud.telefono,
    lud.media_links,
    lud.is_active,
    lud.fecha_registro,
    au.id AS user_uuid,
    -- Resolver el UUID del profesor asignado usando el email del profesor
    CASE 
      WHEN lud.profesor_email IS NOT NULL THEN
        (SELECT id FROM auth.users WHERE LOWER(TRIM(email)) = LOWER(TRIM(lud.profesor_email)) LIMIT 1)
      ELSE NULL
    END AS profesor_uuid
  FROM local_users_data lud
  LEFT JOIN auth.users au ON LOWER(TRIM(au.email)) = LOWER(TRIM(lud.email))
  WHERE au.id IS NOT NULL -- Solo usuarios que existen en auth.users
)
-- Paso 3: Actualizar o insertar en profiles
INSERT INTO profiles (id, full_name, role, profesor_asignado_id, nivel, telefono, media_links, is_active, created_at, updated_at)
SELECT 
  um.user_uuid AS id,
  um.full_name,
  um.role::text,
  um.profesor_uuid AS profesor_asignado_id,
  um.nivel,
  um.telefono,
  um.media_links,
  um.is_active,
  COALESCE(um.fecha_registro, NOW()) AS created_at,
  NOW() AS updated_at
FROM user_mapping um
ON CONFLICT (id) 
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  profesor_asignado_id = EXCLUDED.profesor_asignado_id,
  nivel = EXCLUDED.nivel,
  telefono = EXCLUDED.telefono,
  media_links = EXCLUDED.media_links,
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
  -- Nota: created_at no se actualiza en caso de conflicto (mantiene la fecha original)
WHERE 
  profiles.full_name IS DISTINCT FROM EXCLUDED.full_name
  OR profiles.role IS DISTINCT FROM EXCLUDED.role
  OR profiles.profesor_asignado_id IS DISTINCT FROM EXCLUDED.profesor_asignado_id
  OR profiles.nivel IS DISTINCT FROM EXCLUDED.nivel
  OR profiles.telefono IS DISTINCT FROM EXCLUDED.telefono
  OR profiles.media_links IS DISTINCT FROM EXCLUDED.media_links
  OR profiles.is_active IS DISTINCT FROM EXCLUDED.is_active;

-- Volver a habilitar el trigger de validación de roles
ALTER TABLE profiles ENABLE TRIGGER validate_role_change_trigger;

-- ============================================================================
-- Versión alternativa: Si prefieres usar una tabla temporal real
-- ============================================================================
-- 
-- Si tienes muchos usuarios, puedes crear una tabla temporal primero:
--
-- CREATE TEMP TABLE temp_local_users (
--   email TEXT NOT NULL,
--   full_name TEXT NOT NULL,
--   role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PROF', 'ESTU')),
--   profesor_email TEXT,
--   is_active BOOLEAN NOT NULL DEFAULT true,
--   fecha_registro TIMESTAMPTZ
-- );
--
-- INSERT INTO temp_local_users (email, full_name, role, profesor_email, is_active, fecha_registro) VALUES
--   ('carlescamarasa@gmail.com', 'Carles Camarasa Botella', 'ADMIN', NULL, true, '2024-01-01T00:00:00Z'::timestamptz),
--   ('carlescamarasa+profe@gmail.com', 'Carles Profe', 'PROF', NULL, true, '2024-01-01T00:00:00Z'::timestamptz),
--   ('carlescamarasa+1@gmail.com', 'Carles Estudiante', 'ESTU', 'carlescamarasa+profe@gmail.com', true, '2024-01-01T00:00:00Z'::timestamptz),
--   ('trompetasonara@gmail.com', 'La Trompeta Sonará', 'ESTU', 'carlescamarasa+profe@gmail.com', true, '2024-01-01T00:00:00Z'::timestamptz);
--
-- Luego ejecutar el UPDATE/INSERT similar al de arriba pero usando temp_local_users
--
-- ============================================================================

-- ============================================================================
-- Verificación: Consulta para verificar que los datos se actualizaron correctamente
-- ============================================================================

-- Ver todos los perfiles actualizados
SELECT 
  p.id,
  au.email,
  p.full_name,
  p.role,
  p.profesor_asignado_id,
  profe.email AS profesor_email,
  p.nivel,
  p.telefono,
  p.media_links,
  p.is_active,
  p.created_at,
  p.updated_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN profiles profe_p ON profe_p.id = p.profesor_asignado_id
LEFT JOIN auth.users profe ON profe.id = profe_p.id
ORDER BY p.role, p.full_name;

