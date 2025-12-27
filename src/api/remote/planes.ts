import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel } from './utils';
import type { Plan } from '@/shared/types/domain';

/**
 * Resuelve el plan para una asignación usando la arquitectura híbrida:
 * - Si plan_adaptado existe → usar plan_adaptado (snapshot adaptado)
 * - Si no, y plan_id existe → buscar en planesList o cargar desde BD (referencia)
 * - Si no, y plan existe (legacy) → usar plan (compatibilidad)
 */
export async function resolvePlanForAsignacion(
    asignacion: any,
    planesList?: Plan[]
): Promise<Plan | null> {
    // Prioridad 1: plan_adaptado (snapshot adaptado)
    if (asignacion.planAdaptado) {
        return asignacion.planAdaptado;
    }

    // Prioridad 2: plan_id (referencia a plantilla)
    if (asignacion.planId) {
        // Si tenemos la lista de planes, buscar ahí primero
        if (planesList) {
            const plan = planesList.find(p => p.id === asignacion.planId);
            if (plan) return plan;
        }

        // Si no está en la lista, cargar desde BD
        try {
            const { data, error } = await supabase
                .from('planes')
                .select('*')
                .eq('id', asignacion.planId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return snakeToCamel<Plan>(data);
        } catch (error) {
            console.warn('[resolvePlanForAsignacion] Error al cargar plan por ID:', error);
            return null;
        }
    }

    // Prioridad 3: plan (legacy, compatibilidad)
    if (asignacion.plan) {
        return asignacion.plan;
    }

    return null;
}

/**
 * Obtiene una vista previa de los planes (limitado a 20)
 */
export async function fetchPlanesPreview(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase.from('planes').select('*').limit(20)
    );

    if (error) {
        throw error;
    }

    return (data as any[]) || [];
}

/**
 * Obtiene una vista previa de los planes para la página de ejercicios
 */
export async function fetchPlanesPreviewEjercicios(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase.from('planes').select('*').limit(20)
    );

    if (error) {
        throw error;
    }

    return (data as any[]) || [];
}
