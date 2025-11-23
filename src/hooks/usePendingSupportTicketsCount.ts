/**
 * Hook para obtener el conteo de tickets de soporte pendientes
 * 
 * Retorna el conteo según el rol del usuario:
 * - ADMIN: total de tickets pendientes en el sistema
 * - PROF: tickets pendientes de sus alumnos asignados
 * - ESTU: tickets pendientes del estudiante (estado != 'cerrado')
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { 
  getPendingSupportTicketsCountForAdmin, 
  getPendingSupportTicketsCountForProf,
  getPendingSupportTicketsCountForEstu
} from '@/data/supportTicketsClient';

export function usePendingSupportTicketsCount() {
  const { user, appRole } = useAuth();

  const { data: count = 0, isLoading, error } = useQuery({
    queryKey: ['pending-support-tickets-count', appRole, user?.id],
    queryFn: async () => {
      console.log('[usePendingSupportTicketsCount] Iniciando conteo:', {
        userId: user?.id,
        appRole,
      });

      // Si no hay usuario o rol, retornar 0
      if (!user?.id || !appRole) {
        console.log('[usePendingSupportTicketsCount] Sin usuario o rol, retornando 0');
        return 0;
      }

      try {
        let result = 0;

        // ADMIN: contar todos los tickets pendientes
        if (appRole === 'ADMIN') {
          console.log('[usePendingSupportTicketsCount] Contando para ADMIN');
          result = await getPendingSupportTicketsCountForAdmin();
        }
        // PROF: contar tickets pendientes de sus alumnos
        else if (appRole === 'PROF') {
          console.log('[usePendingSupportTicketsCount] Contando para PROF:', { profesorId: user.id });
          result = await getPendingSupportTicketsCountForProf(user.id);
        }
        // ESTU: contar tickets pendientes del estudiante
        else if (appRole === 'ESTU') {
          console.log('[usePendingSupportTicketsCount] Contando para ESTU:', { estudianteId: user.id });
          result = await getPendingSupportTicketsCountForEstu(user.id);
        }

        console.log('[usePendingSupportTicketsCount] Conteo obtenido:', {
          appRole,
          count: result,
        });

        return result;
      } catch (err) {
        console.error('[usePendingSupportTicketsCount] Error obteniendo conteo:', err);
        // Retornar 0 en caso de error para no romper la UI
        return 0;
      }
    },
    enabled: !!user?.id && !!appRole,
    // Refrescar cada 30 segundos para mantener el conteo actualizado
    refetchInterval: 30000,
    // No mostrar errores de red/CORS como errores críticos
    retry: false,
  });

  return {
    count,
    isLoading,
    error: error as Error | null,
  };
}

