-- ============================================================================
-- Migración: Añadir campo media_links a registros_sesion
-- ============================================================================
-- 
-- Este script añade el campo media_links a la tabla registros_sesion
-- para permitir almacenar enlaces de vídeo (YouTube, etc.) asociados a cada sesión.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el SQL Editor de Supabase
-- ============================================================================

-- Añadir columna media_links si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'registros_sesion' 
    AND column_name = 'media_links'
  ) THEN
    ALTER TABLE public.registros_sesion
    ADD COLUMN media_links JSONB DEFAULT '[]'::jsonb;

    -- Añadir comentario a la columna
    COMMENT ON COLUMN public.registros_sesion.media_links IS 'Array JSONB con enlaces a medios (videos, audios, imágenes) asociados a la sesión. Formato: array de strings (URLs) o array de objetos con {type, url, title, etc.}';
  END IF;
END $$;

-- Crear índice GIN para búsquedas en media_links (opcional pero útil)
CREATE INDEX IF NOT EXISTS idx_registros_sesion_media_links 
ON public.registros_sesion USING GIN (media_links);

-- ============================================================================
-- Ejemplo de formato de media_links:
-- ============================================================================
-- 
-- Formato simple (array de strings):
-- ["https://www.youtube.com/watch?v=abc123"]
--
-- Formato completo (array de objetos):
-- [
--   {
--     "type": "youtube",
--     "url": "https://www.youtube.com/watch?v=abc123",
--     "title": "Sesión de estudio - Autoevaluación",
--     "source": "upload-youtube"
--   }
-- ]
--
-- ============================================================================

