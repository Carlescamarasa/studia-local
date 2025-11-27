-- ============================================================================
-- Migración: Añadir políticas RLS para eventos_calendario
-- 
-- Añade políticas de Row Level Security para permitir:
-- - SELECT: Todos los usuarios autenticados pueden leer eventos (respetando visible_para)
-- - INSERT/UPDATE/DELETE: Solo PROF y ADMIN pueden crear/actualizar/borrar eventos
-- 
-- IMPORTANTE: Usa el mismo patrón que otras tablas (asignaciones, feedbacks_semanal, bloques)
-- ============================================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes (por si hay conflictos)
-- Esto asegura que no haya políticas antiguas que interfieran
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'eventos_calendario') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON eventos_calendario', r.policyname);
  END LOOP;
END $$;

-- Política: Todos los usuarios autenticados pueden leer eventos
-- Respetando la columna visible_para (si el rol del usuario está en el array)
-- Usa el mismo patrón que otras tablas (ver schema-bloques.sql, schema-planes.sql)
CREATE POLICY "Users can read eventos_calendario"
  ON eventos_calendario
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Si visible_para es NULL o vacío, visible para todos los autenticados
      visible_para IS NULL 
      OR array_length(visible_para, 1) IS NULL
      OR (
        -- Verificar si el rol del usuario está en visible_para
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = ANY(visible_para)
        )
      )
    )
  );

-- Política: Solo PROF y ADMIN pueden crear eventos
-- Usa el mismo patrón exacto que "Teachers and admins can create bloques"
CREATE POLICY "Teachers and admins can create eventos_calendario"
  ON eventos_calendario
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo PROF y ADMIN pueden actualizar eventos
-- Usa el mismo patrón que "Creators and admins can update bloques"
CREATE POLICY "Creators and admins can update eventos_calendario"
  ON eventos_calendario
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo PROF y ADMIN pueden borrar eventos
-- Usa el mismo patrón que "Creators and admins can delete bloques"
CREATE POLICY "Creators and admins can delete eventos_calendario"
  ON eventos_calendario
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- ============================================================================
-- Comentarios
-- ============================================================================

COMMENT ON POLICY "Users can read eventos_calendario" ON eventos_calendario IS 
  'Permite a todos los usuarios autenticados leer eventos, respetando la columna visible_para';

COMMENT ON POLICY "Teachers and admins can create eventos_calendario" ON eventos_calendario IS 
  'Permite a PROF y ADMIN crear eventos del calendario. Usa el mismo patrón que otras tablas.';

COMMENT ON POLICY "Creators and admins can update eventos_calendario" ON eventos_calendario IS 
  'Permite a PROF y ADMIN actualizar eventos del calendario. Usa el mismo patrón que otras tablas.';

COMMENT ON POLICY "Creators and admins can delete eventos_calendario" ON eventos_calendario IS 
  'Permite a PROF y ADMIN borrar eventos del calendario. Usa el mismo patrón que otras tablas.';

