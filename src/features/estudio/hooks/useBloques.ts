import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';
import type { Bloque } from '@/features/shared/types/domain';

export function useBloques() {
    return useQuery<Bloque[]>({
        queryKey: ['bloques'],
        queryFn: () => remoteDataAPI.bloques.list(),
    });
}

