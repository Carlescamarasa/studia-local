import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';

export function useRegistrosSesion() {
    return useQuery({
        queryKey: ['registrosSesion'],
        queryFn: () => remoteDataAPI.registrosSesion.list(),
    });
}
