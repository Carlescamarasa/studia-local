-- ============================================================================
-- Esquema de Base de Datos para Bloques - Studia
-- ============================================================================
-- 
-- Este script crea la tabla bloques para almacenar los ejercicios/bloques
-- que forman parte de las sesiones de práctica.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: bloques
-- ============================================================================
-- Almacena los ejercicios/bloques de práctica (calentamiento, técnica, fragmentos, etc.)
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - nombre: Nombre del bloque/ejercicio
-- - code: Código único del bloque (ej: CA-0001, TC-0001)
-- - tipo: Tipo de bloque (CA, CB, TC, TM, FM, VC, AD)
-- - duracion_seg: Duración objetivo en segundos
-- - instrucciones: Instrucciones para realizar el ejercicio
-- - indicador_logro: Indicador de logro del ejercicio
-- - materiales_requeridos: Array JSON con materiales requeridos
-- - media_links: Array JSON con enlaces a medios (videos, audios, imágenes)
-- - elementos_ordenados: Array JSON con elementos ordenados de la pieza
-- - pieza_ref_id: ID de la pieza de referencia (nullable)
-- - profesor_id: ID del profesor que creó el bloque
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS bloques (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')),
  duracion_seg INTEGER NOT NULL DEFAULT 0,
  instrucciones TEXT,
  indicador_logro TEXT,
  materiales_requeridos JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  elementos_ordenados JSONB NOT NULL DEFAULT '[]'::jsonb,
  pieza_ref_id TEXT,
  profesor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por código (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bloques_code ON bloques(code);

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_bloques_tipo ON bloques(tipo);

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_bloques_profesor_id ON bloques(profesor_id);

-- Índice para búsquedas por pieza de referencia
CREATE INDEX IF NOT EXISTS idx_bloques_pieza_ref_id ON bloques(pieza_ref_id) WHERE pieza_ref_id IS NOT NULL;

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bloques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_bloques_updated_at
  BEFORE UPDATE ON bloques
  FOR EACH ROW
  EXECUTE FUNCTION update_bloques_updated_at();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE bloques ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer bloques
CREATE POLICY "Users can read bloques"
  ON bloques
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Solo profesores y admins pueden crear bloques
CREATE POLICY "Teachers and admins can create bloques"
  ON bloques
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo el creador o admins pueden actualizar bloques
CREATE POLICY "Creators and admins can update bloques"
  ON bloques
  FOR UPDATE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo el creador o admins pueden eliminar bloques
CREATE POLICY "Creators and admins can delete bloques"
  ON bloques
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

COMMENT ON TABLE bloques IS 'Ejercicios/bloques de práctica que forman parte de las sesiones';
COMMENT ON COLUMN bloques.id IS 'Identificador único del bloque (TEXT para compatibilidad)';
COMMENT ON COLUMN bloques.nombre IS 'Nombre del bloque/ejercicio';
COMMENT ON COLUMN bloques.code IS 'Código único del bloque (ej: CA-0001, TC-0001)';
COMMENT ON COLUMN bloques.tipo IS 'Tipo de bloque: CA (Calentamiento A), CB (Calentamiento B), TC (Técnica Central), TM (Técnica Mantenimiento), FM (Fragmento Musical), VC (Vuelta a la Calma), AD (Advertencia)';
COMMENT ON COLUMN bloques.duracion_seg IS 'Duración objetivo del bloque en segundos';
COMMENT ON COLUMN bloques.instrucciones IS 'Instrucciones para realizar el ejercicio';
COMMENT ON COLUMN bloques.indicador_logro IS 'Indicador de logro del ejercicio';
COMMENT ON COLUMN bloques.materiales_requeridos IS 'Array JSON con materiales requeridos';
COMMENT ON COLUMN bloques.media_links IS 'Array JSON con enlaces a medios (videos, audios, imágenes)';
COMMENT ON COLUMN bloques.elementos_ordenados IS 'Array JSON con elementos ordenados de la pieza';
COMMENT ON COLUMN bloques.pieza_ref_id IS 'ID de la pieza de referencia (nullable)';
COMMENT ON COLUMN bloques.profesor_id IS 'ID del profesor que creó el bloque';
COMMENT ON COLUMN bloques.created_at IS 'Fecha de creación del bloque';
COMMENT ON COLUMN bloques.updated_at IS 'Fecha de última actualización del bloque';

