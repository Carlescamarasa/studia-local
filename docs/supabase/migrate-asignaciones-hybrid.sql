-- ============================================================================
-- Script de Migración: Arquitectura Híbrida para Asignaciones
-- ============================================================================
-- 
-- Este script migra la tabla asignaciones de un modelo con snapshot único
-- a un modelo híbrido que soporta referencias (plan_id) y snapshots (plan_adaptado)
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- - Haz una copia de seguridad antes de ejecutar
-- ============================================================================

-- ============================================================================
-- Paso 1: Añadir nuevas columnas
-- ============================================================================

-- Añadir columna plan_id (nullable, referencia a planes.id)
ALTER TABLE asignaciones
ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Añadir columna plan_adaptado (nullable JSONB, será el nuevo nombre de plan)
ALTER TABLE asignaciones
ADD COLUMN IF NOT EXISTS plan_adaptado JSONB;

-- ============================================================================
-- Paso 2: Migrar datos existentes
-- ============================================================================

-- Migrar datos: plan → plan_adaptado, plan_id = NULL
-- Esto mantiene compatibilidad con asignaciones existentes
UPDATE asignaciones
SET 
  plan_adaptado = plan,
  plan_id = NULL
WHERE plan IS NOT NULL AND plan_adaptado IS NULL;

-- ============================================================================
-- Paso 3: Añadir constraint de validación
-- ============================================================================

-- Asegurar que al menos uno de los dos campos esté presente
ALTER TABLE asignaciones
ADD CONSTRAINT check_plan_reference_or_snapshot
CHECK (plan_id IS NOT NULL OR plan_adaptado IS NOT NULL);

-- ============================================================================
-- Paso 4: Añadir índice para plan_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_asignaciones_plan_id 
ON asignaciones(plan_id);

-- ============================================================================
-- Paso 5: Actualizar comentarios
-- ============================================================================

COMMENT ON COLUMN asignaciones.plan_id IS 'ID del plan plantilla (referencia). Si es NULL, se usa plan_adaptado';
COMMENT ON COLUMN asignaciones.plan_adaptado IS 'Snapshot del plan adaptado (JSONB). Si es NULL, se usa plan_id para cargar desde planes';

-- ============================================================================
-- Paso 6: (OPCIONAL) Eliminar columna plan antigua
-- ============================================================================
-- Descomenta estas líneas SOLO después de verificar que todo funciona correctamente
-- y que no hay referencias al campo 'plan' en el código

-- ALTER TABLE asignaciones DROP COLUMN IF EXISTS plan;

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que la migración fue exitosa
SELECT 
  COUNT(*) as total_asignaciones,
  COUNT(plan_id) as con_plan_id,
  COUNT(plan_adaptado) as con_plan_adaptado,
  COUNT(CASE WHEN plan_id IS NOT NULL AND plan_adaptado IS NOT NULL THEN 1 END) as con_ambos,
  COUNT(CASE WHEN plan_id IS NULL AND plan_adaptado IS NULL THEN 1 END) as sin_ninguno
FROM asignaciones;

