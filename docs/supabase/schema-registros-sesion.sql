-- ============================================================================
-- Esquema de Base de Datos para Registros de Sesión - Studia
-- ============================================================================
-- 
-- Este script crea la tabla registros_sesion para almacenar los registros
-- de las sesiones de práctica de los estudiantes.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: registros_sesion
-- ============================================================================
-- Almacena los registros de sesiones de práctica de los estudiantes
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - asignacion_id: ID de la asignación asociada
-- - alumno_id: ID del estudiante
-- - profesor_asignado_id: ID del profesor asignado
-- - semana_idx: Índice de la semana (0-based)
-- - sesion_idx: Índice de la sesión (0-based)
-- - inicio_iso: Fecha y hora de inicio (TIMESTAMPTZ)
-- - fin_iso: Fecha y hora de fin (TIMESTAMPTZ)
-- - duracion_real_seg: Duración real en segundos
-- - duracion_objetivo_seg: Duración objetivo en segundos
-- - bloques_totales: Total de bloques en la sesión
-- - bloques_completados: Bloques completados
-- - bloques_omitidos: Bloques omitidos
-- - finalizada: Si la sesión fue finalizada
-- - fin_anticipado: Si la sesión terminó anticipadamente
-- - motivo_fin: Motivo de finalización (nullable)
-- - calificacion: Calificación de 1 a 4 (nullable)
-- - notas: Notas adicionales (nullable)
-- - dispositivo: Dispositivo desde el que se registró
-- - version_schema: Versión del esquema
-- - pieza_nombre: Nombre de la pieza (snapshot)
-- - plan_nombre: Nombre del plan (snapshot)
-- - semana_nombre: Nombre de la semana (snapshot)
-- - sesion_nombre: Nombre de la sesión (snapshot)
-- - foco: Foco de la sesión
-- - created_at: Timestamp de creación
-- ============================================================================

CREATE TABLE IF NOT EXISTS registros_sesion (
  id TEXT PRIMARY KEY,
  asignacion_id TEXT NOT NULL,
  alumno_id TEXT NOT NULL,
  profesor_asignado_id TEXT NOT NULL,
  semana_idx INTEGER NOT NULL DEFAULT 0,
  sesion_idx INTEGER NOT NULL DEFAULT 0,
  inicio_iso TIMESTAMPTZ NOT NULL,
  fin_iso TIMESTAMPTZ,
  duracion_real_seg INTEGER NOT NULL DEFAULT 0,
  duracion_objetivo_seg INTEGER NOT NULL DEFAULT 0,
  bloques_totales INTEGER NOT NULL DEFAULT 0,
  bloques_completados INTEGER NOT NULL DEFAULT 0,
  bloques_omitidos INTEGER NOT NULL DEFAULT 0,
  finalizada BOOLEAN NOT NULL DEFAULT false,
  fin_anticipado BOOLEAN NOT NULL DEFAULT false,
  motivo_fin TEXT,
  calificacion INTEGER CHECK (calificacion IS NULL OR (calificacion >= 1 AND calificacion <= 4)),
  notas TEXT,
  dispositivo TEXT,
  version_schema TEXT,
  pieza_nombre TEXT,
  plan_nombre TEXT,
  semana_nombre TEXT,
  sesion_nombre TEXT,
  foco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por estudiante
CREATE INDEX IF NOT EXISTS idx_registros_sesion_alumno_id ON registros_sesion(alumno_id);

-- Índice para búsquedas por asignación
CREATE INDEX IF NOT EXISTS idx_registros_sesion_asignacion_id ON registros_sesion(asignacion_id);

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_registros_sesion_profesor_asignado_id ON registros_sesion(profesor_asignado_id);

-- Índice para búsquedas por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_registros_sesion_inicio_iso ON registros_sesion(inicio_iso);

-- Índice compuesto para búsquedas comunes (alumno + fecha)
CREATE INDEX IF NOT EXISTS idx_registros_sesion_alumno_fecha ON registros_sesion(alumno_id, inicio_iso DESC);

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE registros_sesion ENABLE ROW LEVEL SECURITY;

-- Política: Los estudiantes pueden leer sus propios registros
CREATE POLICY "Students can read own registros_sesion"
  ON registros_sesion
  FOR SELECT
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los profesores pueden leer registros de sus estudiantes
CREATE POLICY "Teachers can read students registros_sesion"
  ON registros_sesion
  FOR SELECT
  USING (
    profesor_asignado_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Los estudiantes pueden crear sus propios registros
CREATE POLICY "Students can create own registros_sesion"
  ON registros_sesion
  FOR INSERT
  WITH CHECK (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los estudiantes pueden actualizar sus propios registros
CREATE POLICY "Students can update own registros_sesion"
  ON registros_sesion
  FOR UPDATE
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo admins pueden eliminar registros
CREATE POLICY "Admins can delete registros_sesion"
  ON registros_sesion
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- Comentarios en la tabla y columnas
-- ============================================================================

COMMENT ON TABLE registros_sesion IS 'Registros de sesiones de práctica de los estudiantes';
COMMENT ON COLUMN registros_sesion.id IS 'Identificador único del registro (TEXT para compatibilidad)';
COMMENT ON COLUMN registros_sesion.asignacion_id IS 'ID de la asignación asociada';
COMMENT ON COLUMN registros_sesion.alumno_id IS 'ID del estudiante';
COMMENT ON COLUMN registros_sesion.profesor_asignado_id IS 'ID del profesor asignado';
COMMENT ON COLUMN registros_sesion.semana_idx IS 'Índice de la semana (0-based)';
COMMENT ON COLUMN registros_sesion.sesion_idx IS 'Índice de la sesión (0-based)';
COMMENT ON COLUMN registros_sesion.inicio_iso IS 'Fecha y hora de inicio de la sesión';
COMMENT ON COLUMN registros_sesion.fin_iso IS 'Fecha y hora de fin de la sesión';
COMMENT ON COLUMN registros_sesion.duracion_real_seg IS 'Duración real de la sesión en segundos';
COMMENT ON COLUMN registros_sesion.duracion_objetivo_seg IS 'Duración objetivo de la sesión en segundos';
COMMENT ON COLUMN registros_sesion.bloques_totales IS 'Total de bloques en la sesión';
COMMENT ON COLUMN registros_sesion.bloques_completados IS 'Número de bloques completados';
COMMENT ON COLUMN registros_sesion.bloques_omitidos IS 'Número de bloques omitidos';
COMMENT ON COLUMN registros_sesion.finalizada IS 'Indica si la sesión fue finalizada';
COMMENT ON COLUMN registros_sesion.fin_anticipado IS 'Indica si la sesión terminó anticipadamente';
COMMENT ON COLUMN registros_sesion.motivo_fin IS 'Motivo de finalización de la sesión';
COMMENT ON COLUMN registros_sesion.calificacion IS 'Calificación de la sesión (1-4)';
COMMENT ON COLUMN registros_sesion.notas IS 'Notas adicionales de la sesión';
COMMENT ON COLUMN registros_sesion.dispositivo IS 'Dispositivo desde el que se registró la sesión';
COMMENT ON COLUMN registros_sesion.version_schema IS 'Versión del esquema usado';
COMMENT ON COLUMN registros_sesion.created_at IS 'Fecha de creación del registro';

