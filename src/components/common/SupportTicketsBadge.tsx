/**
 * Componente badge para mostrar el número de tickets de soporte pendientes
 * Solo se muestra para roles ADMIN y PROF
 * 
 * Pendientes = tickets con estado != 'cerrado' (es decir, 'abierto' o 'en_proceso')
 */

import { usePendingSupportTicketsCount } from '@/hooks/usePendingSupportTicketsCount';
import { Badge } from '@/components/ds';

export function SupportTicketsBadge() {
  const { count, isLoading, error } = usePendingSupportTicketsCount();

  // Log para debugging
  if (error) {
    console.warn('[SupportTicketsBadge] Error obteniendo conteo:', error);
  }

  // Si hay error, no mostrar badge (fallback silencioso)
  if (error) {
    return null;
  }

  // Si está cargando, no mostrar nada (o se puede mostrar un spinner pequeño si se prefiere)
  if (isLoading) {
    return null;
  }

  // Log del conteo obtenido
  console.log('[SupportTicketsBadge] Conteo de tickets pendientes:', {
    count,
    isLoading,
    willShow: count > 0,
  });

  // Si no hay tickets pendientes, no mostrar badge
  if (count === 0) {
    return null;
  }

  // Mostrar badge con el número de tickets pendientes
  return (
    <Badge 
      variant="danger" 
      className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ml-2"
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

