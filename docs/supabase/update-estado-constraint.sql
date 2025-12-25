-- ============================================================================
-- Actualización del CHECK constraint para el campo 'estado' en asignaciones
-- ============================================================================
-- 
-- Este script actualiza el constraint del campo `estado` para incluir los
-- valores que se usan en la aplicación: 'cerrada' y 'en_curso'
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el SQL Editor de Supabase
-- ============================================================================

-- Paso 1: Eliminar el constraint existente
ALTER TABLE asignaciones DROP CONSTRAINT IF EXISTS asignaciones_estado_check;

-- Paso 2: Crear el nuevo constraint con todos los estados permitidos
ALTER TABLE asignaciones ADD CONSTRAINT asignaciones_estado_check 
  CHECK (estado IN ('borrador', 'publicada', 'archivada', 'cerrada', 'en_curso'));

-- Paso 3: Actualizar el comentario de la columna
COMMENT ON COLUMN asignaciones.estado IS 'Estado de la asignación: borrador, publicada, archivada, cerrada, en_curso';
