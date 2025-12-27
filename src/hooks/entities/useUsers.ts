import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { remoteDataAPI } from '@/api/remote/api';

interface UserFromRPC {
    id: string;
    fullName: string;
    role: string;
    profesorAsignadoId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    nivel: string | null;
    nivelTecnico: number | null;
    telefono: string | null;
    profesorNombre: string | null;
}

/**
 * Hook centralizado para obtener usuarios.
 * 
 * USA ESTE HOOK para acceder a datos de usuarios en cualquier componente.
 * NO uses remoteDataAPI.usuarios.list() directamente - eso duplica llamadas.
 * 
 * Datos incluidos (vía RPC get_users_summary):
 * - Lista completa de perfiles con roles embebidos
 * - profesorNombre: nombre del profesor asignado (evita lookups adicionales)
 * - Relaciones profesor-estudiante ya resueltas
 * 
 * Optimizaciones:
 * - staleTime: 5 min (evita refetches innecesarios)
 * - gcTime: 10 min (mantiene en caché React Query)
 * - Fallback automático si la RPC no está desplegada
 * 
 * @example
 * const { data: users, isLoading } = useUsers();
 * const estudiantes = users?.filter(u => u.rolPersonalizado === 'ESTU');
 */
export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            try {
                // Intentar usar RPC consolidada
                const { data, error } = await supabase.rpc('get_users_summary');

                if (error) {
                    // Si la RPC no existe (error 42883), usar fallback
                    if (error.code === '42883' || error.message?.includes('does not exist')) {
                        console.warn('[useUsers] RPC get_users_summary no disponible, usando fallback');
                        return await remoteDataAPI.usuarios.list();
                    }
                    throw error;
                }

                // Normalizar respuesta de RPC al formato esperado
                const profiles = data?.profiles || [];
                return profiles.map((p: UserFromRPC) => ({
                    id: p.id,
                    fullName: p.fullName,
                    nombreCompleto: p.fullName,
                    rolPersonalizado: p.role,
                    role: p.role,
                    profesorAsignadoId: p.profesorAsignadoId,
                    isActive: p.isActive,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                    nivel: p.nivel,
                    nivelTecnico: p.nivelTecnico,
                    telefono: p.telefono,
                    // Añadir nombre del profesor directamente (evita lookups)
                    profesorNombre: p.profesorNombre,
                }));
            } catch (error) {
                // Fallback si falla la RPC
                console.warn('[useUsers] Error en RPC, usando fallback:', error);
                return await remoteDataAPI.usuarios.list();
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutos - evita refetches innecesarios
        gcTime: 10 * 60 * 1000,   // 10 minutos - mantener en caché (React Query v5: gcTime)
    });
}
