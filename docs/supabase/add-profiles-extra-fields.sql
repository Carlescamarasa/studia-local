-- ============================================================================
-- Script SQL para añadir campos adicionales a la tabla profiles
-- ============================================================================
-- 
-- Este script añade los campos que faltan en la tabla profiles:
-- - nivel: Nivel técnico del usuario (principiante, intermedio, avanzado, profesional)
-- - telefono: Teléfono del usuario
-- - mediaLinks: Enlaces de medios (JSONB array)
--
-- IMPORTANTE: Ejecuta este script ANTES de ejecutar update-profiles-from-localdata.sql
-- ============================================================================

-- Añadir columna nivel (nivel técnico del usuario)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nivel TEXT 
CHECK (nivel IN ('principiante', 'intermedio', 'avanzado', 'profesional') OR nivel IS NULL);

-- Añadir columna telefono
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- Añadir columna mediaLinks (array JSONB para enlaces de medios)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS media_links JSONB DEFAULT '[]'::jsonb;

-- Crear índice para búsquedas por nivel (opcional, pero útil)
CREATE INDEX IF NOT EXISTS idx_profiles_nivel ON profiles(nivel) 
WHERE nivel IS NOT NULL;

-- Comentarios en las nuevas columnas
COMMENT ON COLUMN profiles.nivel IS 'Nivel técnico del usuario: principiante, intermedio, avanzado, profesional';
COMMENT ON COLUMN profiles.telefono IS 'Teléfono de contacto del usuario';
COMMENT ON COLUMN profiles.media_links IS 'Array JSONB con enlaces de medios del usuario: [{type, url, title}]';

