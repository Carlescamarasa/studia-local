import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';

/**
 * Hook para obtener todas las evaluaciones técnicas.
 * 
 * Centraliza el acceso usando React Query para caching y estado.
 * Usa localDataClient.entities.EvaluacionTecnica.list() bajo el capó.
 */
export function useEvaluacionesTecnicas() {
    return useQuery({
        queryKey: ['evaluacionesTecnicas'],
        queryFn: () => localDataClient.entities.EvaluacionTecnica.list(),
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000,   // 10 min
        refetchOnWindowFocus: false,
    });
}
