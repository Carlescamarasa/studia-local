import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { getNombreVisible } from "@/features/shared/utils/helpers";
import { formatearFechaEvento, parseLocalDate } from "./utils";
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";
import MediaPreviewModal from "@/features/shared/components/media/MediaPreviewModal";

import { Usuario, Feedback } from "./utils";

interface EventoFeedbackProps {
    feedback: Feedback;
    usuarios: Usuario[];
    onClick?: () => void;
    onMediaClick?: (index: number, mediaLinks: any[]) => void;
    variant?: 'default' | 'week';
}


type MediaLinkRaw = string | { url?: string; href?: string; link?: string };

export default function EventoFeedback({ feedback, usuarios, onClick, variant = 'default' }: EventoFeedbackProps) {
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [selectedMediaLinks, setSelectedMediaLinks] = useState<string[]>([]);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

    // Normalizar media links: acepta strings u objetos con url
    const normalizeMediaLinks = (rawLinks: unknown[]): string[] => {
        if (!rawLinks || !Array.isArray(rawLinks)) return [];
        return rawLinks
            .map((raw) => {
                const item = raw as MediaLinkRaw;
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && item.url) return item.url;
                if (item && typeof item === 'object' && item.href) return item.href;
                if (item && typeof item === 'object' && item.link) return item.link;
                return '';
            })
            .filter((url): url is string => typeof url === 'string' && url.length > 0);
    };

    const handleMediaClick = (index: number, mediaLinks: unknown[]) => {
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

    // Obtener hora del feedback si existe
    const horaFeedback = feedback.created_at ? new Date(feedback.created_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    }) : null;

    // Variante compacta para vista Semana
    if (variant === 'week') {
        const nombreProfesor = profesor ? getNombreVisible(profesor) : null;
        const linea2 = nombreProfesor
            ? (horaFeedback ? `${nombreProfesor} · ${horaFeedback}` : nombreProfesor)
            : (horaFeedback ? horaFeedback : null);

        return (
            <div
                onClick={onClick}
                className="flex items-start gap-2 py-1.5 px-2 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors cursor-pointer rounded"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5">
                        Feedback del profesor
                    </p>
                    {linea2 && (
                        <p className="text-[10px] text-[var(--color-text-secondary)] mb-1">
                            {linea2}
                        </p>
                    )}
                    {feedback.mediaLinks && Array.isArray(feedback.mediaLinks) && feedback.mediaLinks.length > 0 && (
                        <div className="mt-1">
                            <MediaLinksBadges
                                mediaLinks={feedback.mediaLinks as any[]}
                                onMediaClick={(idx: number) => handleMediaClick(idx, (feedback.mediaLinks || []) as any[])}
                                compact={true}
                                maxDisplay={3}
                            />
                        </div>
                    )}
                </div>
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
                            onMediaClick={(idx: number) => handleMediaClick(idx, feedback.mediaLinks || [])}
                            compact={true}
                            maxDisplay={3}
                        />
                    </div>
                )}
            </div>
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
