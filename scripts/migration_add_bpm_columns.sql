-- Migration: Añadir columnas para tracking técnico (BPM) en registros_bloque
-- Fecha: 2025-12-04

-- Añadir columna ppm_objetivo (BPM objetivo del bloque)
ALTER TABLE public.registros_bloque
ADD COLUMN IF NOT EXISTS ppm_objetivo JSONB;

-- Añadir columna ppm_alcanzado (BPM alcanzado por el estudiante)
ALTER TABLE public.registros_bloque
ADD COLUMN IF NOT EXISTS ppm_alcanzado JSONB;

-- Añadir columna completado_en (timestamp de finalización)
ALTER TABLE public.registros_bloque
ADD COLUMN IF NOT EXISTS completado_en TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN public.registros_bloque.ppm_objetivo IS 'BPM objetivo del bloque en formato JSON: {"bpm": 120}';
COMMENT ON COLUMN public.registros_bloque.ppm_alcanzado IS 'BPM alcanzado por el estudiante en formato JSON: {"bpm": 115}';
COMMENT ON COLUMN public.registros_bloque.completado_en IS 'Timestamp de cuándo se completó el bloque (para filtrar por tiempo)';

-- Verificación
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'registros_bloque'
  AND column_name IN ('ppm_objetivo', 'ppm_alcanzado', 'completado_en');
