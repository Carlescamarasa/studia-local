-- ============================================================================
-- Esquema de Base de Datos para Feedbacks Semanales - Studia
-- ============================================================================
-- 
-- Este script crea la tabla feedbacks_semanal para almacenar los feedbacks
-- que los profesores dan a los estudiantes cada semana.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: feedbacks_semanal
-- ============================================================================
-- Almacena los feedbacks semanales que los profesores dan a los estudiantes
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - alumno_id: ID del estudiante
-- - profesor_id: ID del profesor que da el feedback
-- - semana_inicio_iso: Fecha de inicio de la semana (DATE en formato ISO)
-- - nota_profesor: Nota/comentario del profesor
-- - media_links: Array JSON con enlaces a medios (videos, audios, imágenes)
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedbacks_semanal (
  id TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL,
  profesor_id TEXT NOT NULL,
  semana_inicio_iso DATE NOT NULL,
  nota_profesor TEXT NOT NULL,
  media_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por estudiante
CREATE INDEX IF NOT EXISTS idx_feedbacks_semanal_alumno_id ON feedbacks_semanal(alumno_id);

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_feedbacks_semanal_profesor_id ON feedbacks_semanal(profesor_id);

-- Índice para búsquedas por semana de inicio
CREATE INDEX IF NOT EXISTS idx_feedbacks_semanal_semana_inicio_iso ON feedbacks_semanal(semana_inicio_iso);

-- Índice compuesto único para evitar duplicados (alumno + profesor + semana)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_semanal_unique ON feedbacks_semanal(alumno_id, profesor_id, semana_inicio_iso);

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feedbacks_semanal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_feedbacks_semanal_updated_at
  BEFORE UPDATE ON feedbacks_semanal
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_semanal_updated_at();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE feedbacks_semanal ENABLE ROW LEVEL SECURITY;

-- Política: Los estudiantes pueden leer sus propios feedbacks
CREATE POLICY "Students can read own feedbacks_semanal"
  ON feedbacks_semanal
  FOR SELECT
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los profesores pueden leer feedbacks de sus estudiantes
CREATE POLICY "Teachers can read students feedbacks_semanal"
  ON feedbacks_semanal
  FOR SELECT
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo profesores y admins pueden crear feedbacks
CREATE POLICY "Teachers and admins can create feedbacks_semanal"
  ON feedbacks_semanal
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    AND profesor_id = auth.uid()::text
  );

-- Política: Solo el profesor creador o admins pueden actualizar feedbacks
CREATE POLICY "Creators and admins can update feedbacks_semanal"
  ON feedbacks_semanal
  FOR UPDATE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo el profesor creador o admins pueden eliminar feedbacks
CREATE POLICY "Creators and admins can delete feedbacks_semanal"
  ON feedbacks_semanal
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

COMMENT ON TABLE feedbacks_semanal IS 'Feedbacks semanales que los profesores dan a los estudiantes';
COMMENT ON COLUMN feedbacks_semanal.id IS 'Identificador único del feedback (TEXT para compatibilidad)';
COMMENT ON COLUMN feedbacks_semanal.alumno_id IS 'ID del estudiante';
COMMENT ON COLUMN feedbacks_semanal.profesor_id IS 'ID del profesor que da el feedback';
COMMENT ON COLUMN feedbacks_semanal.semana_inicio_iso IS 'Fecha de inicio de la semana en formato ISO (YYYY-MM-DD)';
COMMENT ON COLUMN feedbacks_semanal.nota_profesor IS 'Nota/comentario del profesor';
COMMENT ON COLUMN feedbacks_semanal.media_links IS 'Array JSON con enlaces a medios (videos, audios, imágenes)';
COMMENT ON COLUMN feedbacks_semanal.created_at IS 'Fecha de creación del feedback';
COMMENT ON COLUMN feedbacks_semanal.updated_at IS 'Fecha de última actualización del feedback';

