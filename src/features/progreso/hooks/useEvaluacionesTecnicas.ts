import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { EvaluacionTecnica } from '@/features/shared/types/domain';

/**
 * Hook to fetch all technical evaluations for all students.
 * Used for multi-student aggregation and individual progress tracking.
 */
export function useEvaluacionesTecnicas() {
    return useQuery<EvaluacionTecnica[]>({
        queryKey: ['evaluaciones-tecnicas-all'],
        queryFn: async () => {
            const result = await localDataClient.entities.EvaluacionTecnica.list();
            return result as EvaluacionTecnica[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
