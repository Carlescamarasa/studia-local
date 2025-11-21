-- ============================================================================
-- Script para consultar políticas RLS actuales en Supabase
-- ============================================================================
-- 
-- Ejecuta este script en Supabase SQL Editor para ver todas las políticas RLS
-- y diagnosticar problemas de recursión infinita.
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard → SQL Editor → New Query
-- 2. Pega este script
-- 3. Ejecuta (Run)
-- 4. Copia los resultados y compártelos
-- ============================================================================

-- ============================================================================
-- 1. Consultar todas las políticas RLS de la tabla 'profiles'
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command, -- SELECT, INSERT, UPDATE, DELETE
  qual AS using_expression, -- Condición USING
  with_check AS with_check_expression -- Condición WITH CHECK
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- 2. Consultar todas las políticas RLS de la tabla 'registros_sesion'
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'registros_sesion'
ORDER BY policyname;

-- ============================================================================
-- 3. Verificar si RLS está habilitado en las tablas
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('profiles', 'registros_sesion')
  AND schemaname = 'public';

-- ============================================================================
-- 4. Buscar políticas que podrían causar recursión (consultan profiles dentro de profiles)
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE qual::text LIKE '%profiles%'
  AND tablename = 'profiles';

-- ============================================================================
-- 5. Ver estructura de la tabla profiles (para verificar campos disponibles)
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- 6. Ver estructura de la tabla registros_sesion
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registros_sesion'
ORDER BY ordinal_position;

