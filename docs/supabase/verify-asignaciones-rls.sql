-- ============================================================================
-- Script de Verificación para RLS de Asignaciones
-- ============================================================================
-- 
-- Este script ayuda a diagnosticar problemas con las políticas RLS
-- al crear asignaciones. Ejecuta estas consultas en Supabase SQL Editor.
--
-- ============================================================================

-- 1. Verificar que el usuario autenticado existe y tiene el rol correcto
-- Ejecuta esto mientras estás autenticado en la aplicación
SELECT 
  p.id,
  au.email,
  p.full_name,
  p.role,
  CASE 
    WHEN p.id = auth.uid() THEN '✅ Usuario autenticado'
    ELSE '❌ No coincide con auth.uid()'
  END as estado
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.id = auth.uid();

-- Si esta consulta no devuelve resultados, el usuario no está autenticado
-- o no existe en la tabla profiles.

-- Alternativa más simple (sin JOIN si no necesitas el email):
-- SELECT 
--   id,
--   full_name,
--   role,
--   CASE 
--     WHEN id = auth.uid() THEN '✅ Usuario autenticado'
--     ELSE '❌ No coincide con auth.uid()'
--   END as estado
-- FROM profiles 
-- WHERE id = auth.uid();

-- ============================================================================
-- 2. Verificar políticas RLS actuales en asignaciones
-- ============================================================================

SELECT 
  policyname as "Nombre de Política",
  cmd as "Operación",
  qual as "Condición USING",
  with_check as "Condición WITH CHECK"
FROM pg_policies 
WHERE tablename = 'asignaciones'
ORDER BY policyname, cmd;

-- ============================================================================
-- 3. Verificar que RLS está habilitado en la tabla
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE tablename = 'asignaciones';

-- Si rowsecurity es false, RLS no está habilitado. Ejecuta:
-- ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Verificar estructura de la tabla (especialmente profesor_id)
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'asignaciones'
  AND column_name IN ('profesor_id', 'alumno_id', 'id', 'estado')
ORDER BY ordinal_position;

-- Verificar que profesor_id es TEXT (no UUID)
-- La política usa auth.uid()::text, así que profesor_id debe ser TEXT

-- ============================================================================
-- 5. Probar INSERT simulado (esto fallará si las políticas no lo permiten)
-- ============================================================================

-- IMPORTANTE: Ejecuta esto solo si eres un usuario autenticado con rol PROF o ADMIN
-- Reemplaza 'TU_USER_ID_AQUI' con tu auth.uid() actual

/*
INSERT INTO asignaciones (
  id,
  alumno_id,
  profesor_id,
  pieza_id,
  semana_inicio_iso,
  estado,
  foco,
  plan_id
)
VALUES (
  'test-asignacion-' || gen_random_uuid()::text,
  'test-alumno-id',
  auth.uid()::text,  -- Esto debe coincidir exactamente con auth.uid()
  'test-pieza-id',
  CURRENT_DATE::text,
  'borrador',
  'GEN',
  'test-plan-id'
)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- 6. Verificar tipos de datos y conversiones
-- ============================================================================

-- Verificar que auth.uid() es UUID
SELECT 
  auth.uid() as "auth.uid() (UUID)",
  auth.uid()::text as "auth.uid()::text (TEXT)",
  pg_typeof(auth.uid()) as "Tipo de auth.uid()",
  pg_typeof(auth.uid()::text) as "Tipo de auth.uid()::text";

-- ============================================================================
-- 7. Verificar asignaciones existentes y sus profesor_id
-- ============================================================================

SELECT 
  id,
  profesor_id,
  alumno_id,
  estado,
  CASE 
    WHEN profesor_id = auth.uid()::text THEN '✅ Pertenece al usuario actual'
    ELSE '❌ No pertenece al usuario actual'
  END as pertenencia
FROM asignaciones 
LIMIT 10;

-- ============================================================================
-- 8. Verificar CORS y configuración de la API
-- ============================================================================

-- Nota: La configuración de CORS se hace en Supabase Dashboard:
-- Settings → API → CORS
-- Asegúrate de que tu URL de desarrollo esté en la lista:
-- - http://localhost:5173
-- - http://localhost:3000
-- - (cualquier otra URL que uses)

-- ============================================================================
-- 9. Verificar sesión actual del usuario
-- ============================================================================

-- Esta consulta muestra información sobre la sesión actual
-- Si no hay resultados, el usuario no está autenticado

-- Obtener información básica del usuario autenticado
SELECT 
  auth.uid() as "User ID",
  auth.role() as "Role";

-- Obtener email del usuario autenticado (requiere JOIN con auth.users)
SELECT 
  auth.uid() as "User ID",
  au.email as "Email",
  p.full_name as "Full Name",
  p.role as "Profile Role"
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.id = auth.uid();

-- Nota: Si esta consulta no devuelve resultados, el usuario no está autenticado
-- o no existe en auth.users

-- ============================================================================
-- 10. Script para corregir políticas RLS si es necesario
-- ============================================================================

-- Si necesitas recrear la política de INSERT, ejecuta esto:

/*
-- Eliminar política existente
DROP POLICY IF EXISTS "Teachers and admins can create asignaciones" ON asignaciones;

-- Crear nueva política
CREATE POLICY "Teachers and admins can create asignaciones"
  ON asignaciones
  FOR INSERT
  WITH CHECK (
    -- El usuario debe existir en profiles y ser PROF o ADMIN
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    -- El profesor_id debe coincidir exactamente con auth.uid() convertido a texto
    AND profesor_id = auth.uid()::text
  );

-- Verificar que la política se creó correctamente
SELECT * FROM pg_policies WHERE tablename = 'asignaciones' AND policyname = 'Teachers and admins can create asignaciones';
*/


