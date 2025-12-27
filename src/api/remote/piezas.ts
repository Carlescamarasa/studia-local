import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, camelToSnake, toSnakeCase } from './utils';
import { generateId } from './id';
import type { Pieza } from '@/shared/types/domain';

/**
 * Obtiene todas las piezas (para migración de multimedia)
 */
export async function fetchPiezasPreview(): Promise<Pieza[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('piezas')
            .select('*')
    );

    if (error) {
        throw error;
    }

    return ((data as any[]) || []).map((p: any) => snakeToCamel<Pieza>(p));
}

export async function fetchPiezasList(sort?: string): Promise<Pieza[]> {
    let query = supabase.from('piezas').select('*');

    if (sort) {
        const direction = sort.startsWith('-') ? 'desc' : 'asc';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        const snakeField = toSnakeCase(field);
        query = query.order(snakeField, { ascending: direction === 'asc' });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((p: any) => snakeToCamel<Pieza>(p));
}

export async function fetchPieza(id: string): Promise<Pieza | null> {
    const { data, error } = await supabase
        .from('piezas')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return snakeToCamel<Pieza>(data);
}

export async function fetchPiezasByFilter(filters: Record<string, any>, limit?: number | null): Promise<Pieza[]> {
    let query = supabase.from('piezas').select('*');

    for (const [key, value] of Object.entries(filters)) {
        const snakeKey = toSnakeCase(key);
        query = query.eq(snakeKey, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((p: any) => snakeToCamel<Pieza>(p));
}

export async function createPieza(data: Partial<Pieza>): Promise<Pieza> {
    const snakeData = camelToSnake({
        ...data,
        id: data.id || generateId('pieza'),
    });
    const { data: result, error } = await supabase
        .from('piezas')
        .insert(snakeData)
        .select()
        .single();

    if (error) throw error;
    return snakeToCamel<Pieza>(result);
}

export async function updatePieza(id: string, updates: Partial<Pieza>): Promise<Pieza> {
    const snakeUpdates = camelToSnake(updates);
    const { data, error } = await supabase
        .from('piezas')
        .update(snakeUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return snakeToCamel<Pieza>(data);
}

export async function deletePieza(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('piezas')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return { success: true };
}
