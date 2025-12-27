-- ============================================================================
-- RPC: get_asignaciones_summary
-- ============================================================================
-- 
-- Consolida la carga de asignaciones con datos de alumno/profesor embebidos.
-- Elimina la necesidad de llamadas adicionales a profiles.
--
-- Datos incluidos:
-- - Todos los campos de asignaciones
-- - alumnoNombre, alumnoNivel, alumnoNivelTecnico
-- - profesorNombre
--
-- Uso desde el frontend:
--   const { data, error } = await supabase.rpc('get_asignaciones_summary');
--
-- ============================================================================

DROP FUNCTION IF EXISTS get_asignaciones_summary();

CREATE OR REPLACE FUNCTION get_asignaciones_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'asignaciones', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    -- Campos base de asignaciones
                    'id', a.id,
                    'alumnoId', a.alumno_id,
                    'profesorId', a.profesor_id,
                    'piezaId', a.pieza_id,
                    'semanaInicioISO', a.semana_inicio_iso,
                    'estado', a.estado,
                    'foco', a.foco,
                    'notas', a.notas,
                    'planId', a.plan_id,
                    'planAdaptado', a.plan_adaptado,
                    'plan', a.plan,
                    'piezaSnapshot', a.pieza_snapshot,
                    'createdAt', a.created_at,
                    'updatedAt', a.updated_at,
                    -- Datos embebidos del alumno
                    'alumnoNombre', alumno.full_name,
                    'alumnoNivel', alumno.nivel,
                    'alumnoNivelTecnico', alumno.nivel_tecnico,
                    -- Datos embebidos del profesor
                    'profesorNombre', profesor.full_name
                )
                ORDER BY a.semana_inicio_iso DESC, a.created_at DESC
            ), '[]'::json)
            FROM asignaciones a
            LEFT JOIN profiles alumno ON a.alumno_id = alumno.id::text
            LEFT JOIN profiles profesor ON a.profesor_id = profesor.id::text
            -- RLS se aplica automáticamente por SECURITY INVOKER (default)
        ),
        'resumen', json_build_object(
            'totalAsignaciones', (SELECT COUNT(*) FROM asignaciones),
            'borrador', (SELECT COUNT(*) FROM asignaciones WHERE estado = 'borrador'),
            'publicada', (SELECT COUNT(*) FROM asignaciones WHERE estado = 'publicada'),
            'enCurso', (SELECT COUNT(*) FROM asignaciones WHERE estado = 'en_curso'),
            'cerrada', (SELECT COUNT(*) FROM asignaciones WHERE estado = 'cerrada'),
            'archivada', (SELECT COUNT(*) FROM asignaciones WHERE estado = 'archivada')
        ),
        'callerId', auth.uid()::text
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- SECURITY INVOKER: respeta RLS del usuario que llama
-- Conceder permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_asignaciones_summary() TO authenticated;

-- Comentario descriptivo
COMMENT ON FUNCTION get_asignaciones_summary() IS 'Devuelve asignaciones con datos de alumno y profesor embebidos';
