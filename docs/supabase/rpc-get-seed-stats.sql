-- RPC para obtener estadísticas globales (conteos) en una sola llamada
-- Optimiza la carga de la página de Tests/Seeds reduciendo 8+ peticiones a 1

CREATE OR REPLACE FUNCTION get_seed_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER -- Ejecutar con permisos del creador para saltar RLS si es necesario (solo lectura de conteos)
AS $$
  SELECT json_build_object(
    'usersCount', (SELECT count(*)::int FROM profiles),
    'usersAdmin', (SELECT count(*)::int FROM profiles WHERE role = 'ADMIN'),
    'usersProf', (SELECT count(*)::int FROM profiles WHERE role = 'PROF'),
    'usersEstu', (SELECT count(*)::int FROM profiles WHERE role = 'ESTU'),
    'piezas', (SELECT count(*)::int FROM piezas),
    'planes', (SELECT count(*)::int FROM planes),
    'bloques', (SELECT count(*)::int FROM bloques),
    'asignaciones', (SELECT count(*)::int FROM asignaciones),
    'registrosSesion', (SELECT count(*)::int FROM registros_sesion),
    'registrosBloques', (SELECT count(*)::int FROM registros_bloque),
    'feedbacks', (SELECT count(*)::int FROM feedbacks_semanal)
  );
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION get_seed_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seed_stats() TO service_role;
