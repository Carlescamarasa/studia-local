-- Usage: supabase.rpc('get_users_with_email', { user_ids: ['uuid1', 'uuid2'] })

DROP FUNCTION IF EXISTS public.get_users_with_email(uuid[]);

CREATE OR REPLACE FUNCTION public.get_users_with_email(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  profesor_asignado_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/superuser) to access auth.users
SET search_path = public, auth -- Set search path for safety
AS $$
DECLARE
  requesting_user_id uuid;
  requesting_user_role text;
  requesting_user_profesor_id uuid;
BEGIN
  -- Get ID of the user executing the function
  requesting_user_id := auth.uid();
  
  -- If not authenticated, return empty
  IF requesting_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get role of requesting user from profiles
  SELECT p.role, p.profesor_asignado_id 
  INTO requesting_user_role, requesting_user_profesor_id
  FROM public.profiles p 
  WHERE p.id = requesting_user_id;

  -- Normalize role
  requesting_user_role := TRIM(UPPER(requesting_user_role));

  -- Main Query Logic based on Role
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text, -- Cast to text explicitly
    COALESCE(au.raw_user_meta_data->>'full_name', p.full_name, 'Sin nombre'),
    p.role::text,
    p.profesor_asignado_id
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = ANY(user_ids)
  AND (
    -- Access Control Logic:
    
    -- 1. Admin can see everyone
    requesting_user_role = 'ADMIN'
    
    -- 2. Professor can see themselves and their assigned students
    OR (requesting_user_role = 'PROF' AND (
        au.id = requesting_user_id -- Can see self
        OR p.profesor_asignado_id = requesting_user_id -- Can see assigned students
    ))
    
    -- 3. Student can see themselves and their assigned professor
    OR (requesting_user_role = 'ESTU' AND (
        au.id = requesting_user_id -- Can see self
        OR au.id = requesting_user_profesor_id -- Can see assigned professor
    ))
  );
END;
$$;
