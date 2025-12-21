-- ============================================================================
-- SQL para LIMPIAR COMPLETAMENTE todos los datos sintéticos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================
-- ADVERTENCIA: Esto eliminará TODOS los datos sintéticos de forma permanente
-- ============================================================================

-- 1. Eliminar student_backpack (student_id es TEXT, necesita cast)
DELETE FROM student_backpack 
WHERE student_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 2. Eliminar student_xp_total (student_id es TEXT, necesita cast)
DELETE FROM student_xp_total 
WHERE student_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 3. Eliminar evaluaciones_tecnicas (alumno_id es TEXT, necesita cast)
DELETE FROM evaluaciones_tecnicas 
WHERE alumno_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 4. Eliminar media_assets (origin_id es TEXT, necesita cast)
DELETE FROM media_assets 
WHERE origin_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 5. Eliminar registros_bloque (alumno_id es TEXT, necesita cast)
DELETE FROM registros_bloque 
WHERE alumno_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 6. Eliminar registros_sesion (alumno_id es TEXT, necesita cast)
DELETE FROM registros_sesion 
WHERE alumno_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 7. Eliminar feedbacks_semanal (alumno_id es TEXT, necesita cast)
DELETE FROM feedbacks_semanal 
WHERE alumno_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 8. Eliminar asignaciones (alumno_id es TEXT, necesita cast)
DELETE FROM asignaciones 
WHERE alumno_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 9. Eliminar planes (solo los sintéticos)
DELETE FROM planes 
WHERE nombre LIKE '%[SYNTH_25_26]%';

-- 10. Eliminar piezas (solo las sintéticas, profesor_id es TEXT)
DELETE FROM piezas 
WHERE profesor_id IN (
  SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- 11. NO eliminamos bloques (se usan los existentes)
-- Los bloques con code SYNTH_25_26__ se pueden eliminar si existen:
-- DELETE FROM bloques WHERE code LIKE 'SYNTH_25_26__%';

-- 12. Eliminar usuarios de auth.users (cascada a profiles)
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
);

-- Verificar que no quedan datos sintéticos
SELECT 'profiles' as tabla, COUNT(*) as count FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%'
UNION ALL
SELECT 'asignaciones', COUNT(*) FROM asignaciones WHERE alumno_id IN (SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%')
UNION ALL
SELECT 'registros_sesion', COUNT(*) FROM registros_sesion WHERE alumno_id IN (SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%')
UNION ALL
SELECT 'feedbacks_semanal', COUNT(*) FROM feedbacks_semanal WHERE alumno_id IN (SELECT id::text FROM profiles WHERE full_name LIKE '%[SYNTH_25_26]%');
