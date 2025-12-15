-- ============================================================================
-- Migration: Add Backpack Columns to registros_bloque
-- ============================================================================

-- Add backpack_key column (nullable)
ALTER TABLE registros_bloque 
ADD COLUMN IF NOT EXISTS backpack_key TEXT DEFAULT NULL;

-- Add ppm_objetivo column (nullable, integer)
ALTER TABLE registros_bloque 
ADD COLUMN IF NOT EXISTS ppm_objetivo INTEGER DEFAULT NULL;

-- Add variation_key column (nullable)
ALTER TABLE registros_bloque 
ADD COLUMN IF NOT EXISTS variation_key TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN registros_bloque.backpack_key IS 'Identificador único del ejercicio (snapshot) para trazabilidad en mochila';
COMMENT ON COLUMN registros_bloque.ppm_objetivo IS 'PPM objetivo del ejercicio al momento de la ejecución';
COMMENT ON COLUMN registros_bloque.variation_key IS 'Identificador de la variación ejecutada (si aplica)';

-- ============================================================================
-- End Migration
-- ============================================================================
