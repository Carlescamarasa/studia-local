-- ============================================================================
-- Esquema de Base de Datos para Registros de Bloque - Studia
-- ============================================================================
-- 
-- Este script crea la tabla registros_bloque para almacenar los registros
-- detallados de cada bloque ejecutado en una sesión.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: registros_bloque
-- ============================================================================
-- Almacena los registros detallados de cada bloque ejecutado en una sesión
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - registro_sesion_id: ID del registro de sesión asociado
-- - asignacion_id: ID de la asignación asociada
-- - alumno_id: ID del estudiante
-- - semana_idx: Índice de la semana (0-based)
-- - sesion_idx: Índice de la sesión (0-based)
-- - orden_ejecucion: Orden de ejecución del bloque en la sesión
-- - tipo: Tipo de bloque (CA, CB, TC, TM, FM, VC, AD)
-- - code: Código del bloque
-- - nombre: Nombre del bloque
-- - duracion_objetivo_seg: Duración objetivo en segundos
-- - duracion_real_seg: Duración real en segundos
-- - estado: Estado del bloque (completado, omitido)
-- - inicios_pausa: Número de veces que se pausó
-- - inicio_iso: Fecha y hora de inicio (TIMESTAMPTZ)
-- - fin_iso: Fecha y hora de fin (TIMESTAMPTZ)
-- - created_at: Timestamp de creación
-- ============================================================================

CREATE TABLE IF NOT EXISTS registros_bloque (
  id TEXT PRIMARY KEY,
  registro_sesion_id TEXT NOT NULL,
  asignacion_id TEXT NOT NULL,
  alumno_id TEXT NOT NULL,
  semana_idx INTEGER NOT NULL DEFAULT 0,
  sesion_idx INTEGER NOT NULL DEFAULT 0,
  orden_ejecucion INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')),
  code TEXT NOT NULL,
  nombre TEXT NOT NULL,
  duracion_objetivo_seg INTEGER NOT NULL DEFAULT 0,
  duracion_real_seg INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'completado' CHECK (estado IN ('completado', 'omitido')),
  inicios_pausa INTEGER NOT NULL DEFAULT 0,
  inicio_iso TIMESTAMPTZ NOT NULL,
  fin_iso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por registro de sesión
CREATE INDEX IF NOT EXISTS idx_registros_bloque_registro_sesion_id ON registros_bloque(registro_sesion_id);

-- Índice para búsquedas por asignación
CREATE INDEX IF NOT EXISTS idx_registros_bloque_asignacion_id ON registros_bloque(asignacion_id);

-- Índice para búsquedas por estudiante
CREATE INDEX IF NOT EXISTS idx_registros_bloque_alumno_id ON registros_bloque(alumno_id);

-- Índice para búsquedas por tipo de bloque
CREATE INDEX IF NOT EXISTS idx_registros_bloque_tipo ON registros_bloque(tipo);

-- Índice compuesto para búsquedas comunes (registro_sesion + orden)
CREATE INDEX IF NOT EXISTS idx_registros_bloque_sesion_orden ON registros_bloque(registro_sesion_id, orden_ejecucion);

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE registros_bloque ENABLE ROW LEVEL SECURITY;

-- Política: Los estudiantes pueden leer sus propios registros de bloque
CREATE POLICY "Students can read own registros_bloque"
  ON registros_bloque
  FOR SELECT
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los profesores pueden leer registros de bloque de sus estudiantes
CREATE POLICY "Teachers can read students registros_bloque"
  ON registros_bloque
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM asignaciones a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = registros_bloque.asignacion_id
      AND (a.profesor_id = auth.uid()::text OR p.role = 'ADMIN')
    )
  );

-- Política: Los estudiantes pueden crear sus propios registros de bloque
CREATE POLICY "Students can create own registros_bloque"
  ON registros_bloque
  FOR INSERT
  WITH CHECK (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Los estudiantes pueden actualizar sus propios registros de bloque
CREATE POLICY "Students can update own registros_bloque"
  ON registros_bloque
  FOR UPDATE
  USING (
    alumno_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo admins pueden eliminar registros de bloque
CREATE POLICY "Admins can delete registros_bloque"
  ON registros_bloque
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

COMMENT ON TABLE registros_bloque IS 'Registros detallados de cada bloque ejecutado en una sesión';
COMMENT ON COLUMN registros_bloque.id IS 'Identificador único del registro (TEXT para compatibilidad)';
COMMENT ON COLUMN registros_bloque.registro_sesion_id IS 'ID del registro de sesión asociado';
COMMENT ON COLUMN registros_bloque.asignacion_id IS 'ID de la asignación asociada';
COMMENT ON COLUMN registros_bloque.alumno_id IS 'ID del estudiante';
COMMENT ON COLUMN registros_bloque.semana_idx IS 'Índice de la semana (0-based)';
COMMENT ON COLUMN registros_bloque.sesion_idx IS 'Índice de la sesión (0-based)';
COMMENT ON COLUMN registros_bloque.orden_ejecucion IS 'Orden de ejecución del bloque en la sesión';
COMMENT ON COLUMN registros_bloque.tipo IS 'Tipo de bloque: CA, CB, TC, TM, FM, VC, AD';
COMMENT ON COLUMN registros_bloque.code IS 'Código del bloque';
COMMENT ON COLUMN registros_bloque.nombre IS 'Nombre del bloque';
COMMENT ON COLUMN registros_bloque.duracion_objetivo_seg IS 'Duración objetivo del bloque en segundos';
COMMENT ON COLUMN registros_bloque.duracion_real_seg IS 'Duración real del bloque en segundos';
COMMENT ON COLUMN registros_bloque.estado IS 'Estado del bloque: completado, omitido';
COMMENT ON COLUMN registros_bloque.inicios_pausa IS 'Número de veces que se pausó el bloque';
COMMENT ON COLUMN registros_bloque.inicio_iso IS 'Fecha y hora de inicio del bloque';
COMMENT ON COLUMN registros_bloque.fin_iso IS 'Fecha y hora de fin del bloque';
COMMENT ON COLUMN registros_bloque.created_at IS 'Fecha de creación del registro';

