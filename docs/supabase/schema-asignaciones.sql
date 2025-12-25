-- ============================================================================
-- Esquema de Base de Datos para Asignaciones - Studia
-- ============================================================================
-- 
-- Este script crea la tabla asignaciones para almacenar las asignaciones
-- de práctica que los profesores hacen a los estudiantes.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: asignaciones
-- ============================================================================
-- Almacena las asignaciones de práctica con snapshots embebidos del plan y pieza
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - alumno_id: ID del estudiante
-- - profesor_id: ID del profesor que creó la asignación
-- - pieza_id: ID de la pieza asignada
-- - semana_inicio_iso: Fecha de inicio de la semana (DATE en formato ISO)
-- - estado: Estado de la asignación (borrador, publicada, archivada)
-- - foco: Foco de la asignación (GEN, LIG, RIT, ART, S&A)
-- - notas: Notas adicionales (nullable)
-- - plan: Snapshot completo del plan embebido como JSONB
-- - pieza_snapshot: Snapshot completo de la pieza embebido como JSONB
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS asignaciones (
  id TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL,
  profesor_id TEXT NOT NULL,
  pieza_id TEXT NOT NULL,
  semana_inicio_iso DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicada', 'archivada', 'cerrada', 'en_curso')),
  foco TEXT NOT NULL DEFAULT 'GEN' CHECK (foco IN ('GEN', 'LIG', 'RIT', 'ART', 'S&A')),
  notas TEXT,
  plan_id TEXT,
  plan_adaptado JSONB,
  plan JSONB, -- Campo legacy, será eliminado después de la migración
  pieza_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_plan_reference_or_snapshot CHECK (plan_id IS NOT NULL OR plan_adaptado IS NOT NULL OR plan IS NOT NULL)
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por estudiante
CREATE INDEX IF NOT EXISTS idx_asignaciones_alumno_id ON asignaciones(alumno_id);

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_asignaciones_profesor_id ON asignaciones(profesor_id);

-- Índice para búsquedas por pieza
CREATE INDEX IF NOT EXISTS idx_asignaciones_pieza_id ON asignaciones(pieza_id);

-- Índice para búsquedas por semana de inicio
CREATE INDEX IF NOT EXISTS idx_asignaciones_semana_inicio_iso ON asignaciones(semana_inicio_iso);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones(estado);

-- Índice para búsquedas por plan_id (referencia a plantilla)
CREATE INDEX IF NOT EXISTS idx_asignaciones_plan_id ON asignaciones(plan_id);

-- Índice compuesto para búsquedas comunes (alumno + semana)
CREATE INDEX IF NOT EXISTS idx_asignaciones_alumno_semana ON asignaciones(alumno_id, semana_inicio_iso);

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_asignaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
-- Eliminar trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS update_asignaciones_updated_at ON asignaciones;
CREATE TRIGGER update_asignaciones_updated_at
  BEFORE UPDATE ON asignaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_asignaciones_updated_at();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de crearlas (para permitir re-ejecución)
DROP POLICY IF EXISTS "Students can read own asignaciones" ON asignaciones;
DROP POLICY IF EXISTS "Teachers can read students asignaciones" ON asignaciones;
DROP POLICY IF EXISTS "Teachers and admins can create asignaciones" ON asignaciones;
DROP POLICY IF EXISTS "Creators and admins can update asignaciones" ON asignaciones;
DROP POLICY IF EXISTS "Creators and admins can delete asignaciones" ON asignaciones;

-- Política: Los estudiantes pueden leer sus propias asignaciones
CREATE POLICY "Students can read own asignaciones"
  ON asignaciones
  FOR SELECT
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los profesores pueden leer asignaciones de sus estudiantes
CREATE POLICY "Teachers can read students asignaciones"
  ON asignaciones
  FOR SELECT
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo profesores y admins pueden crear asignaciones
CREATE POLICY "Teachers and admins can create asignaciones"
  ON asignaciones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    AND profesor_id = auth.uid()::text
  );

-- Política: Solo el profesor creador o admins pueden actualizar asignaciones
CREATE POLICY "Creators and admins can update asignaciones"
  ON asignaciones
  FOR UPDATE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo el profesor creador o admins pueden eliminar asignaciones
CREATE POLICY "Creators and admins can delete asignaciones"
  ON asignaciones
  FOR DELETE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- Comentarios en la tabla y columnas
-- ============================================================================

COMMENT ON TABLE asignaciones IS 'Asignaciones de práctica que los profesores hacen a los estudiantes';
COMMENT ON COLUMN asignaciones.id IS 'Identificador único de la asignación (TEXT para compatibilidad)';
COMMENT ON COLUMN asignaciones.alumno_id IS 'ID del estudiante asignado';
COMMENT ON COLUMN asignaciones.profesor_id IS 'ID del profesor que creó la asignación';
COMMENT ON COLUMN asignaciones.pieza_id IS 'ID de la pieza asignada';
COMMENT ON COLUMN asignaciones.semana_inicio_iso IS 'Fecha de inicio de la semana en formato ISO (YYYY-MM-DD)';
COMMENT ON COLUMN asignaciones.estado IS 'Estado de la asignación: borrador, publicada, archivada, cerrada, en_curso';
COMMENT ON COLUMN asignaciones.foco IS 'Foco de la asignación: GEN, LIG, RIT, ART, S&A';
COMMENT ON COLUMN asignaciones.notas IS 'Notas adicionales de la asignación';
COMMENT ON COLUMN asignaciones.plan_id IS 'ID del plan plantilla (referencia). Si es NULL, se usa plan_adaptado';
COMMENT ON COLUMN asignaciones.plan_adaptado IS 'Snapshot del plan adaptado (JSONB). Si es NULL, se usa plan_id para cargar desde planes';
COMMENT ON COLUMN asignaciones.plan IS 'Campo legacy (será eliminado después de la migración). Usar plan_adaptado o plan_id';
COMMENT ON COLUMN asignaciones.pieza_snapshot IS 'Snapshot completo de la pieza embebido como JSONB';
COMMENT ON COLUMN asignaciones.created_at IS 'Fecha de creación de la asignación';
COMMENT ON COLUMN asignaciones.updated_at IS 'Fecha de última actualización de la asignación';

