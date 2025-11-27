/**
 * Hook para obtener el conteo de tickets de soporte pendientes
 * 
 * Retorna el conteo según el rol del usuario:
 * - ADMIN: total de tickets pendientes en el sistema
 * - PROF: tickets pendientes de sus alumnos asignados
 * - ESTU: tickets pendientes del estudiante (estado != 'cerrado')
 * 
 * También distingue entre tickets leídos y no leídos:
 * - No leídos: tickets donde la última respuesta es del otro lado (requiere atención)
 * - Leídos: tickets pendientes pero ya vistos
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { 
  getPendingSupportTicketsCountsForAdmin, 
  getPendingSupportTicketsCountsForProf,
  getPendingSupportTicketsCountsForEstu
} from '@/data/supportTicketsClient';

export function usePendingSupportTicketsCount() {
  const { user, appRole } = useAuth();

  const { data: counts = { total: 0, unread: 0 }, isLoading, error } = useQuery({
    queryKey: ['pending-support-tickets-counts', appRole, user?.id],
    queryFn: async () => {
      // Si no hay usuario o rol, retornar 0
      if (!user?.id || !appRole) {
        return { total: 0, unread: 0 };
      }

      try {
        let result = { total: 0, unread: 0 };

        // ADMIN: contar todos los tickets pendientes
        if (appRole === 'ADMIN') {
          result = await getPendingSupportTicketsCountsForAdmin();
        }
        // PROF: contar tickets pendientes de sus alumnos
        else if (appRole === 'PROF') {
          result = await getPendingSupportTicketsCountsForProf(user.id);
        }
        // ESTU: contar tickets pendientes del estudiante
        else if (appRole === 'ESTU') {
          result = await getPendingSupportTicketsCountsForEstu(user.id);
        }

        return result;
      } catch (err) {
        console.error('[usePendingSupportTicketsCount] Error obteniendo conteo:', err);
        // Retornar 0 en caso de error para no romper la UI
        return { total: 0, unread: 0 };
      }
    },
    enabled: !!user?.id && !!appRole,
    // Refrescar cada 30 segundos para mantener el conteo actualizado
    refetchInterval: 30000,
    // No mostrar errores de red/CORS como errores críticos
    retry: false,
  });

  return {
    total: counts.total,
    unread: counts.unread,
    isLoading,
    error: error as Error | null,
  };
}

