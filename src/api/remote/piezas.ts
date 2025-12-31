import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, camelToSnake, toSnakeCase } from './utils';
import { generateId } from './id';
import type { Pieza } from '@/features/shared/types/domain';

interface DbPieza {
    id: string;
    titulo: string;
    autor: string;
    dificultad: number;
    orden: number;
    // Add other known db fields if necessary, or use unknown for flexibility
    [key: string]: unknown;
}

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

    return ((data as DbPieza[]) || []).map((p: DbPieza) => snakeToCamel<Pieza>(p));
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
    return (data || []).map((p: any) => snakeToCamel<Pieza>(p as DbPieza));
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
    return snakeToCamel<Pieza>(data as DbPieza);
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
    return (data || []).map((p: any) => snakeToCamel<Pieza>(p as DbPieza));
}

export async function createPieza(data: Partial<Pieza>): Promise<Pieza> {
    const snakeData = camelToSnake<Partial<DbPieza>>({
        ...data,
        id: data.id || generateId('pieza'),
    });
    const { data: result, error } = await supabase
        .from('piezas')
        .insert(snakeData)
        .select()
        .single();

    if (error) throw error;
    return snakeToCamel<Pieza>(result as DbPieza);
}

export async function updatePieza(id: string, updates: Partial<Pieza>): Promise<Pieza> {
    const snakeUpdates = camelToSnake<Partial<DbPieza>>(updates);
    const { data, error } = await supabase
        .from('piezas')
        .update(snakeUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return snakeToCamel<Pieza>(data as DbPieza);
}

export async function deletePieza(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('piezas')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return { success: true };
}
