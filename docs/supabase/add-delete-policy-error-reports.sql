-- ============================================================================
-- Agregar Política RLS para DELETE en error_reports
-- ============================================================================
-- 
-- Este script agrega la política RLS que falta para permitir a los administradores
-- eliminar reportes de errores.
--
-- IMPORTANTE: Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- Política: Solo los administradores pueden eliminar reportes
CREATE POLICY "Admins can delete reports"
  ON error_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- ============================================================================
-- Verificar que la política se creó correctamente
-- ============================================================================

-- Para verificar, ejecuta esta consulta:
-- SELECT * FROM pg_policies WHERE tablename = 'error_reports' AND policyname = 'Admins can delete reports';

-- ============================================================================
-- Comentarios
-- ============================================================================

COMMENT ON POLICY "Admins can delete reports" ON error_reports IS 
  'Permite a los usuarios con rol ADMIN eliminar reportes de errores.';

