import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '../../api/remote/api';

/**
 * Hook para obtener los feedbacks semanales.
 * 
 * Centraliza el acceso usando React Query para caching y estado.
 * Usa remoteDataAPI.feedbacksSemanal.list() bajo el capó.
 */
export function useFeedbacksSemanal() {
    return useQuery({
        queryKey: ['feedbacksSemanal'],
        queryFn: () => remoteDataAPI.feedbacksSemanal.list(),
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000,   // 10 min
    });
}
