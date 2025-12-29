import { useQuery } from "@tanstack/react-query";
import { createRemoteDataAPI } from "@/api/remoteDataAPI";
import { localDataClient } from "@/api/localDataClient";

const remoteDataAPI = createRemoteDataAPI();

export function useBloques() {
    return useQuery({
        queryKey: ['bloques-with-variations'],
        queryFn: async () => {
            try {
                // Fetch from Supabase to get content/variations field
                const bloques = await remoteDataAPI.bloques.list();
                // Logging for dev transparency, simplified from original
                if (import.meta.env.DEV && bloques?.length) {
                    console.debug('[useBloques] Loaded bloques count:', bloques.length);
                }
                return bloques || [];
            } catch (error) {
                console.error('Error fetching bloques from Supabase, falling back to localStorage:', error);
                // Fallback to localStorage if Supabase fails
                const localRes = await localDataClient.entities.Bloque.list();
                return localRes || [];
            }
        },
        staleTime: 30 * 1000, // 30s - needs recent data for study session
        refetchOnWindowFocus: false,
    });
}
