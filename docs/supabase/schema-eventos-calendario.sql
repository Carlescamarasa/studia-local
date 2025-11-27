-- ============================================================================
-- Tabla: eventos_calendario
-- 
-- Almacena eventos importantes del calendario (encuentros, masterclasses,
-- colectivas, etc.) que pueden ser creados por ADMIN o PROF y son visibles
-- para los roles especificados.
-- ============================================================================

CREATE TABLE IF NOT EXISTS eventos_calendario (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- Opcional, para eventos de varios días
  tipo TEXT NOT NULL CHECK (tipo IN ('encuentro', 'masterclass', 'colectiva', 'otro')),
  creado_por_id TEXT NOT NULL, -- ID del usuario que creó el evento
  visible_para TEXT[] DEFAULT ARRAY['ESTU', 'PROF', 'ADMIN'], -- Roles que pueden verlo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_inicio ON eventos_calendario(fecha_inicio);

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_calendario(tipo);

-- Índice para búsquedas por creador
CREATE INDEX IF NOT EXISTS idx_eventos_creado_por ON eventos_calendario(creado_por_id);

-- Índice compuesto para búsquedas por fecha y tipo
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_tipo ON eventos_calendario(fecha_inicio, tipo);

-- ============================================================================
-- Comentarios de documentación
-- ============================================================================

COMMENT ON TABLE eventos_calendario IS 'Eventos importantes del calendario (encuentros, masterclasses, colectivas, etc.)';
COMMENT ON COLUMN eventos_calendario.fecha_fin IS 'Fecha de fin opcional para eventos de varios días. Si es NULL, el evento es de un solo día.';
COMMENT ON COLUMN eventos_calendario.visible_para IS 'Array de roles que pueden ver este evento. Por defecto visible para todos.';

