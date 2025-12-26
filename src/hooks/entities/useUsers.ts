import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => remoteDataAPI.usuarios.list(),
    });
}
