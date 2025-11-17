-- ============================================================================
-- SOLUCIÓN SIMPLE: Corregir recursión infinita en políticas RLS de profiles
-- ============================================================================
-- 
-- Ejecuta este SQL en Supabase: SQL Editor → New Query
-- ============================================================================

-- Eliminar las políticas problemáticas que causan recursión
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can read their students" ON profiles;

-- ============================================================================
-- Función helper que puede leer profiles sin activar RLS (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Políticas corregidas usando la función helper
-- ============================================================================

-- Política: Los administradores pueden leer todos los perfiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Política: Los administradores pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Política: Los profesores pueden leer perfiles de sus estudiantes
CREATE POLICY "Teachers can read their students"
  ON profiles
  FOR SELECT
  USING (
    -- Pueden leer si son profesores
    public.get_user_role(auth.uid()) = 'PROF'
    AND
    (
      -- Y el perfil que están leyendo es de un estudiante con este profesor asignado
      (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
      OR
      -- O son admin
      public.get_user_role(auth.uid()) = 'ADMIN'
    )
  );

