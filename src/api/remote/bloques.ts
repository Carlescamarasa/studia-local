import { supabase, withAuthErrorHandling } from './client';

/**
 * Elimina un bloque por ID
 */
export async function deleteBloque(id: string): Promise<void> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .delete()
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
}

/**
 * Obtiene todos los bloques (para migración de multimedia)
 */
export async function fetchBloquesPreview(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .select('*')
    );

    if (error) {
        throw error;
    }

    return (data as any[]) || [];
}

/**
 * Actualiza un bloque existente
 */
export async function updateBloque(id: string, payload: any): Promise<void> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .update(payload)
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
}

/**
 * Crea un nuevo bloque
 */
export async function createBloque(payload: any): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .insert([payload])
            .select()
    );

    if (error) {
        throw error;
    }

    return (data as any[]) || [];
}

/**
 * Obtiene el listado de bloques (limitado a 100, para página de ejercicios)
 */
export async function fetchBloquesListado(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
    );

    if (error) {
        throw error;
    }

    return (data as any[]) || [];
}
