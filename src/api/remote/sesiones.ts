import { supabase, withAuthErrorHandling } from './client';
import { snakeToCamel, camelToSnake, toSnakeCase, normalizeISOFields } from './utils';
import { generateId } from './id';
import type { RegistroSesion, RegistroBloque } from '@/features/shared/types/domain';

interface DbRegistroSesion {
    id: string;
    alumno_id: string;
    inicio_iso: string;
    fin_iso?: string;
    duracion_real_seg: number;
    calificacion?: number;
    comentarios?: string;
    bloques_completados?: number;
    bloques_omitidos?: number;
    created_at?: string;
    updated_at?: string;
    // Add other fields as strict as possible
    [key: string]: unknown;
}

interface DbRegistroBloque {
    id: string;
    registro_sesion_id: string;
    bloque_id: string;
    completado: boolean;
    duracion_real_seg: number;
    [key: string]: unknown;
}

/**
 * Obtiene una vista previa de los registros de sesión (limitado a 20)
 */
export async function fetchRegistrosSesionPreview(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('registros_sesion')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)
    );

    if (error) {
        throw error;
    }

    return ((data as DbRegistroSesion[]) || []);
}

/**
 * Obtiene todos los registros de sesión (para migración de multimedia)
 */
export async function fetchRegistrosSesionMultimedia(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('registros_sesion')
            .select('*')
    );

    if (error) {
        throw error;
    }

    return ((data as DbRegistroSesion[]) || []);
}

/**
 * Obtiene las sesiones recientes (para página de ejercicios)
 */
export async function fetchRecentRegistrosSesion(): Promise<any[]> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('registros_sesion')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)
    );

    if (error) {
        throw error;
    }

    return ((data as DbRegistroSesion[]) || []);
}

export async function fetchRegistrosSesionList(sort?: string, options: { includeBlocks?: boolean } = { includeBlocks: true }): Promise<RegistroSesion[]> {
    let query = supabase.from('registros_sesion').select('*');

    if (sort) {
        const direction = sort.startsWith('-') ? 'desc' : 'asc';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        const snakeField = toSnakeCase(field);
        query = query.order(snakeField, { ascending: direction === 'asc' });
    }

    const { data: sessionsData, error: sessionsError } = await query;
    if (sessionsError) {
        throw sessionsError;
    }

    const sessions: RegistroSesion[] = ((sessionsData as DbRegistroSesion[]) || []).map((r: DbRegistroSesion) => {
        const camel = snakeToCamel<RegistroSesion>(r);
        return normalizeISOFields<RegistroSesion>(camel);
    });

    if (sessions.length === 0 || options.includeBlocks === false) return sessions;

    // Fetch associated blocks in batches to avoid URL length limits
    const sessionIds = sessions.map(s => s.id);
    const chunkSize = 50;
    let allBlocks: any[] = [];

    // Process in chunks
    for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        const { data: blocksData, error: blocksError } = await supabase
            .from('registros_bloque')
            .select('*')
            .in('registro_sesion_id', chunk);

        if (blocksError) {
            console.warn('[remoteDataAPI] Error fetching blocks chunk:', blocksError);
            continue;
        }

        if (blocksData) {
            allBlocks = [...allBlocks, ...blocksData];
        }
    }

    const blocks = (allBlocks as DbRegistroBloque[]).map((b: DbRegistroBloque) => normalizeISOFields<RegistroBloque>(snakeToCamel<RegistroBloque>(b)));

    // Join blocks to sessions
    return sessions.map(session => ({
        ...session,
        registrosBloque: blocks.filter(b => b.registroSesionId === session.id)
    }));
}

export async function fetchRegistroSesion(id: string): Promise<RegistroSesion | null> {
    const { data: sessionData, error: sessionError } = await supabase
        .from('registros_sesion')
        .select('*')
        .eq('id', id)
        .single();

    if (sessionError) {
        if (sessionError.code === 'PGRST116') return null;
        throw sessionError;
    }

    const camel = snakeToCamel<RegistroSesion>(sessionData as DbRegistroSesion);
    const session = normalizeISOFields<RegistroSesion>(camel);

    // Fetch associated blocks
    const { data: blocksData, error: blocksError } = await supabase
        .from('registros_bloque')
        .select('*')
        .eq('registro_sesion_id', id);

    if (blocksError) {
        console.warn('[remoteDataAPI] Error fetching blocks for session:', blocksError);
        return session;
    }

    const blocks = ((blocksData as DbRegistroBloque[]) || []).map((b: DbRegistroBloque) => normalizeISOFields<RegistroBloque>(snakeToCamel<RegistroBloque>(b)));

    return {
        ...session,
        registrosBloque: blocks
    };
}

export async function fetchRegistrosSesionByFilter(filters: Record<string, any>, limit?: number | null, options: { includeBlocks?: boolean } = { includeBlocks: true }): Promise<RegistroSesion[]> {
    let query = supabase.from('registros_sesion').select('*');

    for (const [key, value] of Object.entries(filters)) {
        const snakeKey = toSnakeCase(key);
        query = query.eq(snakeKey, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data: sessionsData, error: sessionsError } = await query;
    if (sessionsError) throw sessionsError;

    const sessions: RegistroSesion[] = ((sessionsData as DbRegistroSesion[]) || []).map((r: DbRegistroSesion) => {
        const camel = snakeToCamel<RegistroSesion>(r);
        return normalizeISOFields<RegistroSesion>(camel);
    });

    if (sessions.length === 0 || options.includeBlocks === false) return sessions;

    // Fetch associated blocks in batches to avoid URL length limits
    const sessionIds = sessions.map(s => s.id);
    const chunkSize = 50;
    let allBlocks: any[] = [];

    // Process in chunks
    for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        const { data: blocksData, error: blocksError } = await supabase
            .from('registros_bloque')
            .select('*')
            .in('registro_sesion_id', chunk);

        if (blocksError) {
            console.warn('[remoteDataAPI] Error fetching blocks chunk:', blocksError);
            continue;
        }

        if (blocksData) {
            allBlocks = [...allBlocks, ...blocksData];
        }
    }

    const blocks = (allBlocks as DbRegistroBloque[]).map((b: DbRegistroBloque) => normalizeISOFields<RegistroBloque>(snakeToCamel<RegistroBloque>(b)));

    // Join blocks to sessions
    return sessions.map(session => ({
        ...session,
        registrosBloque: blocks.filter(b => b.registroSesionId === session.id)
    }));
}

export async function createRegistroSesion(data: Partial<RegistroSesion>): Promise<RegistroSesion> {
    const snakeData = camelToSnake<Partial<DbRegistroSesion>>({
        ...data,
        id: data.id || generateId('registroSesion'),
    });
    const { data: result, error } = await supabase
        .from('registros_sesion')
        .insert(snakeData)
        .select()
        .single();

    if (error) throw error;
    return normalizeISOFields(snakeToCamel<RegistroSesion>(result as DbRegistroSesion));
}

export async function updateRegistroSesion(id: string, updates: Partial<RegistroSesion>): Promise<RegistroSesion> {
    const snakeUpdates = camelToSnake<Partial<DbRegistroSesion>>(updates);
    const { data, error } = await supabase
        .from('registros_sesion')
        .update(snakeUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return normalizeISOFields(snakeToCamel<RegistroSesion>(data as DbRegistroSesion));
}

export async function deleteRegistroSesion(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('registros_sesion')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return { success: true };
}
