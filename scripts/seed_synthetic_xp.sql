-- Script para generar datos sintéticos de práctica para "La Trompeta Sonará"
-- Motricidad: +15XP, Flexibilidad: +23XP, Articulación: +8XP
-- UUID: 77dcf831-6283-462a-83bd-f5c46b3cde28

DO $$
DECLARE
    v_student_id TEXT := '77dcf831-6283-462a-83bd-f5c46b3cde28';
    v_today_timestamp TIMESTAMPTZ := NOW();
    v_yesterday_timestamp TIMESTAMPTZ := NOW() - INTERVAL '1 day';
BEGIN
    RAISE NOTICE 'Using student ID: %', v_student_id;

    -- Insertar bloques de práctica sintéticos en student_xp_total
    -- Motricidad: +15XP
    INSERT INTO student_xp_total (student_id, skill, total_xp, last_updated_at)
    VALUES (v_student_id, 'motricidad', 15, v_yesterday_timestamp)
    ON CONFLICT (student_id, skill)
    DO UPDATE SET
        total_xp = student_xp_total.total_xp + 15,
        last_updated_at = v_yesterday_timestamp;

    -- Articulación: +8XP
    INSERT INTO student_xp_total (student_id, skill, total_xp, last_updated_at)
    VALUES (v_student_id, 'articulacion', 8, v_yesterday_timestamp)
    ON CONFLICT (student_id, skill)
    DO UPDATE SET
        total_xp = student_xp_total.total_xp + 8,
        last_updated_at = v_yesterday_timestamp;

    -- Flexibilidad: +23XP
    INSERT INTO student_xp_total (student_id, skill, total_xp, last_updated_at)
    VALUES (v_student_id, 'flexibilidad', 23, v_today_timestamp)
    ON CONFLICT (student_id, skill)
    DO UPDATE SET
        total_xp = student_xp_total.total_xp + 23,
        last_updated_at = v_today_timestamp;

    RAISE NOTICE 'Successfully inserted synthetic XP data for student %', v_student_id;
END $$;

-- Verificar los datos insertados
SELECT 
    student_id,
    skill, 
    total_xp, 
    last_updated_at
FROM student_xp_total
WHERE student_id = '77dcf831-6283-462a-83bd-f5c46b3cde28'
ORDER BY skill;
