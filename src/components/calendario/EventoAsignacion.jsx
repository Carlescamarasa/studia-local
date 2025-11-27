import React from "react";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerColorEvento, obtenerLabelEstadoAsignacion, calcularPatronSemanasAsignacion } from "./utils";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";

export default function EventoAsignacion({ asignacion, usuarios, onClick, variant = 'default', registrosSesion = [], fechaEvento = null }) {
  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const fechaSemana = asignacion.semanaInicioISO ? formatearFechaEvento(asignacion.semanaInicioISO) : '';
  const piezaNombre = asignacion.piezaSnapshot?.nombre || asignacion.piezaId || 'Pieza';

  const colores = obtenerColorEvento('asignacion');

  const estadoColors = {
    publicada: 'success',
    borrador: 'default',
    archivada: 'warning',
  };

  // Calcular patrón de semanas usando el helper reutilizable
  // Si se proporciona fechaEvento, usar esa fecha para calcular la semana actual
  // Si no, usar la fecha de inicio (comportamiento por defecto)
  const fechaParaPatron = fechaEvento || asignacion.semanaInicioISO;
  const patronSemanas = calcularPatronSemanasAsignacion(asignacion, fechaParaPatron);

  // Variante compacta para vista Semana
  if (variant === 'week') {
    const asignacionMediaLinks = asignacion.mediaLinks || asignacion.media_links || [];

    return (
      <div
        onClick={onClick}
        className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {/* Línea 1: Nombre de la pieza (texto principal, bold) */}
        <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
          {piezaNombre}
        </p>
        {/* Línea 2: Patrón de semanas (texto pequeño, muted) */}
        {patronSemanas && (
          <p className="text-[10px] text-[var(--color-text-secondary)] mb-1 font-mono">
            {patronSemanas}
          </p>
        )}
        {/* Media links (solo iconos, si existen) */}
        {Array.isArray(asignacionMediaLinks) && asignacionMediaLinks.length > 0 && (
          <div className="mt-1">
            <MediaLinksBadges
              mediaLinks={asignacionMediaLinks}
              onMediaClick={(idx) => onClick?.(asignacion, 'asignacion', idx)}
              compact={true}
              maxDisplay={3}
            />
          </div>
        )}
      </div>
    );
  }

  // Variante default (completa) - para Mes y Lista
  const asignacionMediaLinks = asignacion.mediaLinks || asignacion.media_links || [];

  return (
    <div
      onClick={onClick}
      className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
    >
      {/* Línea 1: Nombre de la pieza (texto principal) */}
      <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
          {piezaNombre}
      </p>
      {/* Línea 2: Subtítulo con "Asignación" y patrón semanal si existe */}
      <div className="text-[10px] text-[var(--color-text-secondary)] mb-1">
        <span>Asignación</span>
        {patronSemanas && (
          <span className="ml-2 font-mono">{patronSemanas}</span>
        )}
      </div>
      {/* Media links (solo iconos, si existen) */}
      {Array.isArray(asignacionMediaLinks) && asignacionMediaLinks.length > 0 && (
        <div className="mt-1">
          <MediaLinksBadges
            mediaLinks={asignacionMediaLinks}
            onMediaClick={(idx) => onClick?.(asignacion, 'asignacion', idx)}
            compact={true}
            maxDisplay={3}
          />
      </div>
      )}
    </div>
  );
}

