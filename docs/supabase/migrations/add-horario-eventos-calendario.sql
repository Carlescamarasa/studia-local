-- ============================================================================
-- Migración: Añadir campos de horario a eventos_calendario
-- 
-- Añade campos start_at, end_at y all_day para soportar eventos con horario
-- específico además de eventos de todo el día.
-- ============================================================================

-- Añadir campos nuevos
ALTER TABLE eventos_calendario 
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false;

-- Crear índices para búsquedas por horario
CREATE INDEX IF NOT EXISTS idx_eventos_start_at ON eventos_calendario(start_at);
CREATE INDEX IF NOT EXISTS idx_eventos_end_at ON eventos_calendario(end_at);

-- Comentarios
COMMENT ON COLUMN eventos_calendario.start_at IS 'Fecha y hora de inicio del evento (ISO timestamp). Si all_day=true, se establece a las 00:00 del día.';
COMMENT ON COLUMN eventos_calendario.end_at IS 'Fecha y hora de fin del evento (ISO timestamp). Opcional. Si all_day=true y es NULL, el evento dura todo el día.';
COMMENT ON COLUMN eventos_calendario.all_day IS 'Indica si el evento es de todo el día (true) o tiene horario específico (false).';

