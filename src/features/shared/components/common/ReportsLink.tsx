import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listErrorReports } from '@/api/errorReportsAPI';
import { Badge } from '@/features/shared/components/ds';
import { Bug } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/auth/AuthProvider';
import { getEffectiveRole } from '@/features/shared/utils/helpers';

interface ReportsLinkProps extends Omit<LinkProps, 'to'> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Componente Link que muestra el badge de reportes cuando hay reportes pendientes
 * Similar al comportamiento del sidebar pero reutilizable
 */
export default function ReportsLink({
  children,
  className = '',
  ...linkProps
}: ReportsLinkProps) {
  const { user, appRole } = useAuth();
  const userRole = getEffectiveRole({ appRole, currentUser: null }) || null;

  // Obtener conteos de reportes (solo para ADMIN)
  const { data: reportCounts } = useQuery({
    queryKey: ['error-reports-counts'],
    queryFn: async () => {
      if (userRole !== 'ADMIN') {
        return { nuevos: 0, enRevision: 0 };
      }

      try {
        const { localDataClient } = await import('@/api/localDataClient');
        // @ts-expect-error - getSession may not exist on this type
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
        const err = error as any;
        if (err?.message?.includes('CORS') ||
          err?.message?.includes('NetworkError') ||
          err?.code === 'PGRST301' ||
          err?.status === 401 ||
          err?.status === 403) {
          return { nuevos: 0, enRevision: 0 };
        }
        console.error('[ReportsLink] Error obteniendo conteos de reportes:', error);
        return { nuevos: 0, enRevision: 0 };
      }
    },
    enabled: Boolean(userRole) && userRole === 'ADMIN' && Boolean(user),
    refetchInterval: 5 * 60 * 1000, // 5 min (was 30s)
    staleTime: 2 * 60 * 1000,       // 2 min cache
    retry: false,
  });

  const nuevos = reportCounts?.nuevos || 0;
  const enRevision = reportCounts?.enRevision || 0;
  const totalCount = nuevos + enRevision;

  return (
    <Link
      to={createPageUrl('reportes')}
      className={className}
      {...linkProps}
    >
      {children || 'Reportes'}
      {totalCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[var(--color-danger)] rounded-full z-10">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {nuevos > 0 && (
              <Badge variant="danger" className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                {nuevos}
              </Badge>
            )}
            {enRevision > 0 && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                {enRevision}
              </Badge>
            )}
          </div>
        </>
      )}
    </Link>
  );
}
