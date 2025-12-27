-- ============================================================================
-- RPC: get_users_summary
-- ============================================================================
-- 
-- Consolida la carga de usuarios en una única llamada RPC.
-- Devuelve todos los perfiles con relaciones profesor-estudiante resueltas.
--
-- Ventajas:
-- - Elimina llamadas múltiples a profiles
-- - Incluye el nombre del profesor asignado directamente
-- - Compatible con RLS (usa auth.uid() para contexto)
-- - Retorna JSON listo para consumo por React Query
--
-- Uso desde el frontend:
--   const { data, error } = await supabase.rpc('get_users_summary');
--
-- ============================================================================

DROP FUNCTION IF EXISTS get_users_summary();

CREATE OR REPLACE FUNCTION get_users_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
    caller_role TEXT;
BEGIN
    -- Obtener rol del usuario que llama (para contexto)
    SELECT role INTO caller_role 
    FROM profiles 
    WHERE id = auth.uid();

    -- Construir respuesta JSON con todos los perfiles
    SELECT json_build_object(
        'profiles', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', p.id,
                    'fullName', p.full_name,
                    'role', p.role,
                    'profesorAsignadoId', p.profesor_asignado_id,
                    'isActive', p.is_active,
                    'createdAt', p.created_at,
                    'updatedAt', p.updated_at,
                    'nivel', p.nivel,
                    'nivelTecnico', p.nivel_tecnico,
                    'telefono', p.telefono,
                    -- Incluir nombre del profesor para evitar lookups adicionales
                    'profesorNombre', prof.full_name
                )
                ORDER BY p.full_name NULLS LAST
            ), '[]'::json)
            FROM profiles p
            LEFT JOIN profiles prof ON p.profesor_asignado_id = prof.id
            -- No filtrar por is_active para que ADMINs puedan ver usuarios inactivos
            -- El filtrado se puede hacer en el frontend si es necesario
        ),
        'profesorEstudianteRelaciones', (
            -- Lista de relaciones profesor-estudiante para visualización rápida
            SELECT COALESCE(json_agg(
                json_build_object(
                    'profesorId', p.profesor_asignado_id,
                    'profesorNombre', prof.full_name,
                    'estudianteId', p.id,
                    'estudianteNombre', p.full_name
                )
            ), '[]'::json)
            FROM profiles p
            INNER JOIN profiles prof ON p.profesor_asignado_id = prof.id
            WHERE p.role = 'ESTU' AND p.profesor_asignado_id IS NOT NULL
        ),
        'resumen', json_build_object(
            'totalUsuarios', (SELECT COUNT(*) FROM profiles),
            'totalActivos', (SELECT COUNT(*) FROM profiles WHERE is_active = true),
            'totalAdmins', (SELECT COUNT(*) FROM profiles WHERE role = 'ADMIN'),
            'totalProfesores', (SELECT COUNT(*) FROM profiles WHERE role = 'PROF'),
            'totalEstudiantes', (SELECT COUNT(*) FROM profiles WHERE role = 'ESTU')
        ),
        'callerRole', caller_role,
        'callerId', auth.uid()::text
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_users_summary() TO authenticated;

-- Comentario descriptivo
COMMENT ON FUNCTION get_users_summary() IS 'Devuelve resumen completo de usuarios con relaciones profesor-estudiante resueltas';
