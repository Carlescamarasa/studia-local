-- ============================================================================
-- ACTUALIZAR POLÍTICAS RLS PARA PROFESORES (PROF) EN TABLA PROFILES
-- ============================================================================
-- 
-- Este script actualiza las políticas RLS para que los usuarios con rol PROF
-- puedan:
-- 1. SELECT sobre cualquier fila donde role = 'PROF'
-- 2. SELECT y UPDATE sobre cualquier fila donde role = 'ESTU'
--
-- EJECUTA ESTO EN SUPABASE SQL EDITOR:
-- 1. Supabase Dashboard → SQL Editor → New Query
-- 2. Pega este script completo
-- 3. Ejecuta (Run)
-- ============================================================================

-- ============================================================================
-- PASO 1: Asegurar que RLS está activada
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Eliminar políticas existentes relacionadas con PROF (si existen)
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can read their students" ON profiles;
DROP POLICY IF EXISTS "Prof can read all PROF profiles" ON profiles;
DROP POLICY IF EXISTS "Prof can read ESTU profiles" ON profiles;
DROP POLICY IF EXISTS "Prof can update ESTU profiles" ON profiles;
DROP POLICY IF EXISTS "Prof can read and update ESTU" ON profiles;

-- ============================================================================
-- PASO 3: Crear función helper para verificar si el usuario autenticado es PROF
-- ============================================================================
-- Esta función usa SECURITY DEFINER para evitar recursión infinita en RLS
CREATE OR REPLACE FUNCTION public.is_prof(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'PROF'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PASO 4: Crear políticas RLS para PROF
-- ============================================================================

-- Política: PROF puede SELECT sobre cualquier fila donde role = 'PROF'
CREATE POLICY "Prof can read PROF profiles"
  ON profiles
  FOR SELECT
  USING (
    public.is_prof(auth.uid())
    AND profiles.role = 'PROF'
  );

-- Política: PROF puede SELECT sobre cualquier fila donde role = 'ESTU'
CREATE POLICY "Prof can read ESTU profiles"
  ON profiles
  FOR SELECT
  USING (
    public.is_prof(auth.uid())
    AND profiles.role = 'ESTU'
  );

-- Política: PROF puede UPDATE sobre cualquier fila donde role = 'ESTU'
CREATE POLICY "Prof can update ESTU profiles"
  ON profiles
  FOR UPDATE
  USING (
    public.is_prof(auth.uid())
    AND profiles.role = 'ESTU'
  )
  WITH CHECK (
    public.is_prof(auth.uid())
    AND profiles.role = 'ESTU'
  );

-- ============================================================================
-- VERIFICACIÓN: Consultar políticas creadas
-- ============================================================================
-- Ejecuta esto después para verificar que las políticas se crearon correctamente:
-- SELECT 
--   policyname,
--   cmd AS command,
--   qual AS using_expression,
--   with_check AS with_check_expression
-- FROM pg_policies
-- WHERE tablename = 'profiles'
--   AND policyname LIKE '%Prof%'
-- ORDER BY policyname;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. La función is_prof() usa SECURITY DEFINER para evitar recursión infinita
-- 2. Las políticas permiten a PROF:
--    - Leer todos los perfiles con role = 'PROF' (incluido el suyo propio)
--    - Leer todos los perfiles con role = 'ESTU'
--    - Actualizar todos los perfiles con role = 'ESTU'
-- 3. Estas políticas NO afectan a otros roles (ADMIN, ESTU) que tienen sus
--    propias políticas
-- ============================================================================

