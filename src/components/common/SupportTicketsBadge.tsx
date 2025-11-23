/**
 * Componente badge para mostrar el número de tickets de soporte pendientes
 * Se muestra para roles ADMIN, PROF y ESTU
 * 
 * Distingue entre tickets leídos y no leídos:
 * - No leídos (rojo): tickets donde la última respuesta es del otro lado (requiere atención inmediata)
 * - Leídos (naranja): tickets pendientes pero ya vistos (recordatorio de que hay que responder)
 * 
 * Pendientes = tickets con estado != 'cerrado' (es decir, 'abierto' o 'en_proceso')
 * - ADMIN: todos los tickets pendientes
 * - PROF: tickets pendientes de sus alumnos asignados
 * - ESTU: tickets pendientes del estudiante
 */

import { usePendingSupportTicketsCount } from '@/hooks/usePendingSupportTicketsCount';
import { Badge } from '@/components/ds';

export function SupportTicketsBadge() {
  const { total, unread, isLoading, error } = usePendingSupportTicketsCount();

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
    total,
    unread,
    isLoading,
    willShow: total > 0,
  });

  // Si no hay tickets pendientes, no mostrar badge
  if (total === 0) {
    return null;
  }

  // Si hay no leídos, mostrar badge rojo con el número de no leídos
  if (unread > 0) {
    return (
      <Badge 
        variant="danger" 
        className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ml-2"
      >
        {unread > 99 ? '99+' : unread}
      </Badge>
    );
  }

  // Si no hay no leídos pero hay tickets pendientes, mostrar badge naranja con el total
  // (recordatorio de que hay tickets que requieren atención aunque ya estén leídos)
  return (
    <Badge 
      variant="warning" 
      className="text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ml-2"
    >
      {total > 99 ? '99+' : total}
    </Badge>
  );
}

