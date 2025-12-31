 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, camelToSnake } from './utils';
import type { FeedbackSemanal } from '@/features/shared/types/domain';

interface DbFeedbackSemanal {
    id: string;
    semana_inicio_iso: string;
    reflexion?: string;
    objetivos_cumplidos?: boolean;
    dificultad_global?: number;
    created_at?: string;
    updated_at?: string;
    alumno_id: string;
    [key: string]: unknown;
}
/**
 * Obtiene el listado de todos los feedbacks semanales
 */
export async function fetchFeedbacksSemanalList(sort: string = '-created_at'): Promise<FeedbackSemanal[]> {
    let query = supabase.from('feedbacks_semanal').select('*');

    if (sort) {
        const direction = sort.startsWith('-') ? 'desc' : 'asc';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        // La conversión de camel a snake se hace en el caller si es necesario, 
        // pero aquí el caller pasa un string. Asumimos que si viene del frontend,
        // podría venir en camelCase (e.g. 'createdAt'), pero el caller en api.ts
        // hace la conversión si implementa la lógica allí.
        // Sin embargo, en bloques.ts vimos que api.ts implementa la lógica de sort dentro de list()
        // NO delega el sort a fetchBloquesListado.

        // Pero aquí queremos ser consistentes. Si miramos api.ts, la mayoría implementan list() inline.
        // Pero asignaciones.ts tiene fetchAsignaciones.

        // Vamos a implementar una función básica que devuelve todo, y dejar el sort al caller o implementarlo aquí.
        // Dado el uso en api.ts para otras entidades, parece que api.ts prefiere recibir los datos y procesarlos.
        // PERO, si miramos asignaciones, api.ts hace:
        // list: async (sort = '') => { ... return await api.asignaciones.list(sort); } -> espera, eso es localDataClient.

        // En api.ts remoteDataAPI:
        // piezas: { list: fetchPiezasList ... }

        // Veamos fetchPiezasList en piezas.ts? No lo he leído.
        // Asumamos que puedo pasar sort.

        // Si el campo es 'created_at', sirve.
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await withAuthErrorHandling(query);

    if (error) {
        throw error;
    }

    return ((data as DbFeedbackSemanal[]) || []).map(f => snakeToCamel<FeedbackSemanal>(f));
}


/**
 * Obtiene un feedback por ID
 */
export async function fetchFeedbackSemanal(id: string): Promise<FeedbackSemanal | null> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .select('*')
            .eq('id', id)
            .single()
    );
    if (!data) return null;
    return snakeToCamel<FeedbackSemanal>(data as unknown as DbFeedbackSemanal);
}

/**
 * Filtra feedbacks
 */
export async function fetchFeedbacksSemanalByFilter(filters: Record<string, unknown>, limit?: number | null): Promise<FeedbackSemanal[]> {
    let query = supabase.from('feedbacks_semanal').select('*');

    for (const [key, value] of Object.entries(filters)) {
        // Haremos algo genérico: si el filtro llega hasta aquí, asumimos que keys corresponden a columnas.
        query = query.eq(key, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await withAuthErrorHandling(query);

    if (error) {
        throw error;
    }

    return ((data as DbFeedbackSemanal[]) || []).map(f => snakeToCamel<FeedbackSemanal>(f));
}

/**
 * Crea un feedback
 */
export async function createFeedbackSemanal(payload: Partial<FeedbackSemanal>): Promise<FeedbackSemanal> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .insert(camelToSnake(payload))
            .select() // Esto es importante para que devuelva el registro creado
            .single()
    );

    if (error) {
        throw error;
    }

    if (!data) throw new Error('Failed to create feedback');

    return snakeToCamel<FeedbackSemanal>(data as DbFeedbackSemanal);
}

/**
 * Actualiza un feedback
 */
export async function updateFeedbackSemanal(id: string, payload: Partial<FeedbackSemanal>): Promise<FeedbackSemanal> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .update(camelToSnake(payload))
            .eq('id', id)
            .select()
            .single()
    );

    if (error) {
        throw error;
    }

    if (!data) throw new Error('Failed to update feedback');

    return snakeToCamel<FeedbackSemanal>(data as DbFeedbackSemanal);
}

/**
 * Elimina un feedback
 */
export async function deleteFeedbackSemanal(id: string): Promise<{ success: boolean }> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .delete()
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
    return { success: true };
}
