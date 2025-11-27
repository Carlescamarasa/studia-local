-- ============================================================================
-- Agregar campo audio_url a la tabla error_reports
-- ============================================================================
-- 
-- Este script agrega el campo audio_url para almacenar URLs de notas de voz
-- en los reportes de errores.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- Agregar columna audio_url
ALTER TABLE error_reports
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Comentario en la columna
COMMENT ON COLUMN error_reports.audio_url IS 'URL pública de la nota de voz almacenada en Supabase Storage';

