-- ============================================================================
-- Esquema de Base de Datos para Planes - Studia
-- ============================================================================
-- 
-- Este script crea la tabla planes para almacenar los planes de práctica
-- con su estructura anidada de semanas, sesiones y bloques.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: planes
-- ============================================================================
-- Almacena los planes de práctica con estructura anidada (semanas → sesiones → bloques)
--
-- Campos:
-- - id: Identificador único (TEXT para mantener compatibilidad con IDs existentes)
-- - nombre: Nombre del plan
-- - foco_general: Foco general del plan (GEN, LIG, RIT, ART, S&A)
-- - objetivo_semanal_por_defecto: Objetivo semanal por defecto
-- - pieza_id: ID de la pieza asociada
-- - profesor_id: ID del profesor que creó el plan
-- - semanas: Estructura JSONB completa con semanas, sesiones y bloques
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS planes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  foco_general TEXT NOT NULL DEFAULT 'GEN' CHECK (foco_general IN ('GEN', 'LIG', 'RIT', 'ART', 'S&A')),
  objetivo_semanal_por_defecto TEXT,
  pieza_id TEXT NOT NULL,
  profesor_id TEXT NOT NULL,
  semanas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por profesor
CREATE INDEX IF NOT EXISTS idx_planes_profesor_id ON planes(profesor_id);

-- Índice para búsquedas por pieza
CREATE INDEX IF NOT EXISTS idx_planes_pieza_id ON planes(pieza_id);

-- Índice para búsquedas por foco
CREATE INDEX IF NOT EXISTS idx_planes_foco_general ON planes(foco_general);

-- Índice GIN para búsquedas en el JSONB de semanas
CREATE INDEX IF NOT EXISTS idx_planes_semanas ON planes USING gin(semanas);

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_planes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_planes_updated_at
  BEFORE UPDATE ON planes
  FOR EACH ROW
  EXECUTE FUNCTION update_planes_updated_at();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer planes
CREATE POLICY "Users can read planes"
  ON planes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Solo profesores y admins pueden crear planes
CREATE POLICY "Teachers and admins can create planes"
  ON planes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Política: Solo el creador o admins pueden actualizar planes
CREATE POLICY "Creators and admins can update planes"
  ON planes
  FOR UPDATE
  USING (
    profesor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Política: Solo el creador o admins pueden eliminar planes
CREATE POLICY "Creators and admins can delete planes"
  ON planes
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

COMMENT ON TABLE planes IS 'Planes de práctica con estructura anidada de semanas, sesiones y bloques';
COMMENT ON COLUMN planes.id IS 'Identificador único del plan (TEXT para compatibilidad)';
COMMENT ON COLUMN planes.nombre IS 'Nombre del plan';
COMMENT ON COLUMN planes.foco_general IS 'Foco general del plan: GEN (General), LIG (Ligaduras), RIT (Ritmo), ART (Articulación), S&A (Sonido y Afinación)';
COMMENT ON COLUMN planes.objetivo_semanal_por_defecto IS 'Objetivo semanal por defecto del plan';
COMMENT ON COLUMN planes.pieza_id IS 'ID de la pieza asociada al plan';
COMMENT ON COLUMN planes.profesor_id IS 'ID del profesor que creó el plan';
COMMENT ON COLUMN planes.semanas IS 'Estructura JSONB completa con semanas, sesiones y bloques: [{nombre, foco, objetivo, sesiones: [{nombre, foco, bloques[], rondas[]}]}]';
COMMENT ON COLUMN planes.created_at IS 'Fecha de creación del plan';
COMMENT ON COLUMN planes.updated_at IS 'Fecha de última actualización del plan';

