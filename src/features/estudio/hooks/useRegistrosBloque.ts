import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';

export const QUERY_KEY_REGISTROS_BLOQUE = 'registrosBloque';

export function useRegistrosBloque() {
    return useQuery({
        queryKey: [QUERY_KEY_REGISTROS_BLOQUE],
        queryFn: () => localDataClient.entities.RegistroBloque.list(),
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000,   // 10 min
        refetchOnWindowFocus: false,
    });
}

export function useRegistrosBloqueBySesion(registroSesionId: string) {
    return useQuery({
        queryKey: [QUERY_KEY_REGISTROS_BLOQUE, { registroSesionId }],
        queryFn: () => localDataClient.entities.RegistroBloque.filter({ registroSesionId }),
        enabled: !!registroSesionId,
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000,   // 10 min
        refetchOnWindowFocus: false,
    });
}
