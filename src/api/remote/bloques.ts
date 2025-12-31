/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { supabase, withAuthErrorHandling } from './client';
import {
    snakeToCamel,
    camelToSnake,
    toSnakeCase
} from './utils';
import type { Bloque } from '@/features/shared/types/domain';

interface DbBloque {
    id: string;
    nombre: string;
    code: string;
    tipo: 'TE' | 'RE' | 'LI' | 'ES' | 'AD';
    duracion_seg?: number;
    instrucciones?: string;
    indicador_logro?: string;
    materiales_requeridos?: string[];
    media_links?: any[];
    elementos_ordenados?: any[];
    pieza_ref_id?: string;
    profesor_id?: string;
    skill_tags?: string[];
    target_ppms?: any;
    content?: any;
    [key: string]: unknown;
}

/**
 * Mapea un bloque de base de datos a un bloque de dominio
 */
export function mapDbBloqueToBloque(b: DbBloque): Bloque {
    const camel = snakeToCamel<Bloque>(b);

    // Fix targetPPMs mapping (snakeToCamel produces targetPpms)
    const record = camel as unknown as Record<string, any>;
    if (record.targetPpms) {
        camel.targetPPMs = record.targetPpms;
        delete record.targetPpms;
    }

    // Map content (JSONB) to variations - CRITICAL for exercise variations display
    const rawContent = b.content;
    if (!camel.content && rawContent) {
        camel.content = rawContent;
    }

    if (camel.content && !camel.variations) {
        // Handle both array structure and { variations: [...] } structure
        if (Array.isArray(camel.content)) {
            camel.variations = camel.content;
        } else if (typeof camel.content === 'object' && camel.content !== null && 'variations' in (camel.content as Record<string, unknown>)) {
            const contentObj = camel.content as { variations: any[] };
            if (Array.isArray(contentObj.variations)) {
                camel.variations = contentObj.variations;
            }
        }
    }

    // Also try to use raw content as fallback
    if ((!camel.variations || camel.variations.length === 0) && rawContent) {
        if (Array.isArray(rawContent)) {
            camel.variations = rawContent;
        } else if (typeof rawContent === 'object' && rawContent !== null && 'variations' in (rawContent as Record<string, unknown>)) {
            const rawObj = rawContent as { variations: any[] };
            if (Array.isArray(rawObj.variations)) {
                camel.variations = rawObj.variations;
            }
        }
    }

    if (!camel.variations) {
        camel.variations = [];
    }

    return camel;
}
/**
 * Elimina un bloque por ID
 */
export async function deleteBloque(id: string): Promise<{ success: boolean }> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .delete()
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
    return { success: true };
}

/**
 * Obtiene todos los bloques (para migración de multimedia)
 */
export async function fetchBloquesPreview(): Promise<Bloque[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .select('*')
    );

    if (error) {
        throw error;
    }

    return ((data as DbBloque[]) || []).map(b => mapDbBloqueToBloque(b));
}

/**
 * Obtiene el listado de bloques (limitado a 100, para página de ejercicios)
 */
export async function fetchBloquesListado(sort?: string): Promise<Bloque[]> {
    let query = supabase.from('bloques').select('*');

    if (sort) {
        const direction = sort.startsWith('-') ? 'desc' : 'asc';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        const snakeField = toSnakeCase(field);
        query = query.order(snakeField, { ascending: direction === 'asc' });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    query = query.limit(100);

    const { data, error } = await withAuthErrorHandling(query);

    if (error) {
        throw error;
    }

    return ((data as DbBloque[]) || []).map(b => mapDbBloqueToBloque(b));
}

/**
 * Filtra bloques por campos
 */
export async function fetchBloquesByFilter(filters: Record<string, unknown>, limit?: number | null): Promise<Bloque[]> {
    let query = supabase.from('bloques').select('*');

    for (const [key, value] of Object.entries(filters)) {
        const snakeKey = toSnakeCase(key);
        query = query.eq(snakeKey, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await withAuthErrorHandling(query);

    if (error) {
        throw error;
    }

    return ((data as DbBloque[]) || []).map(b => mapDbBloqueToBloque(b));
}

/**
 * Obtiene un bloque por ID
 */
export async function fetchBloque(id: string): Promise<Bloque | null> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .select('*')
            .eq('id', id)
            .single()
    );

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    if (!data) return null;

    return mapDbBloqueToBloque(data as DbBloque);
}

/**
 * Crea un nuevo bloque
 */
export async function createBloque(payload: Partial<Bloque>): Promise<Bloque> {
    // Only send fields that exist in the bloques table schema
    const allowedFields = new Set([
        'id', 'nombre', 'code', 'tipo', 'duracionSeg', 'instrucciones',
        'indicadorLogro', 'materialesRequeridos', 'mediaLinks', 'elementosOrdenados',
        'piezaRefId', 'profesorId', 'skillTags', 'targetPPMs', 'content'
    ]);

    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (allowedFields.has(key)) {
            filteredData[key] = value;
        }
    }

    const snakeData = camelToSnake(filteredData);

    // Fix targetPPMs mapping (camelToSnake produces target_pp_ms)
    // We expect target_ppms in the database
    const record = snakeData as Record<string, any>;
    if (record.target_pp_ms) {
        record.target_ppms = record.target_pp_ms;
        delete record.target_pp_ms;
    }

    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .insert(snakeData)
            .select()
            .single()
    );

    if (error) {
        throw error;
    }

    if (!data) throw new Error('Failed to create bloque');

    return mapDbBloqueToBloque(data);
}

/**
 * Actualiza un bloque existente
 */
export async function updateBloque(id: string, updates: Partial<Bloque>): Promise<Bloque> {
    const allowedFields = new Set([
        'nombre', 'code', 'tipo', 'duracionSeg', 'instrucciones',
        'indicadorLogro', 'materialesRequeridos', 'mediaLinks', 'elementosOrdenados',
        'piezaRefId', 'skillTags', 'targetPPMs', 'content'
    ]);

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.has(key)) {
            filteredUpdates[key] = value;
        }
    }

    const snakeUpdates = camelToSnake(filteredUpdates);

    const record = snakeUpdates as Record<string, any>;
    if (record.target_pp_ms) {
        record.target_ppms = record.target_pp_ms;
        delete record.target_pp_ms;
    }

    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('bloques')
            .update(snakeUpdates)
            .eq('id', id)
            .select()
            .single()
    );

    if (error) {
        throw error;
    }

    if (!data) throw new Error('Failed to update bloque');

    return mapDbBloqueToBloque(data);
}
