-- Actualización para seguimiento técnico (PPM)

-- 1. Tabla profiles: Añadir nivel_tecnico
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nivel_tecnico INTEGER DEFAULT 1;

-- 2. Tabla bloques: Añadir target_ppms
ALTER TABLE public.bloques
ADD COLUMN IF NOT EXISTS target_ppms JSONB;

-- 3. Tabla registros_bloque: Añadir ppm_alcanzado
ALTER TABLE public.registros_bloque
ADD COLUMN IF NOT EXISTS ppm_alcanzado JSONB;

-- Verificación (Ejecutar después de aplicar los cambios)
-- SELECT id, full_name, nivel_tecnico FROM public.profiles LIMIT 5;
-- SELECT id, nombre, target_ppms FROM public.bloques LIMIT 5;
-- SELECT id, ppm_alcanzado FROM public.registros_bloque LIMIT 5;
