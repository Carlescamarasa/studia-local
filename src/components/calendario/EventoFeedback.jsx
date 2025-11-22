import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, parseLocalDate } from "./utils";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import MediaPreviewModal from "@/components/common/MediaPreviewModal";

export default function EventoFeedback({ feedback, usuarios, onClick }) {
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
  const profesor = usuarios.find(u => u.id === feedback.profesorId);
  const alumno = usuarios.find(u => u.id === feedback.alumnoId);
  const fechaSemana = feedback.semanaInicioISO ? parseLocalDate(feedback.semanaInicioISO) : null;
  const fechaFormateada = fechaSemana ? fechaSemana.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : '';

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2 py-2 px-3 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors relative group cursor-pointer"
    >
      <MessageSquare className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">Feedback del profesor</p>
          {profesor && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              • {getNombreVisible(profesor)}
            </span>
          )}
          {fechaFormateada && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              • {fechaFormateada}
            </span>
          )}
        </div>
        {feedback.notaProfesor && feedback.notaProfesor.trim() && (
          <p className="text-sm text-[var(--color-text-primary)] italic break-words mb-2 line-clamp-2">
            "{feedback.notaProfesor.trim()}"
          </p>
        )}
        {feedback.mediaLinks && Array.isArray(feedback.mediaLinks) && feedback.mediaLinks.length > 0 && (
          <div className="mt-2">
            <MediaLinksBadges
              mediaLinks={feedback.mediaLinks}
              onMediaClick={(idx) => handleMediaClick(idx, feedback.mediaLinks)}
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

