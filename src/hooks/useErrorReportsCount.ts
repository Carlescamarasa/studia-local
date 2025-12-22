import { useQuery } from '@tanstack/react-query';
import { listErrorReports } from '@/api/errorReportsAPI';
import { useEffectiveUser } from '@/providers/EffectiveUserProvider';

/**
 * Hook para obtener los conteos de reportes de errores
 * Solo funciona para usuarios ADMIN
 * 
 * NOTA: Usa realRole (no effectiveRole) porque los badges de admin
 * deben seguir funcionando durante impersonation
 */
export function useErrorReportsCount() {
  const { realRole, realUserId } = useEffectiveUser();
  const userRole = realRole; // Admin badges usan rol real

  const { data: reportCounts, isLoading } = useQuery({
    queryKey: ['error-reports-counts'],
    queryFn: async () => {
      if (userRole !== 'ADMIN') {
        return { nuevos: 0, enRevision: 0 };
      }

      try {
        const { localDataClient } = await import('@/api/localDataClient');
        const { data: { session } } = await localDataClient.auth.getSession();
        if (!session?.access_token) {
          return { nuevos: 0, enRevision: 0 };
        }
      } catch (sessionError) {
        return { nuevos: 0, enRevision: 0 };
      }

      try {
        const [nuevos, enRevision] = await Promise.all([
          listErrorReports({ status: 'nuevo' }),
          listErrorReports({ status: 'en_revision' })
        ]);

        return {
          nuevos: Array.isArray(nuevos) ? nuevos.length : 0,
          enRevision: Array.isArray(enRevision) ? enRevision.length : 0
        };
      } catch (error) {
        if (error?.message?.includes('CORS') ||
          error?.message?.includes('NetworkError') ||
          error?.code === 'PGRST301' ||
          error?.status === 401 ||
          error?.status === 403) {
          return { nuevos: 0, enRevision: 0 };
        }
        console.error('[useErrorReportsCount] Error obteniendo conteos:', error);
        return { nuevos: 0, enRevision: 0 };
      }
    },
    enabled: Boolean(userRole) && userRole === 'ADMIN' && Boolean(realUserId),
    refetchInterval: 5 * 60 * 1000, // 5 min (was 30s)
    staleTime: 2 * 60 * 1000,       // 2 min cache
    retry: false,
  });

  const nuevos = reportCounts?.nuevos || 0;
  const enRevision = reportCounts?.enRevision || 0;
  const totalCount = nuevos + enRevision;

  return {
    nuevos,
    enRevision,
    totalCount,
    isLoading,
  };
}
