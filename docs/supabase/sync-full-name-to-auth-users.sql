-- ============================================================================
-- Trigger para sincronizar full_name de profiles a auth.users
-- ============================================================================
-- 
-- Este trigger mantiene sincronizado el campo full_name de la tabla profiles
-- con el campo raw_user_meta_data->>'full_name' en auth.users.
-- 
-- Cuando se actualiza full_name en profiles, se actualiza automáticamente
-- en auth.users para mantener consistencia.
-- ============================================================================

-- Función para sincronizar full_name a auth.users
CREATE OR REPLACE FUNCTION public.sync_full_name_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si full_name cambió
  IF (TG_OP = 'UPDATE' AND OLD.full_name IS DISTINCT FROM NEW.full_name) OR TG_OP = 'INSERT' THEN
    -- Actualizar raw_user_meta_data en auth.users
    -- Nota: Esto requiere permisos SECURITY DEFINER para acceder a auth.users
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', NEW.full_name)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta después de INSERT o UPDATE en profiles
DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.profiles;
CREATE TRIGGER sync_full_name_trigger
  AFTER INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_full_name_to_auth_users();

-- ============================================================================
-- Comentarios
-- ============================================================================

COMMENT ON FUNCTION public.sync_full_name_to_auth_users() IS 
'Función que sincroniza full_name de profiles a auth.users.raw_user_meta_data->>''full_name'' para mantener consistencia entre ambas tablas.';

COMMENT ON TRIGGER sync_full_name_trigger ON public.profiles IS 
'Trigger que ejecuta la sincronización de full_name cuando se inserta o actualiza un perfil.';

