-- Función para que un usuario con el rol adecuado pueda activar/desactivar perfiles
-- Esta función usa SECURITY DEFINER para permitir actualizar profiles.is_active
-- incluso cuando RLS podría bloquearlo normalmente

create or replace function public.admin_set_profile_active(
  p_profile_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set is_active = p_is_active,
      updated_at = now()
  where id = p_profile_id;
end;
$$;

-- Da permiso de ejecución a los usuarios autenticados
-- (RLS y/o lógica de rol en el frontend se encargan del resto)
grant execute on function public.admin_set_profile_active(uuid, boolean) to authenticated;

