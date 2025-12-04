-- Script para generar bloques de práctica sintéticos con datos BPM
-- Genera XP para: Motricidad (+15XP), Articulación (+8XP), Flexibilidad (+23XP)
-- Total: ~46 XP distribuido entre las 3 habilidades

-- Lógica de XP por bloque:
-- 100 XP = ratio >= 1.0 (alcanzó/superó objetivo)
-- 80 XP = ratio >= 0.9
-- 60 XP = ratio >= 0.75
-- 40 XP = ratio >= 0.5
-- 20 XP = mínimo por intentar

DO $$
DECLARE
    v_student_id TEXT := '77dcf831-6283-462a-83bd-f5c46b3cde28';
    v_today TIMESTAMPTZ := NOW();
    v_yesterday TIMESTAMPTZ := NOW() - INTERVAL '1 day';
    v_fake_sesion_id TEXT := 'sesion_synthetic_001';
    v_fake_asignacion_id TEXT := 'asign_synthetic_001';
BEGIN
    -- Bloque 1: Motricidad (alto rendimiento)
    -- Objetivo: 60 BPM, Alcanzado: 63 BPM → ratio 1.05 → 100 XP
    -- Distribuido: 33.3 XP/skill → Necesitamos 0.45 bloques para 15 XP de motricidad
    INSERT INTO registros_bloque (
        id, registro_sesion_id, asignacion_id, alumno_id,
        semana_idx, sesion_idx, orden_ejecucion,
        tipo, code, nombre,
        duracion_objetivo_seg, duracion_real_seg,
        estado, inicios_pausa,
        inicio_iso, fin_iso,
        ppm_objetivo, ppm_alcanzado,
        completado_en, created_at
    ) VALUES (
        'bloque_motr_001',
        v_fake_sesion_id,
        v_fake_asignacion_id,
        v_student_id,
        0, 0, 0,
        'TC', 'TC-MOTR-001', 'Técnica Motricidad',
        300, 305,
        'completado', 0,
        v_yesterday, v_yesterday + INTERVAL '5 minutes',
        '{"bpm": 60}'::jsonb,
        '{"bpm": 63}'::jsonb,
        v_yesterday,
        v_yesterday
    );

    -- Bloque 2: Articulación (rendimiento moderado)
    -- Objetivo: 120 BPM, Alcanzado: 100 BPM → ratio 0.83 → 60 XP
    -- Distribuido: 20 XP/skill → Necesitamos 0.4 bloques para 8 XP de articulación
    INSERT INTO registros_bloque (
        id, registro_sesion_id, asignacion_id, alumno_id,
        semana_idx, sesion_idx, orden_ejecucion,
        tipo, code, nombre,
        duracion_objetivo_seg, duracion_real_seg,
        estado, inicios_pausa,
        inicio_iso, fin_iso,
        ppm_objetivo, ppm_alcanzado,
        completado_en, created_at
    ) VALUES (
        'bloque_art_001',
        v_fake_sesion_id,
        v_fake_asignacion_id,
        v_student_id,
        0, 0, 1,
        'TC', 'TC-ART-001', 'Técnica Articulación',
        240, 250,
        'completado', 1,
        v_yesterday + INTERVAL '6 minutes', v_yesterday + INTERVAL '10 minutes',
        '{"bpm": 120}'::jsonb,
        '{"bpm": 100}'::jsonb,
        v_yesterday,
        v_yesterday
    );

    -- Bloque 3: Flexibilidad (excelente rendimiento)
    -- Objetivo: 80 BPM, Alcanzado: 88 BPM → ratio 1.1 → 100 XP
    -- Distribuido: 33.3 XP/skill → Necesitamos 0.69 bloques para 23 XP de flexibilidad
    INSERT INTO registros_bloque (
        id, registro_sesion_id, asignacion_id, alumno_id,
        semana_idx, sesion_idx, orden_ejecucion,
        tipo, code, nombre,
        duracion_objetivo_seg, duracion_real_seg,
        estado, inicios_pausa,
        inicio_iso, fin_iso,
        ppm_objetivo, ppm_alcanzado,
        completado_en, created_at
    ) VALUES (
        'bloque_flex_001',
        v_fake_sesion_id,
        v_fake_asignacion_id,
        v_student_id,
        0, 0, 2,
        'FM', 'FM-FLEX-001', 'Fragmento Musical Flexibilidad',
        360, 365,
        'completado', 0,
        v_today - INTERVAL '2 hours', v_today - INTERVAL '1 hour 54 minutes',
        '{"bpm": 80}'::jsonb,
        '{"bpm": 88}'::jsonb,
        v_today,
        v_today
    );

    -- Bloque 4: Adicional para ajustar distribución
    -- Objetivo: 100 BPM, Alcanzado: 92 BPM → ratio 0.92 → 80 XP
    INSERT INTO registros_bloque (
        id, registro_sesion_id, asignacion_id, alumno_id,
        semana_idx, sesion_idx, orden_ejecucion,
        tipo, code, nombre,
        duracion_objetivo_seg, duracion_real_seg,
        estado, inicios_pausa,
        inicio_iso, fin_iso,
        ppm_objetivo, ppm_alcanzado,
        completado_en, created_at
    ) VALUES (
        'bloque_mix_001',
        v_fake_sesion_id,
        v_fake_asignacion_id,
        v_student_id,
        0, 0, 3,
        'TM', 'TM-MIX-001', 'Técnica Mantenimiento',
        180, 185,
        'completado', 0,
        v_today - INTERVAL '1 hour', v_today - INTERVAL '57 minutes',
        '{"bpm": 100}'::jsonb,
        '{"bpm": 92}'::jsonb,
        v_today,
        v_today
    );

    RAISE NOTICE 'Successfully inserted 4 synthetic practice blocks';
END $$;

-- Verificar los bloques insertados
SELECT 
    id,
    tipo,
    nombre,
    estado,
    ppm_objetivo,
    ppm_alcanzado,
    completado_en
FROM registros_bloque
WHERE alumno_id = '77dcf831-6283-462a-83bd-f5c46b3cde28'
ORDER BY completado_en DESC;
