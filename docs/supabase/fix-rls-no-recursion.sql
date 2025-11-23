    -- ============================================================================
    -- SOLUCIÓN: Corregir políticas RLS sin recursión infinita
    -- ============================================================================
    -- 
    -- Este script corrige las políticas RLS para evitar recursión infinita.
    -- 
    -- IMPORTANTE: 
    -- 1. PRIMERO ejecuta docs/check-rls-policies.sql para ver las políticas actuales
    -- 2. Verifica si el rol está en el JWT (ver docs/required-permissions-analysis.md)
    -- 3. Luego ejecuta este script
    -- ============================================================================

    -- ============================================================================
    -- PASO 1: Eliminar políticas problemáticas de 'profiles'
    -- ============================================================================
    DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
    DROP POLICY IF EXISTS "Teachers can read their students" ON profiles;

    -- ============================================================================
    -- PASO 2: Función helper para verificar rol sin recursión
    -- ============================================================================
    -- Esta función puede leer profiles sin activar RLS (SECURITY DEFINER)
    -- Úsala si el rol NO está en el JWT
    CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
    RETURNS TEXT AS $$
    BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_id LIMIT 1);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

    CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'ADMIN');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

    CREATE OR REPLACE FUNCTION public.is_user_prof(user_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'PROF');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

    -- ============================================================================
    -- OPCIÓN A: Si el rol ESTÁ en el JWT (user_metadata o app_metadata)
    -- ============================================================================
    -- Descomenta estas políticas si el rol está en el JWT:

    /*
    -- Política: Los administradores pueden leer todos los perfiles
    CREATE POLICY "Admins can read all profiles"
    ON profiles
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
        OR
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
    );

    -- Política: Los administradores pueden actualizar todos los perfiles
    CREATE POLICY "Admins can update all profiles"
    ON profiles
    FOR UPDATE
    USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
        OR
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
    );

    -- Política: Los profesores pueden leer perfiles de sus estudiantes
    CREATE POLICY "Teachers can read their students"
    ON profiles
    FOR SELECT
    USING (
        -- Pueden leer si son profesores
        (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'PROF'
        OR
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'PROF'
        )
        AND
        (
        -- Y el perfil que están leyendo es de un estudiante con este profesor asignado
        (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
        OR
        -- O son admin (verificar desde JWT)
        (
            (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
            OR
            (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'ADMIN'
        )
        )
    );
    */

    -- ============================================================================
    -- OPCIÓN B: Si el rol NO está en el JWT (usar funciones SECURITY DEFINER)
    -- ============================================================================
    -- Usa estas políticas si el rol NO está en el JWT:

    -- Política: Los administradores pueden leer todos los perfiles
    CREATE POLICY "Admins can read all profiles"
    ON profiles
    FOR SELECT
    USING (public.is_user_admin(auth.uid()));

    -- Política: Los administradores pueden actualizar todos los perfiles
    CREATE POLICY "Admins can update all profiles"
    ON profiles
    FOR UPDATE
    USING (public.is_user_admin(auth.uid()));

    -- Política: Los profesores pueden leer perfiles de sus estudiantes
    CREATE POLICY "Teachers can read their students"
    ON profiles
    FOR SELECT
    USING (
        public.is_user_prof(auth.uid())
        AND (
        -- Pueden leer estudiantes que tienen este profesor asignado
        (profiles.role = 'ESTU' AND profiles.profesor_asignado_id = auth.uid())
        OR
        -- O pueden leer todos si son admin
        public.is_user_admin(auth.uid())
        )
    );

    -- Política adicional: Los estudiantes pueden leer el perfil de su profesor asignado
    CREATE POLICY "Students can read assigned professor"
    ON profiles
    FOR SELECT
    USING (
        profiles.role = 'PROF'
        AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'ESTU' 
        AND profesor_asignado_id = profiles.id
        )
    );

    -- ============================================================================
    -- PASO 3: Corregir políticas de 'registros_sesion'
    -- ============================================================================

    -- Eliminar políticas problemáticas
    DROP POLICY IF EXISTS "Students can read own registros_sesion" ON registros_sesion;
    DROP POLICY IF EXISTS "Teachers can read students registros_sesion" ON registros_sesion;
    DROP POLICY IF EXISTS "Students can create own registros_sesion" ON registros_sesion;
    DROP POLICY IF EXISTS "Students can update own registros_sesion" ON registros_sesion;
    DROP POLICY IF EXISTS "Admins can delete registros_sesion" ON registros_sesion;

    -- Política: Los estudiantes pueden leer sus propios registros
    CREATE POLICY "Students can read own registros_sesion"
    ON registros_sesion
    FOR SELECT
    USING (alumno_id = auth.uid()::text);

    -- Política: Los profesores pueden leer registros de sus estudiantes
    CREATE POLICY "Teachers can read students registros_sesion"
    ON registros_sesion
    FOR SELECT
    USING (
        profesor_asignado_id = auth.uid()::text
        OR public.is_user_admin(auth.uid())
    );

    -- Política: Los administradores pueden leer todos los registros
    CREATE POLICY "Admins can read all registros_sesion"
    ON registros_sesion
    FOR SELECT
    USING (public.is_user_admin(auth.uid()));

    -- Política: Los estudiantes pueden crear sus propios registros
    CREATE POLICY "Students can create own registros_sesion"
    ON registros_sesion
    FOR INSERT
    WITH CHECK (
        alumno_id = auth.uid()::text
        OR public.is_user_admin(auth.uid())
        OR public.is_user_prof(auth.uid())
    );

    -- Política: Los estudiantes pueden actualizar sus propios registros
    CREATE POLICY "Students can update own registros_sesion"
    ON registros_sesion
    FOR UPDATE
    USING (
        alumno_id = auth.uid()::text
        OR public.is_user_admin(auth.uid())
        OR (public.is_user_prof(auth.uid()) AND profesor_asignado_id = auth.uid()::text)
    );

    -- Política: Los estudiantes pueden eliminar sus propios registros
    CREATE POLICY "Students can delete own registros_sesion"
    ON registros_sesion
    FOR DELETE
    USING (
        alumno_id = auth.uid()::text
        OR public.is_user_admin(auth.uid())
        OR (public.is_user_prof(auth.uid()) AND profesor_asignado_id = auth.uid()::text)
    );

    -- Política: Los administradores pueden eliminar cualquier registro
    CREATE POLICY "Admins can delete any registros_sesion"
    ON registros_sesion
    FOR DELETE
    USING (public.is_user_admin(auth.uid()));

