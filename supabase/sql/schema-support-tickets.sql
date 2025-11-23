-- ============================================================================
-- Esquema de Base de Datos para Sistema de Tickets de Soporte - Studia
-- ============================================================================
-- 
-- Este script crea las tablas necesarias para el sistema de tickets de soporte
-- donde alumnos y profesores pueden comunicarse con vídeos.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el SQL Editor de Supabase
-- ============================================================================

-- ============================================================================
-- Tabla: support_tickets
-- ============================================================================
-- Almacena los tickets de soporte/dudas entre alumnos y profesores

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profesor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'cerrado')),
  tipo TEXT CHECK (tipo IN ('duda_general', 'tecnica', 'pieza', 'ritmo', 'sonido', 'otro')),
  titulo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrado_at TIMESTAMPTZ,
  ultima_respuesta_de TEXT CHECK (ultima_respuesta_de IN ('alumno', 'profesor'))
);

-- ============================================================================
-- Tabla: support_mensajes
-- ============================================================================
-- Almacena los mensajes dentro de cada ticket

CREATE TABLE IF NOT EXISTS support_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rol_autor TEXT NOT NULL CHECK (rol_autor IN ('alumno', 'profesor', 'admin')),
  texto TEXT NOT NULL,
  media_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_alumno_id ON support_tickets(alumno_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_profesor_id ON support_tickets(profesor_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_estado ON support_tickets(estado);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_mensajes_ticket_id ON support_mensajes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_mensajes_autor_id ON support_mensajes(autor_id);
CREATE INDEX IF NOT EXISTS idx_support_mensajes_created_at ON support_mensajes(created_at DESC);

-- ============================================================================
-- Trigger para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON support_tickets;

CREATE TRIGGER trigger_update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- ============================================================================
-- Trigger para actualizar ultima_respuesta_de cuando se crea un mensaje
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ticket_ultima_respuesta()
RETURNS TRIGGER AS $$
DECLARE
  respuesta_de TEXT;
BEGIN
  -- Mapear rol_autor a ultima_respuesta_de
  -- El CHECK constraint solo permite 'alumno' o 'profesor'
  -- Si es 'admin', lo tratamos como 'profesor' para el propósito de ultima_respuesta_de
  IF NEW.rol_autor = 'admin' THEN
    respuesta_de := 'profesor';
  ELSIF NEW.rol_autor IN ('alumno', 'profesor') THEN
    respuesta_de := NEW.rol_autor;
  ELSE
    -- Fallback: si el rol no es reconocido, usar 'profesor'
    respuesta_de := 'profesor';
  END IF;
  
  UPDATE support_tickets
  SET 
    ultima_respuesta_de = respuesta_de,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS trigger_update_ticket_ultima_respuesta ON support_mensajes;

CREATE TRIGGER trigger_update_ticket_ultima_respuesta
  AFTER INSERT ON support_mensajes
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_ultima_respuesta();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_mensajes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Políticas para support_tickets
-- ============================================================================

-- Alumnos pueden ver sus propios tickets
DROP POLICY IF EXISTS "Alumnos pueden ver sus propios tickets" ON support_tickets;
CREATE POLICY "Alumnos pueden ver sus propios tickets"
  ON support_tickets
  FOR SELECT
  USING (
    auth.uid() = alumno_id
  );

-- Alumnos pueden crear tickets
DROP POLICY IF EXISTS "Alumnos pueden crear tickets" ON support_tickets;
CREATE POLICY "Alumnos pueden crear tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (
    auth.uid() = alumno_id
  );

-- Alumnos pueden actualizar sus propios tickets (solo algunos campos)
DROP POLICY IF EXISTS "Alumnos pueden actualizar sus propios tickets" ON support_tickets;
CREATE POLICY "Alumnos pueden actualizar sus propios tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    auth.uid() = alumno_id
  )
  WITH CHECK (
    auth.uid() = alumno_id
  );

-- Profesores pueden ver TODOS los tickets (no solo los asignados)
DROP POLICY IF EXISTS "Profesores pueden ver todos los tickets" ON support_tickets;
CREATE POLICY "Profesores pueden ver todos los tickets"
  ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'PROF'
    )
  );

-- Profesores pueden actualizar cualquier ticket
DROP POLICY IF EXISTS "Profesores pueden actualizar tickets" ON support_tickets;
CREATE POLICY "Profesores pueden actualizar tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'PROF'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'PROF'
    )
  );

-- ADMIN puede ver todos los tickets
DROP POLICY IF EXISTS "ADMIN puede ver todos los tickets" ON support_tickets;
CREATE POLICY "ADMIN puede ver todos los tickets"
  ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- ============================================================================
-- Políticas para support_mensajes
-- ============================================================================

-- Alumnos pueden ver mensajes de sus tickets
DROP POLICY IF EXISTS "Alumnos pueden ver mensajes de sus tickets" ON support_mensajes;
CREATE POLICY "Alumnos pueden ver mensajes de sus tickets"
  ON support_mensajes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_mensajes.ticket_id
      AND support_tickets.alumno_id = auth.uid()
    )
  );

-- Alumnos pueden crear mensajes en sus tickets
DROP POLICY IF EXISTS "Alumnos pueden crear mensajes en sus tickets" ON support_mensajes;
CREATE POLICY "Alumnos pueden crear mensajes en sus tickets"
  ON support_mensajes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_mensajes.ticket_id
      AND support_tickets.alumno_id = auth.uid()
    )
    AND autor_id = auth.uid()
    AND rol_autor = 'alumno'
  );

-- Profesores pueden ver mensajes de TODOS los tickets
DROP POLICY IF EXISTS "Profesores pueden ver mensajes de todos los tickets" ON support_mensajes;
CREATE POLICY "Profesores pueden ver mensajes de todos los tickets"
  ON support_mensajes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'PROF'
    )
  );

-- Profesores pueden crear mensajes en cualquier ticket
DROP POLICY IF EXISTS "Profesores pueden crear mensajes en cualquier ticket" ON support_mensajes;
CREATE POLICY "Profesores pueden crear mensajes en cualquier ticket"
  ON support_mensajes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'PROF'
    )
    AND autor_id = auth.uid()
    AND rol_autor = 'profesor'
  );

-- ADMIN puede ver y crear mensajes en todos los tickets
DROP POLICY IF EXISTS "ADMIN puede ver y crear mensajes en todos los tickets" ON support_mensajes;
CREATE POLICY "ADMIN puede ver y crear mensajes en todos los tickets"
  ON support_mensajes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- ============================================================================
-- Comentarios
-- ============================================================================

COMMENT ON TABLE support_tickets IS 'Tickets de soporte/dudas entre alumnos y profesores';
COMMENT ON TABLE support_mensajes IS 'Mensajes dentro de cada ticket de soporte';
COMMENT ON COLUMN support_tickets.estado IS 'Estado del ticket: abierto, en_proceso, cerrado';
COMMENT ON COLUMN support_tickets.tipo IS 'Tipo de duda: duda_general, tecnica, pieza, ritmo, sonido, otro';
COMMENT ON COLUMN support_tickets.ultima_respuesta_de IS 'Quién hizo la última respuesta: alumno o profesor';
COMMENT ON COLUMN support_mensajes.media_links IS 'Array JSONB con enlaces a medios (videos, audios, imágenes)';

