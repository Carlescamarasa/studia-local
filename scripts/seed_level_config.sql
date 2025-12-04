-- Script para poblar configuración de niveles (LevelConfig)
-- Niveles 0-5 con requisitos progresivos

INSERT INTO levels_config (level, min_xp_motr, min_xp_art, min_xp_flex, evidence_window_days)
VALUES 
    (0, 0, 0, 0, 180),      -- Nivel 0 (Principiante)
    (1, 100, 100, 100, 180), -- Nivel 1
    (2, 250, 250, 250, 180), -- Nivel 2
    (3, 500, 500, 500, 180), -- Nivel 3
    (4, 1000, 1000, 1000, 180), -- Nivel 4
    (5, 2000, 2000, 2000, 180)  -- Nivel 5
ON CONFLICT (level) 
DO UPDATE SET
    min_xp_motr = EXCLUDED.min_xp_motr,
    min_xp_art = EXCLUDED.min_xp_art,
    min_xp_flex = EXCLUDED.min_xp_flex,
    evidence_window_days = EXCLUDED.evidence_window_days;

-- Verificar los datos insertados
SELECT * FROM levels_config ORDER BY level;
