-- ============================================================================
-- Fix: Actualizar trigger para manejar rol 'admin' en ultima_respuesta_de
-- ============================================================================
-- 
-- PROBLEMA: El CHECK constraint de ultima_respuesta_de solo permite 'alumno' o 'profesor',
-- pero cuando un ADMIN crea un mensaje, el trigger intenta establecer 'admin',
-- lo cual viola el constraint.
--
-- SOLUCIÓN: Mapear 'admin' a 'profesor' en el trigger.
--
-- INSTRUCCIONES:
-- 1. Ejecuta este SQL en el SQL Editor de Supabase
-- 2. Esto actualizará el trigger para que funcione correctamente con ADMIN
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

