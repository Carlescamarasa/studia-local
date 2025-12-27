import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remoteDataAPI';

export default function useFeedbacksSemanal() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['feedbacksSemanal'],
        queryFn: () => remoteDataAPI.feedbacksSemanal.list(),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    return {
        data: data || [],
        isLoading,
        error,
    };
}
