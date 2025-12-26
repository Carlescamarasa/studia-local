-- RPC for Calendario
-- Fetches sessions, feedbacks, assignments, and events in a single call
DROP FUNCTION IF EXISTS get_calendar_summary(timestamp with time zone, timestamp with time zone, uuid);
DROP FUNCTION IF EXISTS get_calendar_summary(timestamp with time zone, timestamp with time zone, text);

CREATE OR REPLACE FUNCTION get_calendar_summary(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_user_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'registrosSesion', (
            SELECT COALESCE(json_agg(r), '[]'::json)
            FROM registros_sesion r
            WHERE r.inicio_iso >= p_start_date AND r.inicio_iso <= p_end_date
            AND (p_user_id IS NULL OR r.alumno_id::text = p_user_id)
        ),
        'feedbacksSemanal', (
            SELECT COALESCE(json_agg(f), '[]'::json)
            FROM feedbacks_semanal f
            WHERE f.created_at >= p_start_date AND f.created_at <= p_end_date
            AND (p_user_id IS NULL OR f.alumno_id::text = p_user_id)
        ),
        'asignaciones', (
            SELECT COALESCE(json_agg(a), '[]'::json)
            FROM asignaciones a
            WHERE a.semana_inicio_iso >= p_start_date AND a.semana_inicio_iso <= p_end_date 
            AND (p_user_id IS NULL OR a.alumno_id::text = p_user_id)
        ),
        'eventosCalendario', (
            SELECT COALESCE(json_agg(e), '[]'::json)
            FROM eventos_calendario e
            WHERE e.fecha_inicio >= p_start_date AND e.fecha_inicio <= p_end_date
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RPC for Progreso
-- Fetches totals, evaluations, feedbacks, and sessions WITH embedded blocks
DROP FUNCTION IF EXISTS get_progress_summary(uuid);
DROP FUNCTION IF EXISTS get_progress_summary(text);

CREATE OR REPLACE FUNCTION get_progress_summary(
    p_student_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'xpTotals', (
            SELECT COALESCE(json_agg(xp), '[]'::json)
            FROM student_xp_total xp
            WHERE (p_student_id IS NULL OR xp.student_id::text = p_student_id)
        ),
        'evaluacionesTecnicas', (
            SELECT COALESCE(json_agg(e), '[]'::json)
            FROM evaluaciones_tecnicas e
            WHERE (p_student_id IS NULL OR e.alumno_id::text = p_student_id)
        ),
        'feedbacksSemanal', (
            SELECT COALESCE(json_agg(f), '[]'::json)
            FROM feedbacks_semanal f
            WHERE (p_student_id IS NULL OR f.alumno_id::text = p_student_id)
        ),
        'registrosSesion', (
            SELECT COALESCE(json_agg(session_with_blocks ORDER BY session_with_blocks->>'inicio_iso' DESC), '[]'::json)
            FROM (
                SELECT json_build_object(
                    'id', r.id,
                    'alumno_id', r.alumno_id,
                    'asignacion_id', r.asignacion_id,
                    'profesor_asignado_id', r.profesor_asignado_id,
                    'semana_idx', r.semana_idx,
                    'sesion_idx', r.sesion_idx,
                    'inicio_iso', r.inicio_iso,
                    'fin_iso', r.fin_iso,
                    'duracion_real_seg', r.duracion_real_seg,
                    'duracion_objetivo_seg', r.duracion_objetivo_seg,
                    'bloques_totales', r.bloques_totales,
                    'bloques_completados', r.bloques_completados,
                    'bloques_omitidos', r.bloques_omitidos,
                    'finalizada', r.finalizada,
                    'fin_anticipado', r.fin_anticipado,
                    'motivo_fin', r.motivo_fin,
                    'calificacion', r.calificacion,
                    'notas', r.notas,
                    'created_at', r.created_at,
                    'registros_bloque', (
                        SELECT COALESCE(json_agg(rb ORDER BY rb.inicio_iso), '[]'::json)
                        FROM registros_bloque rb
                        WHERE rb.registro_sesion_id = r.id
                    )
                ) AS session_with_blocks
                FROM registros_sesion r
                WHERE (p_student_id IS NULL OR r.alumno_id::text = p_student_id)
            ) AS sessions_subquery
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
