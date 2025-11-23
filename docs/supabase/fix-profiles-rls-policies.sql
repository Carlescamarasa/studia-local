-- ============================================================================
-- SOLUCIÓN: Corregir políticas RLS con recursión infinita en profiles
-- ============================================================================
-- 
-- PROBLEMA: Las políticas actuales tienen recursión infinita porque consultan
-- la tabla profiles dentro de las mismas políticas que protegen profiles.
--
-- SOLUCIÓN: Usar auth.jwt() para obtener el rol desde el token JWT en lugar
-- de consultar la tabla profiles.
-- ============================================================================

-- Primero, eliminar las políticas problemáticas
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can read their students" ON profiles;

-- ============================================================================
-- Política corregida: Los administradores pueden leer todos los perfiles
-- ============================================================================
-- Usa auth.jwt() para obtener el rol desde el token JWT (sin consultar profiles)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
  );

-- ============================================================================
-- Política corregida: Los administradores pueden actualizar todos los perfiles
-- ============================================================================
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
  );

-- ============================================================================
-- Política corregida: Los profesores pueden leer perfiles de sus estudiantes
-- ============================================================================
CREATE POLICY "Teachers can read their students"
  ON profiles
  FOR SELECT
  USING (
    -- Pueden leer si son profesores
    (
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'PROF'
      OR
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'PROF'
    )
    AND
    (
      -- Y el perfil que están leyendo es de un estudiante con este profesor asignado
      (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
      OR
      -- O son admin (verificar desde JWT, no desde profiles)
      (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
        OR
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
      )
    )
  );

-- ============================================================================
-- ALTERNATIVA: Si el rol no está en el JWT, usar una función SECURITY DEFINER
-- ============================================================================
-- Esta función puede leer profiles sin activar RLS porque es SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política alternativa usando la función (si el rol no está en JWT)
-- Descomenta estas si prefieres usar la función en lugar del JWT:
/*
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()));
*/

