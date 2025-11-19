-- ============================================================================
-- Esquema de Base de Datos para Reportes de Errores - Studia
-- ============================================================================
-- 
-- Este script crea la tabla error_reports para almacenar los reportes
-- de errores y sugerencias de los usuarios durante la fase alpha/beta.
--
-- IMPORTANTE:
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: error_reports
-- ============================================================================
-- Almacena los reportes de errores, problemas de diseño y sugerencias
--
-- Campos:
-- - id: Identificador único (UUID)
-- - user_id: ID del usuario que reporta (nullable para reportes anónimos)
-- - category: Categoría del reporte
-- - description: Descripción del problema o sugerencia
-- - screenshot_url: URL de la captura de pantalla (nullable)
-- - context: Información técnica del contexto (JSONB)
-- - status: Estado del reporte (nuevo, en_revision, resuelto)
-- - admin_notes: Notas internas del administrador (nullable)
-- - resolved_by: ID del administrador que resolvió el reporte (nullable)
-- - resolved_at: Fecha de resolución (nullable)
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('algo_no_funciona', 'se_ve_mal', 'no_encuentro', 'sugerencia', 'otro')),
  description TEXT NOT NULL,
  screenshot_url TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'en_revision', 'resuelto')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status);

-- Índice para filtrar por categoría
CREATE INDEX IF NOT EXISTS idx_error_reports_category ON error_reports(category);

-- Índice para filtrar por usuario
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);

-- Índice para ordenar por fecha de creación (más recientes primero)
CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON error_reports(created_at DESC);

-- Índice compuesto para consultas comunes (estado + categoría)
CREATE INDEX IF NOT EXISTS idx_error_reports_status_category ON error_reports(status, category);

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_error_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_error_reports_updated_at ON error_reports;
CREATE TRIGGER trigger_update_error_reports_updated_at
  BEFORE UPDATE ON error_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_error_reports_updated_at();

-- ============================================================================
-- Políticas RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden crear sus propios reportes
CREATE POLICY "Users can create their own reports"
  ON error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Política: Los usuarios pueden ver sus propios reportes
CREATE POLICY "Users can view their own reports"
  ON error_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Política: Solo los administradores pueden ver todos los reportes
-- (Esta política se aplica automáticamente si el usuario tiene rol ADMIN)
-- Nota: Necesitarás ajustar esto según tu sistema de roles
CREATE POLICY "Admins can view all reports"
  ON error_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_personalizado = 'ADMIN'
    )
  );

-- Política: Solo los administradores pueden actualizar reportes
CREATE POLICY "Admins can update reports"
  ON error_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_personalizado = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_personalizado = 'ADMIN'
    )
  );

-- ============================================================================
-- Storage Bucket para Screenshots
-- ============================================================================
-- Nota: Esto debe ejecutarse en el SQL Editor de Supabase
-- También puedes crear el bucket desde el Dashboard: Storage → New Bucket

-- Crear bucket para screenshots (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('error-reports', 'error-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Los usuarios autenticados pueden subir screenshots
CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'error-reports');

-- Política: Los usuarios autenticados pueden leer screenshots
CREATE POLICY "Authenticated users can read screenshots"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'error-reports');

-- ============================================================================
-- Comentarios en la tabla y columnas
-- ============================================================================

COMMENT ON TABLE error_reports IS 'Almacena reportes de errores, problemas de diseño y sugerencias de los usuarios';
COMMENT ON COLUMN error_reports.category IS 'Categoría del reporte: algo_no_funciona, se_ve_mal, no_encuentro, sugerencia, otro';
COMMENT ON COLUMN error_reports.context IS 'Información técnica del contexto: URL, user agent, tamaño de pantalla, logs, etc.';
COMMENT ON COLUMN error_reports.status IS 'Estado del reporte: nuevo, en_revision, resuelto';
COMMENT ON COLUMN error_reports.screenshot_url IS 'URL pública de la captura de pantalla almacenada en Supabase Storage';

