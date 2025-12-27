import React, { useState, useMemo } from "react";
import { BookOpen, Clock, Star } from "lucide-react";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento } from "./utils";
import { Badge } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";
import MediaLinksBadges from "@/shared/components/media/MediaLinksBadges";
import MediaPreviewModal from "@/shared/components/media/MediaPreviewModal";

export default function EventoSesion({ sesion, usuarios, onClick, variant = 'default' }) {
  // console.log('EventoSesion rendering:', sesion.id);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaLinks, setSelectedMediaLinks] = useState([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Normalizar media links: acepta strings u objetos con url
  const normalizeMediaLinks = (rawLinks) => {
    if (!rawLinks || !Array.isArray(rawLinks)) return [];
    return rawLinks
      .map((raw) => {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && raw.url) return raw.url;
        if (raw && typeof raw === 'object' && raw.href) return raw.href;
        if (raw && typeof raw === 'object' && raw.link) return raw.link;
        return '';
      })
      .filter((url) => typeof url === 'string' && url.length > 0);
  };

  const handleMediaClick = (index, mediaLinks) => {
    if (!mediaLinks || !Array.isArray(mediaLinks) || mediaLinks.length === 0) return;
    const normalizedLinks = normalizeMediaLinks(mediaLinks);
    if (normalizedLinks.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, normalizedLinks.length - 1));
    setSelectedMediaLinks(normalizedLinks);
    setSelectedMediaIndex(safeIndex);
    setShowMediaModal(true);
  };
  const alumno = usuarios.find(u => u.id === sesion.alumnoId);
  const fecha = sesion.inicioISO ? new Date(sesion.inicioISO) : null;
  const fechaFormateada = fecha ? fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  // Calcular duración real sumando los bloques si están disponibles
  const duracionRealSeg = useMemo(() => {
    if (sesion.registrosBloque && Array.isArray(sesion.registrosBloque)) {
      return sesion.registrosBloque.reduce((acc, bloque) => acc + (bloque.duracionRealSeg || 0), 0);
    }
    return sesion.duracionRealSeg || 0;
  }, [sesion]);

  const duracionMin = Math.floor(duracionRealSeg / 60);
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

  // Variante compacta para vista Semana
  if (variant === 'week') {
    const sesionNombre = sesion.sesionNombre || 'Sesión sin nombre';
    const sesionNombreCorto = sesionNombre.length > 20 ? sesionNombre.substring(0, 20) + '…' : sesionNombre;

    // Construir línea 2: duración y valoración
    const partesLinea2 = [];
    if (duracionMin > 0) {
      partesLinea2.push(`${duracionMin} min`);
    }
    if (sesion.calificacion !== undefined && sesion.calificacion !== null && sesion.calificacion > 0 && !isNaN(sesion.calificacion)) {
      partesLinea2.push(`${Math.round(sesion.calificacion)}/4`);
    }
    const linea2 = partesLinea2.length > 0 ? partesLinea2.join(' · ') : null;

    return (
      <div
        onClick={onClick}
        className="flex items-start gap-2 py-1.5 px-2 border-l-4 border-l-[var(--color-success)] bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 transition-colors cursor-pointer rounded"
      >
        <div className="flex-1 min-w-0">
          {/* Línea 1: Nombre de sesión */}
          <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
            {sesionNombreCorto}
          </p>
          {/* Línea 2: Duración y valoración */}
          {linea2 && (
            <p className="text-[10px] text-[var(--color-text-secondary)] mb-1">
              {linea2}
            </p>
          )}
          {/* Línea 3: Media links */}
          {sesion.mediaLinks && Array.isArray(sesion.mediaLinks) && sesion.mediaLinks.length > 0 && (
            <div className="mt-1">
              <MediaLinksBadges
                mediaLinks={sesion.mediaLinks}
                onMediaClick={(idx) => handleMediaClick(idx, sesion.mediaLinks)}
                compact={true}
                maxDisplay={3}
              />
            </div>
          )}
        </div>
        {/* Modal de preview de medios */}
        {showMediaModal && selectedMediaLinks.length > 0 && (
          <MediaPreviewModal
            urls={selectedMediaLinks}
            initialIndex={selectedMediaIndex || 0}
            open={showMediaModal}
            onClose={() => {
              setShowMediaModal(false);
              setSelectedMediaLinks([]);
              setSelectedMediaIndex(0);
            }}
          />
        )}
      </div>
    );
  }

  // Variante default (completa)
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
        <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-1 line-clamp-2">
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
          <p className="text-sm text-[var(--color-text-primary)] italic break-words line-clamp-2">
            "{sesion.notas.trim()}"
          </p>
        )}
        {sesion.mediaLinks && Array.isArray(sesion.mediaLinks) && sesion.mediaLinks.length > 0 && (
          <div className="mt-2">
            <MediaLinksBadges
              mediaLinks={sesion.mediaLinks}
              onMediaClick={(idx) => handleMediaClick(idx, sesion.mediaLinks)}
              compact={true}
              maxDisplay={3}
            />
          </div>
        )}
      </div>
      {/* Modal de preview de medios */}
      {showMediaModal && selectedMediaLinks.length > 0 && (
        <MediaPreviewModal
          urls={selectedMediaLinks}
          initialIndex={selectedMediaIndex || 0}
          open={showMediaModal}
          onClose={() => {
            setShowMediaModal(false);
            setSelectedMediaLinks([]);
            setSelectedMediaIndex(0);
          }}
        />
      )}
    </div>
  );
}

