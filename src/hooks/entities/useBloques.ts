import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';

export function useBloques() {
    return useQuery({
        queryKey: ['bloques'],
        queryFn: () => remoteDataAPI.bloques.list(),
    });
}
