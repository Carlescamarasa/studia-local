-- ============================================================================
-- Esquema de Base de Datos para Piezas - Studia
-- ============================================================================
-- 
-- Este script crea la tabla piezas para almacenar las piezas musicales
-- que los estudiantes practican.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: piezas
-- ============================================================================
-- Almacena las piezas musicales con sus elementos (partituras, audios, videos, etc.)
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - nombre: Nombre de la pieza
-- - descripcion: Descripción de la pieza
-- - nivel: Nivel de dificultad (principiante, intermedio, avanzado)
-- - tiempo_objetivo_seg: Tiempo objetivo en segundos
-- - elementos: Array JSON con elementos de la pieza (partituras, audios, videos)
-- - profesor_id: ID del profesor que creó la pieza
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS piezas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  nivel TEXT NOT NULL DEFAULT 'principiante' CHECK (nivel IN ('principiante', 'intermedio', 'avanzado')),
  tiempo_objetivo_seg INTEGER NOT NULL DEFAULT 0,
  elementos JSONB NOT NULL DEFAULT '[]'::jsonb,
  profesor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_piezas_profesor_id ON piezas(profesor_id);

-- Índice para búsquedas por nivel
CREATE INDEX IF NOT EXISTS idx_piezas_nivel ON piezas(nivel);

-- Índice para búsquedas por nombre (búsqueda de texto)
CREATE INDEX IF NOT EXISTS idx_piezas_nombre ON piezas USING gin(to_tsvector('spanish', nombre));

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_piezas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_piezas_updated_at
  BEFORE UPDATE ON piezas
  FOR EACH ROW
  EXECUTE FUNCTION update_piezas_updated_at();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE piezas ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer piezas
CREATE POLICY "Users can read piezas"
  ON piezas
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Solo profesores y admins pueden crear piezas
CREATE POLICY "Teachers and admins can create piezas"
  ON piezas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo el creador o admins pueden actualizar piezas
CREATE POLICY "Creators and admins can update piezas"
  ON piezas
  FOR UPDATE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo el creador o admins pueden eliminar piezas
CREATE POLICY "Creators and admins can delete piezas"
  ON piezas
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

COMMENT ON TABLE piezas IS 'Piezas musicales que los estudiantes practican';
COMMENT ON COLUMN piezas.id IS 'Identificador único de la pieza (TEXT para compatibilidad)';
COMMENT ON COLUMN piezas.nombre IS 'Nombre de la pieza';
COMMENT ON COLUMN piezas.descripcion IS 'Descripción de la pieza';
COMMENT ON COLUMN piezas.nivel IS 'Nivel de dificultad: principiante, intermedio, avanzado';
COMMENT ON COLUMN piezas.tiempo_objetivo_seg IS 'Tiempo objetivo de práctica en segundos';
COMMENT ON COLUMN piezas.elementos IS 'Array JSON con elementos de la pieza: [{nombre, mediaLinks[]}]';
COMMENT ON COLUMN piezas.profesor_id IS 'ID del profesor que creó la pieza';
COMMENT ON COLUMN piezas.created_at IS 'Fecha de creación de la pieza';
COMMENT ON COLUMN piezas.updated_at IS 'Fecha de última actualización de la pieza';

