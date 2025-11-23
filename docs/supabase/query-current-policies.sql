-- ============================================================================
-- Consulta simple para ver las políticas RLS actuales
-- ============================================================================
-- Ejecuta esto en Supabase SQL Editor y copia el resultado

-- Políticas de profiles
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Políticas de registros_sesion  
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies 
WHERE tablename = 'registros_sesion'
ORDER BY policyname;

