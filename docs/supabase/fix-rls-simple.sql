-- ============================================================================
-- SOLUCIÓN SIMPLE: Corregir políticas RLS sin recursión
-- ============================================================================
-- 
-- Este script elimina las políticas problemáticas y las reemplaza con versiones
-- que usan funciones SECURITY DEFINER para evitar recursión infinita.
--
-- EJECUTA ESTO EN SUPABASE SQL EDITOR:
-- 1. Supabase Dashboard → SQL Editor → New Query
-- 2. Pega este script completo
-- 3. Ejecuta (Run)
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear funciones helper que NO activan RLS
-- ============================================================================
-- Estas funciones pueden leer profiles sin activar RLS porque son SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_prof(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'PROF'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PASO 2: Eliminar políticas problemáticas de 'profiles'
-- ============================================================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can read their students" ON profiles;

-- ============================================================================
-- PASO 3: Crear políticas corregidas para 'profiles'
-- ============================================================================

-- Política: Los usuarios pueden leer su propio perfil (ya existe, pero la dejamos)
-- CREATE POLICY "Users can read own profile" -- ya existe

-- Política: Los administradores pueden leer todos los perfiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Política: Los administradores pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Política: Los profesores pueden leer perfiles de sus estudiantes
CREATE POLICY "Teachers can read their students"
  ON profiles
  FOR SELECT
  USING (
    public.is_prof(auth.uid())
    AND (
      -- Pueden leer estudiantes que tienen este profesor asignado
      (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
      OR
      -- O pueden leer todos si son admin
      public.is_admin(auth.uid())
    )
  );

-- Política: Los estudiantes pueden leer el perfil de su profesor asignado
CREATE POLICY "Students can read assigned professor"
  ON profiles
  FOR SELECT
  USING (
    profiles.role = 'PROF'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ESTU' 
      AND profesor_asignado_id = profiles.id
    )
  );

-- ============================================================================
-- PASO 4: Corregir políticas de 'registros_sesion'
-- ============================================================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Students can read own registros_sesion" ON registros_sesion;
DROP POLICY IF EXISTS "Teachers can read students registros_sesion" ON registros_sesion;
DROP POLICY IF EXISTS "Students can create own registros_sesion" ON registros_sesion;
DROP POLICY IF EXISTS "Students can update own registros_sesion" ON registros_sesion;
DROP POLICY IF EXISTS "Admins can delete registros_sesion" ON registros_sesion;

-- Política: Los estudiantes pueden leer sus propios registros
CREATE POLICY "Students can read own registros_sesion"
  ON registros_sesion
  FOR SELECT
  USING (alumno_id = auth.uid()::text);

-- Política: Los profesores pueden leer registros de sus estudiantes
CREATE POLICY "Teachers can read students registros_sesion"
  ON registros_sesion
  FOR SELECT
  USING (
    profesor_asignado_id = auth.uid()::text
    OR public.is_admin(auth.uid())
  );

-- Política: Los administradores pueden leer todos los registros
CREATE POLICY "Admins can read all registros_sesion"
  ON registros_sesion
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Política: Los estudiantes pueden crear sus propios registros
CREATE POLICY "Students can create own registros_sesion"
  ON registros_sesion
  FOR INSERT
  WITH CHECK (
    alumno_id = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR public.is_prof(auth.uid())
  );

-- Política: Los estudiantes pueden actualizar sus propios registros
CREATE POLICY "Students can update own registros_sesion"
  ON registros_sesion
  FOR UPDATE
  USING (
    alumno_id = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR (public.is_prof(auth.uid()) AND profesor_asignado_id = auth.uid()::text)
  );

-- Política: Los estudiantes pueden eliminar sus propios registros
CREATE POLICY "Students can delete own registros_sesion"
  ON registros_sesion
  FOR DELETE
  USING (
    alumno_id = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR (public.is_prof(auth.uid()) AND profesor_asignado_id = auth.uid()::text)
  );

-- Política: Los profesores pueden eliminar registros de sus estudiantes
CREATE POLICY "Teachers can delete students registros_sesion"
  ON registros_sesion
  FOR DELETE
  USING (
    (public.is_prof(auth.uid()) AND profesor_asignado_id = auth.uid()::text)
    OR public.is_admin(auth.uid())
  );

