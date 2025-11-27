-- ============================================================================
-- Añadir columna created_by a error_reports
-- ============================================================================
-- 
-- Este script añade la columna created_by a la tabla error_reports
-- para almacenar el ID del usuario que creó el reporte (referencia a profiles.id)
--
-- EJECUTA ESTO EN SUPABASE SQL EDITOR:
-- 1. Supabase Dashboard → SQL Editor → New Query
-- 2. Pega este script completo
-- 3. Ejecuta (Run)
-- ============================================================================

-- Añadir columna created_by que referencia profiles.id
ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Crear índice para mejorar el rendimiento de consultas con JOIN
CREATE INDEX IF NOT EXISTS idx_error_reports_created_by ON error_reports(created_by);

-- Comentario en la columna
COMMENT ON COLUMN error_reports.created_by IS 'ID del usuario que creó el reporte (referencia a profiles.id)';

-- ============================================================================
-- NOTA: Para reportes existentes, created_by será NULL
-- Si quieres migrar datos existentes, puedes ejecutar:
-- UPDATE error_reports SET created_by = user_id WHERE user_id IS NOT NULL;
-- ============================================================================

