import React from "react";
import { BookOpen, Clock, Star } from "lucide-react";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento } from "./utils";
import { Badge } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";

export default function EventoSesion({ sesion, usuarios, onClick }) {
  const alumno = usuarios.find(u => u.id === sesion.alumnoId);
  const fecha = sesion.inicioISO ? new Date(sesion.inicioISO) : null;
  const fechaFormateada = fecha ? fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';
  const duracionMin = Math.floor((sesion.duracionRealSeg || 0) / 60);
  const duracionObjetivoMin = Math.floor((sesion.duracionObjetivoSeg || 0) / 60);
  
  const getCalificacionBadge = (cal) => {
    if (!cal || cal <= 0) return null;
    const calInt = Math.round(cal);
    if (calInt === 1) return componentStyles.status.badgeDanger;
    if (calInt === 2) return componentStyles.status.badgeWarning;
    if (calInt === 3) return componentStyles.status.badgeInfo;
    if (calInt === 4) return componentStyles.status.badgeSuccess;
    return componentStyles.status.badgeDefault;
  };

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2 py-2 px-3 border-l-4 border-l-[var(--color-success)] bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 transition-colors relative group cursor-pointer"
    >
      <BookOpen className="w-4 h-4 text-[var(--color-success)] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">Sesión de estudio</p>
          {fechaFormateada && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              • {fechaFormateada}
            </span>
          )}
          {sesion.piezaNombre && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              • {sesion.piezaNombre}
            </span>
          )}
          {sesion.planNombre && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              • {sesion.planNombre}
            </span>
          )}
          {sesion.calificacion !== undefined && sesion.calificacion !== null && sesion.calificacion > 0 && !isNaN(sesion.calificacion) && (
            <Badge className={`${getCalificacionBadge(sesion.calificacion)} shrink-0 ml-auto`}>
              <Star className="w-3 h-3 mr-1 fill-current" />
              {Math.round(sesion.calificacion)}/4
            </Badge>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-1">
          {sesion.sesionNombre || 'Sesión sin nombre'}
        </p>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {duracionMin > 0 && (
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duracionMin} min
            </span>
          )}
          {duracionObjetivoMin > 0 && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Obj: {duracionObjetivoMin} min
            </span>
          )}
        </div>
        {sesion.notas && sesion.notas.trim() && (
          <p className="text-sm text-[var(--color-text-primary)] italic break-words">
            "{sesion.notas.trim()}"
          </p>
        )}
      </div>
    </div>
  );
}

