import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';

/**
 * Filtros soportados para useAsignaciones.
 * Todos los campos son opcionales.
 */
export interface AsignacionFilters {
    profesorId?: string;
    alumnoId?: string;
    estado?: 'borrador' | 'publicada' | 'en_curso' | 'cerrada';
    piezaId?: string;
    planId?: string;
}

/**
 * useAsignaciones – Hook de lectura de asignaciones desde Supabase.
 * 
 * @param filters - Opcional. Puedes filtrar por { profesorId, alumnoId, estado, piezaId, planId }.
 * @returns React Query result con data, isLoading, isError, error, etc.
 * 
 * @example
 * // Sin filtros (todas las asignaciones)
 * const { data: asignaciones } = useAsignaciones();
 * 
 * @example
 * // Filtrar por profesorId
 * const { data: misAsignaciones } = useAsignaciones({ profesorId: effectiveUser.id });
 * 
 * @example
 * // Filtrar por alumnoId y estado
 * const { data: asignacionesActivas } = useAsignaciones({ 
 *     alumnoId: alumnoId, 
 *     estado: 'publicada' 
 * });
 */
export function useAsignaciones(filters?: AsignacionFilters) {
    // Crear queryKey que incluya los filtros para cache correcto
    const queryKey = filters && Object.keys(filters).length > 0
        ? ['asignaciones', filters]
        : ['asignaciones'];

    return useQuery({
        queryKey,
        queryFn: () => {
            // Si hay filtros, usar la función de filtrado
            if (filters && Object.keys(filters).length > 0) {
                return remoteDataAPI.asignaciones.filter(filters);
            }
            // Sin filtros, usar list normal (ahora optimizado con RPC)
            return remoteDataAPI.asignaciones.list();
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000,   // 10 minutos
    });
}
