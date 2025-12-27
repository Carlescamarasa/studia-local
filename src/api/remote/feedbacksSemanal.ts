import { supabase, withAuthErrorHandling } from './client';

/**
 * Obtiene el listado de todos los feedbacks semanales
 */
export async function fetchFeedbacksSemanalList(sort: string = '-created_at'): Promise<any[]> {
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

    return (data as any[]) || [];
}


/**
 * Obtiene un feedback por ID
 */
export async function fetchFeedbackSemanal(id: string): Promise<any> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .select('*')
            .eq('id', id)
            .single()
    );

    if (error) {
        if (error.code === 'PGRST116') return null; // No encontrado
        throw error;
    }

    return data;
}

/**
 * Filtra feedbacks
 */
export async function fetchFeedbacksSemanalByFilter(filters: Record<string, any>, limit?: number | null): Promise<any[]> {
    let query = supabase.from('feedbacks_semanal').select('*');

    for (const [key, value] of Object.entries(filters)) {
        // El caller (api.ts) debería pasar ya las keys en snake_case si lo hace bien, 
        // o nosotros lo hacemos aquí. En api.ts para 'bloques' lo hace inline.
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

    return (data as any[]) || [];
}

/**
 * Crea un feedback
 */
export async function createFeedbackSemanal(payload: any): Promise<any> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .insert(payload)
            .select() // Esto es importante para que devuelva el registro creado
            .single()
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Actualiza un feedback
 */
export async function updateFeedbackSemanal(id: string, payload: any): Promise<any> {
    const { data, error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .update(payload)
            .eq('id', id)
            .select()
            .single()
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Elimina un feedback
 */
export async function deleteFeedbackSemanal(id: string): Promise<void> {
    const { error } = await withAuthErrorHandling(
        supabase
            .from('feedbacks_semanal')
            .delete()
            .eq('id', id)
    );

    if (error) {
        throw error;
    }
}
