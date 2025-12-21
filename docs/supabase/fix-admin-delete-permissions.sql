-- ============================================================================
-- FIX: Enable ADMIN DELETE on all tables
-- ============================================================================
-- The cleanup of synthetic data is failing because ADMIN users do not have
-- permission to DELETE rows in tables like registros_sesion, asignaciones, etc.
-- This script adds the missing policies.
-- ============================================================================

-- Function to check role safely (renamed to avoid conflicts)
CREATE OR REPLACE FUNCTION public.check_is_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Asignaciones
DROP POLICY IF EXISTS "Admins can delete asignaciones" ON asignaciones;
CREATE POLICY "Admins can delete asignaciones" ON asignaciones FOR DELETE USING (public.check_is_admin_safe());

-- 2. Registros Sesión
DROP POLICY IF EXISTS "Admins can delete registros_sesion" ON registros_sesion;
CREATE POLICY "Admins can delete registros_sesion" ON registros_sesion FOR DELETE USING (public.check_is_admin_safe());

-- 3. Registros Bloque
DROP POLICY IF EXISTS "Admins can delete registros_bloque" ON registros_bloque;
CREATE POLICY "Admins can delete registros_bloque" ON registros_bloque FOR DELETE USING (public.check_is_admin_safe());

-- 4. Feedbacks Semanal
DROP POLICY IF EXISTS "Admins can delete feedbacks" ON feedbacks_semanal;
CREATE POLICY "Admins can delete feedbacks" ON feedbacks_semanal FOR DELETE USING (public.check_is_admin_safe());

-- 5. Student Backpack
DROP POLICY IF EXISTS "Admins can delete student_backpack" ON student_backpack;
CREATE POLICY "Admins can delete student_backpack" ON student_backpack FOR DELETE USING (public.check_is_admin_safe());

-- 6. Student XP Total
DROP POLICY IF EXISTS "Admins can delete student_xp_total" ON student_xp_total;
CREATE POLICY "Admins can delete student_xp_total" ON student_xp_total FOR DELETE USING (public.check_is_admin_safe());

-- 7. Evaluaciones Tecnicas
DROP POLICY IF EXISTS "Admins can delete evaluaciones_tecnicas" ON evaluaciones_tecnicas;
CREATE POLICY "Admins can delete evaluaciones_tecnicas" ON evaluaciones_tecnicas FOR DELETE USING (public.check_is_admin_safe());

-- 8. Media Assets
DROP POLICY IF EXISTS "Admins can delete media_assets" ON media_assets;
CREATE POLICY "Admins can delete media_assets" ON media_assets FOR DELETE USING (public.check_is_admin_safe());

-- 9. Planes
DROP POLICY IF EXISTS "Admins can delete planes" ON planes;
CREATE POLICY "Admins can delete planes" ON planes FOR DELETE USING (public.check_is_admin_safe());

-- 10. Piezas
DROP POLICY IF EXISTS "Admins can delete piezas" ON piezas;
CREATE POLICY "Admins can delete piezas" ON piezas FOR DELETE USING (public.check_is_admin_safe());

-- 11. Bloques
DROP POLICY IF EXISTS "Admins can delete bloques" ON bloques;
CREATE POLICY "Admins can delete bloques" ON bloques FOR DELETE USING (public.check_is_admin_safe());

-- 12. Profiles (Optional, usually handled separately but good to have)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (public.check_is_admin_safe());
