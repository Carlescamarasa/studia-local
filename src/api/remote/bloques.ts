import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, camelToSnake } from './utils';
import type { Bloque } from '@/features/shared/types/domain';

interface DbBloque {
    id: string;
    nombre: string;
    code: string;
    tipo: string;
    duracion_seg: number;
    instrucciones?: string;
    indicador_logro?: string;
    materiales_requeridos?: string[];
    media_links?: string[];
    elementos_ordenados?: any[];
    pieza_ref_id?: string;
    profesor_id: string;
    skill_tags?: string[];
    target_ppms?: number[];
    content?: any;
    [key: string]: unknown;
}
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

    return ((data as DbBloque[]) || []).map(b => snakeToCamel<Bloque>(b));
}

/**
 * Actualiza un bloque existente
 */
export async function updateBloque(id: string, payload: Partial<Bloque>): Promise<void> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .update(camelToSnake(payload))
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
}

/**
 * Crea un nuevo bloque
 */
export async function createBloque(payload: Partial<Bloque>): Promise<Bloque[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .insert([camelToSnake(payload)])
            .select()
    );

    if (error) {
        throw error;
    }

    return ((data as DbBloque[]) || []).map(b => snakeToCamel<Bloque>(b));
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

    return ((data as DbBloque[]) || []).map(b => snakeToCamel<Bloque>(b));
}
