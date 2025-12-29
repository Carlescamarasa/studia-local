import { supabase } from './client';
import {
    snakeToCamel,
    camelToSnake,
    toSnakeCase,
    normalizeAsignacionISO,
    deserializeJsonFields
} from './utils';
import { generateId } from './id';
import { resolvePlanForAsignacion } from './planes';
import type { Asignacion, Plan } from '@/features/shared/types/domain';

export async function fetchAsignaciones(sort?: string): Promise<Asignacion[]> {
    try {
        // Intentar usar RPC consolidada
        const { data, error } = await supabase.rpc('get_asignaciones_summary'); // No args

        if (error) {
            // Si la RPC no existe (error 42883), lanzar para usar fallback
            if (error.code === '42883' || error.message?.includes('does not exist')) {
                console.warn('[fetchAsignaciones] RPC get_asignaciones_summary no disponible, usando fallback');
                throw error;
            }
            throw error;
        }

        // RPC devuelve objeto con propiedad 'asignaciones'
        const rawAsignaciones = data?.asignaciones || [];

        // Normalizar fechas y deserializar JSONs
        const asignacionesParsed = rawAsignaciones.map((a: any) => {
            // El RPC ya devuelve camelCase, así que no necesitamos snakeToCamel para las props del RPC
            // PERO: normalizeAsignacionISO espera un objeto Asignacion.
            // Los campos extra (alumnoNombre, etc) se preservan.

            // Asegurar que tenemos los campos mínimos requeridos
            const baseObj = {
                ...a,
                // Asegurar que plan_id vs planId se maneje (el RPC devuelve planId)
            };

            const normalized = normalizeAsignacionISO(baseObj);
            // Deserializar campos JSON (el RPC devuelve JSON objects ya, pero deserializeJsonFields asegura tipos correctos)
            // Nota: el RPC devuelve jsonb nativo, que postgrest convierte a objeto JS.
            // deserializeJsonFields a veces parsea strings. Si ya es objeto, lo deja igual.
            return deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);
        });

        // Ordenar en memoria si se pide sort (RPC devuelve por fecha desc por defecto)
        if (sort) {
            const direction = sort.startsWith('-') ? 'desc' : 'asc';
            const field = sort.startsWith('-') ? sort.slice(1) : sort;

            asignacionesParsed.sort((a: any, b: any) => {
                if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
                if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Obtener todos los planIds únicos que necesitamos cargar (para planes NO embebidos)
        // El RPC devuelve 'plan' y 'planAdaptado'. Si faltan y hay planId, cargamos.
        const planIdsNecesarios = new Set<string>();
        asignacionesParsed.forEach((a: any) => {
            if (a.planId && !a.planAdaptado && !a.plan) {
                planIdsNecesarios.add(a.planId);
            }
        });

        // Cargar todos los planes necesarios
        let planesList: Plan[] = [];
        if (planIdsNecesarios.size > 0) {
            const { data: planesData, error: planesError } = await supabase
                .from('planes')
                .select('*')
                .in('id', Array.from(planIdsNecesarios));

            if (!planesError && planesData) {
                planesList = planesData.map((p: any) => snakeToCamel<Plan>(p));
            }
        }

        // Resolver planes para cada asignación
        const asignacionesResueltas = await Promise.all(
            asignacionesParsed.map(async (a: any) => {
                const plan = await resolvePlanForAsignacion(a, planesList);
                return {
                    ...a, // Preservar campos extra (alumnoNombre, etc)
                    plan: plan || a.plan || null,
                } as Asignacion;
            })
        );

        return asignacionesResueltas;

    } catch (rpcError) {
        // FALLBACK: lógica original
        console.warn('[fetchAsignaciones] Usando fallback a query normal:', rpcError);

        let query = supabase.from('asignaciones').select('*');

        if (sort) {
            const direction = sort.startsWith('-') ? 'desc' : 'asc';
            const field = sort.startsWith('-') ? sort.slice(1) : sort;
            const snakeField = toSnakeCase(field);
            query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;

        // Cargar todos los planes necesarios de una vez para eficiencia
        const asignacionesParsed = (data || []).map((a: any) => {
            const parsed = snakeToCamel<Asignacion>(a);
            return normalizeAsignacionISO(parsed);
        });

        // Obtener todos los planIds únicos que necesitamos cargar
        const planIdsNecesarios = new Set<string>();
        asignacionesParsed.forEach((a: any) => {
            if (a.planId && !a.planAdaptado && !a.plan) {
                planIdsNecesarios.add(a.planId);
            }
        });

        // Cargar todos los planes necesarios
        let planesList: Plan[] = [];
        if (planIdsNecesarios.size > 0) {
            const { data: planesData, error: planesError } = await supabase
                .from('planes')
                .select('*')
                .in('id', Array.from(planIdsNecesarios));

            if (!planesError && planesData) {
                planesList = planesData.map((p: any) => snakeToCamel<Plan>(p));
            }
        }

        // Resolver planes para cada asignación
        const asignacionesResueltas = await Promise.all(
            asignacionesParsed.map(async (a: any) => {
                const plan = await resolvePlanForAsignacion(a, planesList);
                return {
                    ...deserializeJsonFields(a, ['planAdaptado', 'piezaSnapshot']),
                    plan: plan || a.plan || null, // Asegurar que siempre hay un plan
                } as Asignacion;
            })
        );

        return asignacionesResueltas;
    }
}

export async function fetchAsignacion(id: string): Promise<Asignacion | null> {
    const { data, error } = await supabase
        .from('asignaciones')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    // Deserializar campos JSON después de leer
    const parsed = snakeToCamel<Asignacion>(data);
    const normalized = normalizeAsignacionISO(parsed);
    const deserialized = deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);

    // Resolver el plan
    const plan = await resolvePlanForAsignacion(deserialized);

    return {
        ...deserialized,
        plan: plan || deserialized.plan || null,
    } as Asignacion;
}

export async function fetchAsignacionesByFilter(filters: Record<string, any>, limit?: number | null): Promise<Asignacion[]> {
    let query = supabase.from('asignaciones').select('*');

    for (const [key, value] of Object.entries(filters)) {
        const snakeKey = toSnakeCase(key);
        query = query.eq(snakeKey, value);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Cargar todos los planes necesarios de una vez para eficiencia
    const asignacionesParsed = (data || []).map((a: any) => {
        const parsed = snakeToCamel<Asignacion>(a);
        return normalizeAsignacionISO(parsed);
    });

    // Obtener todos los planIds únicos que necesitamos cargar
    const planIdsNecesarios = new Set<string>();
    asignacionesParsed.forEach((a: any) => {
        if (a.planId && !a.planAdaptado && !a.plan) {
            planIdsNecesarios.add(a.planId);
        }
    });

    // Cargar todos los planes necesarios
    let planesList: Plan[] = [];
    if (planIdsNecesarios.size > 0) {
        const { data: planesData, error: planesError } = await supabase
            .from('planes')
            .select('*')
            .in('id', Array.from(planIdsNecesarios));

        if (!planesError && planesData) {
            planesList = planesData.map((p: any) => snakeToCamel<Plan>(p));
        }
    }

    // Resolver planes para cada asignación
    const asignacionesResueltas = await Promise.all(
        asignacionesParsed.map(async (a: any) => {
            const plan = await resolvePlanForAsignacion(a, planesList);
            return {
                ...deserializeJsonFields(a, ['planAdaptado', 'piezaSnapshot']),
                plan: plan || a.plan || null,
            } as Asignacion;
        })
    );

    return asignacionesResueltas;
}

export async function createAsignacion(data: Partial<Asignacion>): Promise<Asignacion> {
    // Arquitectura híbrida: soportar planId (referencia) o plan/planAdaptado (snapshot)
    const planIdValue = (data as any).planId;
    const planValue = data.plan || (data as any).planAdaptado; // plan es legacy, planAdaptado es nuevo
    const piezaSnapshotValue = (data as any).piezaSnapshot;

    const dataWithoutJson = { ...data } as any;
    delete dataWithoutJson.plan;
    delete dataWithoutJson.planAdaptado;
    delete dataWithoutJson.planId;
    delete dataWithoutJson.piezaSnapshot;

    const snakeData = camelToSnake({
        ...dataWithoutJson,
        id: data.id || generateId('asignacion'),
    });

    // Lógica híbrida:
    // - Si planId existe: usar referencia (plan_id = planId, plan_adaptado = NULL, plan = NULL si no hay snapshot)
    // - Si plan/planAdaptado existe: usar snapshot (plan_adaptado = plan, plan = plan para legacy)
    // - Si ambos existen: usar planId como referencia pero también mantener plan como snapshot para compatibilidad
    if (planIdValue && planValue) {
        // Ambos existen: usar planId como referencia pero mantener plan como snapshot para compatibilidad legacy
        snakeData.plan_id = planIdValue;
        snakeData.plan_adaptado = planValue;
        // Mantener compatibilidad con campo legacy: también asignar a plan si existe
        snakeData.plan = planValue;
    } else if (planIdValue) {
        // Solo planId: usar referencia
        snakeData.plan_id = planIdValue;
        snakeData.plan_adaptado = null;
        // Si la BD requiere plan NOT NULL, necesitamos un valor por defecto
        // Por ahora, dejamos null y el constraint CHECK debería permitirlo
        snakeData.plan = null;
    } else if (planValue) {
        // Solo snapshot: usar snapshot
        snakeData.plan_adaptado = planValue;
        // Mantener compatibilidad con campo legacy: también asignar a plan
        // Esto asegura que el constraint se cumpla si plan es NOT NULL
        snakeData.plan = planValue;
        snakeData.plan_id = null;
    } else {
        // Si no hay ninguno, el constraint de la BD fallará (correcto)
        throw new Error('Debe proporcionarse planId o plan/planAdaptado');
    }

    if (piezaSnapshotValue) {
        snakeData.pieza_snapshot = piezaSnapshotValue;
    } else {
        // pieza_snapshot es NOT NULL según el esquema
        throw new Error('piezaSnapshot es requerido');
    }

    console.log('[remoteDataAPI.asignaciones.create] snakeData being sent:', JSON.stringify(snakeData, null, 2));

    const { data: result, error } = await supabase
        .from('asignaciones')
        .insert(snakeData)
        .select()
        .single();

    if (error) {
        console.error('[remoteDataAPI] Error al crear asignación:', {
            error: error?.message || error,
            code: error?.code,
            details: error?.details,
        });
        throw error;
    }

    // Deserializar y resolver el plan
    const parsed = snakeToCamel<Asignacion>(result);
    const normalized = normalizeAsignacionISO(parsed);
    const deserialized = deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);

    // Resolver el plan para retornarlo
    const plan = await resolvePlanForAsignacion(deserialized);

    return {
        ...deserialized,
        plan: plan || deserialized.plan || null,
    } as Asignacion;
}

export async function updateAsignacion(id: string, updates: any): Promise<Asignacion> {
    // Arquitectura híbrida: permitir actualizar planAdaptado o planId
    // Manejar campo legacy 'plan' para compatibilidad
    if (updates.plan !== undefined && updates.planAdaptado === undefined) {
        // Si se envía 'plan' (legacy), convertirlo a planAdaptado
        updates.planAdaptado = updates.plan;
        delete updates.plan;
    }

    // Extraer campos especiales antes de camelToSnake
    const planIdValue = updates.planId;
    const planAdaptadoValue = updates.planAdaptado;
    const piezaSnapshotValue = updates.piezaSnapshot;

    const updatesWithoutJson = { ...updates };
    delete updatesWithoutJson.planId;
    delete updatesWithoutJson.planAdaptado;
    delete updatesWithoutJson.plan; // Legacy
    delete updatesWithoutJson.piezaSnapshot;

    // Campos permitidos en update
    const camposPermitidos = new Set([
        'notas', 'foco', 'estado', 'semanaInicioISO', 'semana_inicio_iso',
        'piezaId', 'pieza_id', 'piezaSnapshot', 'pieza_snapshot',
        'profesorId', 'profesor_id', 'alumnoId', 'alumno_id',
        'planId', 'plan_id', 'planAdaptado', 'plan_adaptado',
        'isDraft', 'is_draft', 'modo'
    ]);

    const camposActualizados = Object.keys(updatesWithoutJson);
    const camposNoPermitidos = camposActualizados.filter(campo => {
        const campoCamel = camelToSnake({ [campo]: '' });
        const campoSnake = Object.keys(campoCamel)[0];
        return !camposPermitidos.has(campo) && !camposPermitidos.has(campoSnake);
    });

    if (camposNoPermitidos.length > 0) {
        const errorMsg = `Campos no permitidos en actualización de asignación: ${camposNoPermitidos.join(', ')}. Solo se pueden actualizar: notas, foco, estado, semanaInicioISO, piezaId, planId, planAdaptado (y piezaSnapshot si piezaId cambia).`;
        console.warn('[remoteDataAPI]', errorMsg);
        // @ts-ignore
        if (import.meta.env.DEV) {
            console.warn('[remoteDataAPI] Campos eliminados del update:', camposNoPermitidos);
        }
        camposNoPermitidos.forEach(campo => delete updatesWithoutJson[campo]);
    }

    const snakeUpdates = camelToSnake(updatesWithoutJson);

    // Manejar planId y planAdaptado
    // Si se actualiza planAdaptado: establecer plan_id = NULL (ya no usa referencia)
    // Si se actualiza planId: establecer plan_adaptado = NULL (vuelve a usar referencia)
    // IMPORTANTE: No establecer ambos a null al mismo tiempo (violaría el constraint)
    if (planAdaptadoValue !== undefined) {
        snakeUpdates.plan_adaptado = planAdaptadoValue;
        // Solo establecer plan_id a null si realmente estamos actualizando plan_adaptado
        // No tocar plan_id si no se está actualizando explícitamente
        if (planIdValue === undefined) {
            snakeUpdates.plan_id = null; // Ya no usa referencia
        }
    }

    if (planIdValue !== undefined) {
        snakeUpdates.plan_id = planIdValue;
        // Solo establecer plan_adaptado a null si realmente estamos actualizando planId
        // No tocar plan_adaptado si no se está actualizando explícitamente
        if (planAdaptadoValue === undefined) {
            snakeUpdates.plan_adaptado = null; // Vuelve a usar referencia
        }
    }

    if (piezaSnapshotValue !== undefined) {
        snakeUpdates.pieza_snapshot = piezaSnapshotValue;
    }

    // Validar que no esté vacío
    if (Object.keys(snakeUpdates).length === 0) {
        throw new Error('No se pueden actualizar asignaciones con un objeto vacío. Debe incluir al menos un campo válido.');
    }

    // @ts-ignore
    if (import.meta.env.DEV) {
        console.log('[remoteDataAPI] Actualizando asignación:', {
            id,
            camposActualizados: Object.keys(snakeUpdates),
            incluyePlanId: planIdValue !== undefined,
            incluyePlanAdaptado: planAdaptadoValue !== undefined,
            incluyePiezaSnapshot: piezaSnapshotValue !== undefined,
        });
    }

    const { data, error } = await supabase
        .from('asignaciones')
        .update(snakeUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        const errorContext = {
            error: error?.message || error,
            code: error?.code,
            details: error?.details,
            id,
        };

        console.error('[remoteDataAPI] Error al actualizar asignación:', errorContext);

        // Mejorar mensajes de error específicos
        if (error.code === 'PGRST204' || error.code === '406') {
            const errorMsg = 'Error 406 (Not Acceptable): El servidor rechazó la actualización. Verifica que los campos enviados sean válidos y modificables.';
            throw new Error(errorMsg);
        }
        if (error.code === 'PGRST116') {
            // Error: no se encontró la fila o no se pudo devolver
            const errorMsg = 'Error: No se pudo actualizar la asignación. Verifica que el ID sea válido y que tengas permisos para actualizarla.';
            throw new Error(errorMsg);
        }
        throw error;
    }

    const resultado = snakeToCamel<Asignacion>(data);
    return resultado;
}

export async function deleteAsignacion(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('asignaciones')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return { success: true };
}
