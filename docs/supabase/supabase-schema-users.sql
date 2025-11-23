-- ============================================================================
-- Esquema de Base de Datos para Usuarios - Studia
-- ============================================================================
-- 
-- Este script crea la estructura de tablas necesaria para migrar los usuarios
-- de localStorage a Supabase.
--
-- IMPORTANTE:
-- - Supabase Auth (auth.users) es la fuente de verdad para email/contraseña
-- - La tabla profiles extiende auth.users con datos de perfil de la aplicación
-- - Ejecuta este SQL en el Table Editor de Supabase: SQL Editor → New Query
-- ============================================================================

-- ============================================================================
-- Tabla: profiles
-- ============================================================================
-- Extiende auth.users con información de perfil específica de Studia.
-- Cada fila en profiles corresponde a un usuario en auth.users.
--
-- Campos:
-- - id: UUID que referencia auth.users.id (PK)
-- - full_name: Nombre completo del usuario
-- - role: Rol del usuario (ADMIN, PROF, ESTU)
-- - profesor_asignado_id: FK a profiles.id (solo para estudiantes)
-- - is_active: Indica si el usuario está activo
-- - created_at, updated_at: Timestamps automáticos
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PROF', 'ESTU')),
  profesor_asignado_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Índices para mejorar el rendimiento de consultas comunes
-- ============================================================================

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Índice para búsquedas de estudiantes por profesor asignado
CREATE INDEX IF NOT EXISTS idx_profiles_profesor_asignado ON profiles(profesor_asignado_id) 
  WHERE profesor_asignado_id IS NOT NULL;

-- Índice para filtrar usuarios activos
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================================================
-- Función para actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para validar que solo los admins pueden cambiar roles
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el role está cambiando
  IF OLD.role != NEW.role THEN
    -- Verificar si el usuario actual es admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Solo los administradores pueden cambiar el role de un usuario';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para validar cambios de role
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_change();

-- ============================================================================
-- Políticas de Seguridad (RLS - Row Level Security)
-- ============================================================================
-- 
-- IMPORTANTE: Ajusta estas políticas según tus necesidades de seguridad.
-- Por defecto, permitimos:
-- - Los usuarios pueden leer su propio perfil
-- - Los usuarios pueden actualizar su propio perfil
-- - Los administradores pueden leer todos los perfiles
-- - Los profesores pueden leer los perfiles de sus estudiantes
-- ============================================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden leer su propio perfil
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
-- Nota: La validación del cambio de role se hace con un trigger (ver más abajo)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Los administradores pueden leer todos los perfiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Política: Los administradores pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Política: Los profesores pueden leer perfiles de sus estudiantes
CREATE POLICY "Teachers can read their students"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'PROF'
    )
    AND (
      -- Pueden leer estudiantes que tienen este profesor asignado
      (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
      OR
      -- O pueden leer todos los perfiles si son admin
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- ============================================================================
-- Función helper para crear un perfil automáticamente cuando se crea un usuario
-- ============================================================================
-- 
-- Esta función se ejecuta automáticamente cuando se crea un usuario en auth.users
-- y crea una fila correspondiente en profiles.
-- 
-- NOTA: Ajusta los valores por defecto según tus necesidades.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ESTU')::TEXT,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Comentarios en la tabla y columnas (opcional, pero útil)
-- ============================================================================

COMMENT ON TABLE profiles IS 'Perfiles de usuario que extienden auth.users con datos específicos de Studia';
COMMENT ON COLUMN profiles.id IS 'UUID que referencia auth.users.id';
COMMENT ON COLUMN profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: ADMIN (administrador), PROF (profesor), ESTU (estudiante)';
COMMENT ON COLUMN profiles.profesor_asignado_id IS 'ID del profesor asignado (solo para estudiantes)';
COMMENT ON COLUMN profiles.is_active IS 'Indica si el usuario está activo en el sistema';
COMMENT ON COLUMN profiles.created_at IS 'Fecha de creación del perfil';
COMMENT ON COLUMN profiles.updated_at IS 'Fecha de última actualización del perfil';

