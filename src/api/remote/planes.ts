/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, toSnakeCase } from './utils';
import type { Plan } from '@/features/shared/types/domain';

interface DbPlan {
    id: string;
    titulo: string;
    contenido?: any;
    [key: string]: unknown;
}

// Minimal interface for asignacion structure needed here
interface AsignacionWithPlan {
    planId?: string;
    planAdaptado?: Plan;
    plan?: Plan;
    [key: string]: unknown;
}

/**
 * Resuelve el plan para una asignación usando la arquitectura híbrida:
 * - Si plan_adaptado existe → usar plan_adaptado (snapshot adaptado)
 * - Si no, y plan_id existe → buscar en planesList o cargar desde BD (referencia)
 * - Si no, y plan existe (legacy) → usar plan (compatibilidad)
 */
export async function resolvePlanForAsignacion(
    asignacion: AsignacionWithPlan,
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

            return snakeToCamel<Plan>(data as DbPlan);
        } catch (error) {
            console.warn('[resolvePlanForAsignacion] Error al cargar plan por ID:', error);
            return null;
        }
    }

    // Prioridad 3: plan (legacy, compatibilidad)
    if (asignacion.plan) {
        return asignacion.plan as Plan;
    }

    return null;
}

/**
 * Filtra planes por campos
 */
export async function fetchPlanesByFilter(filters: Record<string, unknown>, limit?: number | null): Promise<Plan[]> {
    let query = supabase.from('planes').select('*');

    for (const [key, value] of Object.entries(filters)) {
        const snakeKey = toSnakeCase(key);
        query = query.eq(snakeKey, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await withAuthErrorHandling(query);
    if (error) throw error;

    return ((data as DbPlan[]) || []).map(p => snakeToCamel<Plan>(p));
}

/**
 * Obtiene el listado completo de planes
 */
export async function fetchPlanesList(sort?: string): Promise<Plan[]> {
    let query = supabase.from('planes').select('*');

    if (sort) {
        const direction = sort.startsWith('-') ? 'desc' : 'asc';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        // Basic mapping for common camelCase to snake_case fields
        const fieldMap: Record<string, string> = {
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        };
        const snakeField = fieldMap[field] || field;
        query = query.order(snakeField, { ascending: direction === 'asc' });
    }

    const { data, error } = await withAuthErrorHandling(query);
    if (error) throw error;

    return ((data as DbPlan[]) || []).map(p => snakeToCamel<Plan>(p));
}

/**
 * Obtiene un plan por ID
 */
export async function fetchPlan(id: string): Promise<Plan | null> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('planes')
            .select('*')
            .eq('id', id)
            .single()
    );

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    if (!data) return null;

    return snakeToCamel<Plan>(data as DbPlan);
}

/**
 * Crea un nuevo plan
 */
export async function createPlan(payload: Partial<Plan>): Promise<Plan> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('planes')
            .insert(payload) // Assuming payload is already in DB format or camelToSnake is handled if needed
            .select()
            .single()
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to create plan');

    return snakeToCamel<Plan>(data as DbPlan);
}

/**
 * Actualiza un plan existente
 */
export async function updatePlan(id: string, updates: Partial<Plan>): Promise<Plan> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('planes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to update plan');

    return snakeToCamel<Plan>(data as DbPlan);
}

/**
 * Elimina un plan
 */
export async function deletePlan(id: string): Promise<{ success: boolean }> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('planes')
            .delete()
            .eq('id', id)
    );

    if (error) throw error;
    return { success: true };
}

/**
 * Obtiene una vista previa de los planes (limitado a 20)
 */
export async function fetchPlanesPreview(): Promise<Plan[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase.from('planes').select('*').limit(20)
    );

    if (error) {
        throw error;
    }

    return ((data as DbPlan[]) || []).map(p => snakeToCamel<Plan>(p));
}

/**
 * Obtiene una vista previa de los planes para la página de ejercicios
 */
export async function fetchPlanesPreviewEjercicios(): Promise<Plan[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase.from('planes').select('*').limit(20)
    );

    if (error) {
        throw error;
    }

    return ((data as DbPlan[]) || []).map(p => snakeToCamel<Plan>(p));
}
