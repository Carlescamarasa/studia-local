-- RPC: get_student_skills_radar
--
-- Calculates normalized skills radar (0-10) for a student.
-- Combines quantitative data (XP vs Level Requirements) and qualitative data (Evaluations).
--
-- Parameters:
--   p_student_id: UUID of the student
--   p_window_days: Window for qualitative averages (default 30)
--
-- Returns: JSON object with keys: motricidad, articulacion, flexibilidad, sonido, cognicion

CREATE OR REPLACE FUNCTION get_student_skills_radar(
    p_student_id UUID,
    p_window_days INT DEFAULT 30
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    v_level INT;
    v_student_id_text TEXT;
    
    -- Level Config Requirements
    v_min_motr INT;
    v_min_art INT;
    v_min_flex INT;
    
    -- Accumulated XP
    v_motr_xp NUMERIC := 0;
    v_art_xp NUMERIC := 0;
    v_flex_xp NUMERIC := 0;
    
    -- Qualitative Averages
    v_sonido_avg NUMERIC := 0;
    v_cognicion_avg NUMERIC := 0;
    
    -- Date limit for qualitative data
    v_date_limit TIMESTAMPTZ;
BEGIN
    -- Cast UUID to TEXT once for consistent usage if underlying tables use TEXT
    v_student_id_text := p_student_id::TEXT;

    -- 1. Determine Student Level
    -- Attempts to get 'nivel_tecnico' from profiles. Defaults to 1 if null or column implies issues.
    -- Note: Ensure 'nivel_tecnico' exists in profiles or adjust source table if different.
    SELECT COALESCE(nivel_tecnico, 1) INTO v_level
    FROM profiles
    WHERE id = p_student_id; -- profiles.id is typically UUID
    
    IF v_level IS NULL THEN
        v_level := 1;
    END IF;

    -- 2. Get Level Configuration (Requirements)
    -- Assumes table 'levels_config' with 'level', 'min_xp_motr', 'min_xp_art', 'min_xp_flex'
    SELECT min_xp_motr, min_xp_art, min_xp_flex
    INTO v_min_motr, v_min_art, v_min_flex
    FROM levels_config
    WHERE level = v_level;
    
    -- Fallback/Safety: If config missing or zero, use high default to prevent div/0 or instant max
    v_min_motr := COALESCE(NULLIF(v_min_motr, 0), 100);
    v_min_art := COALESCE(NULLIF(v_min_art, 0), 100);
    v_min_flex := COALESCE(NULLIF(v_min_flex, 0), 100);

    -- 3. Get Accumulated XP (Quantitative) from student_xp_total
    -- Assumes 'student_xp_total' tracks lifetime XP by skill
    -- Note: student_xp_total might use TEXT for student_id if it's a view over legacy data
    
    SELECT COALESCE(SUM(total_xp), 0) INTO v_motr_xp
    FROM student_xp_total
    WHERE student_id = v_student_id_text AND skill = 'motricidad';

    SELECT COALESCE(SUM(total_xp), 0) INTO v_art_xp
    FROM student_xp_total
    WHERE student_id = v_student_id_text AND skill = 'articulacion';

    SELECT COALESCE(SUM(total_xp), 0) INTO v_flex_xp
    FROM student_xp_total
    WHERE student_id = v_student_id_text AND skill = 'flexibilidad';

    -- 4. Get Qualitative Data (Averages) from evaluaciones_tecnicas
    -- Uses p_window_days to filter recent evaluations.
    -- Assumes 'habilidades' is JSONB: { "sonido": 1-10, "cognitivo": 1-10 }
    
    v_date_limit := NOW() - (p_window_days || ' days')::INTERVAL;
    
    SELECT 
        COALESCE(AVG(CAST(habilidades->>'sonido' AS NUMERIC)), 0),
        COALESCE(AVG(CAST(habilidades->>'cognitivo' AS NUMERIC)), 0)
    INTO v_sonido_avg, v_cognicion_avg
    FROM evaluaciones_tecnicas
    WHERE alumno_id = v_student_id_text -- Cast likely needed here too
    AND fecha >= v_date_limit  -- Assumes 'fecha' column
    AND habilidades IS NOT NULL;

    -- 5. Construct JSON Result
    -- Normalization: (Total XP / Requirement) * 10
    -- Cap: LEAST(10, ...) to ensure 0-10 scale
    
    SELECT json_build_object(
        'motricidad', LEAST(10, ROUND((v_motr_xp / v_min_motr) * 10, 1)),
        'articulacion', LEAST(10, ROUND((v_art_xp / v_min_art) * 10, 1)),
        'flexibilidad', LEAST(10, ROUND((v_flex_xp / v_min_flex) * 10, 1)),
        'sonido', ROUND(v_sonido_avg, 1),
        'cognicion', ROUND(v_cognicion_avg, 1),
        'meta', json_build_object(
            'level', v_level,
            'xp_motr', v_motr_xp,
            'req_motr', v_min_motr,
            'xp_art', v_art_xp,
            'req_art', v_min_art,
            'xp_flex', v_flex_xp,
            'req_flex', v_min_flex
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
