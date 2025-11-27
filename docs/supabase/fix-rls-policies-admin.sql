-- ============================================================================
-- Corrección de Políticas RLS para ADMIN - Studia
-- ============================================================================
-- 
-- Este script actualiza las políticas RLS para permitir que los usuarios ADMIN
-- puedan crear asignaciones y feedbacks con cualquier profesor_id, no solo
-- con su propio auth.uid().
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- - Estas políticas permiten que ADMIN cree registros en nombre de otros profesores
-- ============================================================================

-- ============================================================================
-- 1. Actualizar política de INSERT en asignaciones
-- ============================================================================

-- Eliminar la política existente que requiere profesor_id = auth.uid()
DROP POLICY IF EXISTS "Teachers and admins can create asignaciones" ON asignaciones;

-- Crear nueva política que permite:
-- - PROF: solo pueden crear asignaciones con su propio profesor_id
-- - ADMIN: pueden crear asignaciones con cualquier profesor_id
CREATE POLICY "Teachers and admins can create asignaciones"
  ON asignaciones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    AND (
      -- Si es PROF, debe usar su propio profesor_id
      (profesor_id = auth.uid()::text AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'PROF'
      ))
      -- Si es ADMIN, puede usar cualquier profesor_id
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
      )
    )
  );

-- ============================================================================
-- 2. Actualizar política de INSERT en feedbacks_semanal
-- ============================================================================

-- Eliminar la política existente que requiere profesor_id = auth.uid()
DROP POLICY IF EXISTS "Teachers and admins can create feedbacks_semanal" ON feedbacks_semanal;

-- Crear nueva política que permite:
-- - PROF: solo pueden crear feedbacks con su propio profesor_id
-- - ADMIN: pueden crear feedbacks con cualquier profesor_id
CREATE POLICY "Teachers and admins can create feedbacks_semanal"
  ON feedbacks_semanal
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    AND (
      -- Si es PROF, debe usar su propio profesor_id
      (profesor_id = auth.uid()::text AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'PROF'
      ))
      -- Si es ADMIN, puede usar cualquier profesor_id
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
      )
    )
  );

-- ============================================================================
-- 3. Verificar políticas actuales (opcional, solo para debugging)
-- ============================================================================

-- Para verificar las políticas de asignaciones:
-- SELECT * FROM pg_policies WHERE tablename = 'asignaciones' AND policyname LIKE '%create%';

-- Para verificar las políticas de feedbacks_semanal:
-- SELECT * FROM pg_policies WHERE tablename = 'feedbacks_semanal' AND policyname LIKE '%create%';

-- ============================================================================
-- Comentarios
-- ============================================================================

COMMENT ON POLICY "Teachers and admins can create asignaciones" ON asignaciones IS 
  'Permite a PROF crear asignaciones solo con su propio profesor_id. Permite a ADMIN crear asignaciones con cualquier profesor_id.';

COMMENT ON POLICY "Teachers and admins can create feedbacks_semanal" ON feedbacks_semanal IS 
  'Permite a PROF crear feedbacks solo con su propio profesor_id. Permite a ADMIN crear feedbacks con cualquier profesor_id.';

