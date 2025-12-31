/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { obtenerColorTipoEvento, obtenerLabelTipoEvento } from "./utils";
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";

import { EventoImportante as EventoData } from "./utils";

interface EventoImportanteProps {
    evento: EventoData;
    onClick?: () => void;
    variant?: 'default' | 'week';
    onMediaClick?: (idx: number, mediaLinks: any[]) => void;
}


export default function EventoImportante({ evento, onClick, variant = 'default', onMediaClick }: EventoImportanteProps) {
    const colores = obtenerColorTipoEvento(evento.tipo || 'otro');

    // Helper para formatear hora
    const formatTime = (startAt?: string | null, endAt?: string | null, fechaInicio?: string | null): string | null => {
        const isAllDay = evento.all_day === true;
        if (isAllDay) return null;

        if (startAt) {
            try {
                const fechaInicioObj = new Date(startAt);
                const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                if (endAt) {
                    const fechaFinObj = new Date(endAt);
                    const horaFin = fechaFinObj.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    return `${horaInicio}–${horaFin}h`;
                } else {
                    return `${horaInicio}h`;
                }
            } catch {
                // Fallback to fechaInicio
            }
        }

        if (fechaInicio && fechaInicio.includes('T')) {
            try {
                const fechaInicioObj = new Date(fechaInicio || '');
                const horaInicio = fechaInicioObj.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                return `${horaInicio}h`;
            } catch {
                return null;
            }
        }

        return null;
    };

    const linea3 = formatTime(evento.start_at, evento.end_at, evento.fechaInicio);

    // Variante compacta para vista Semana
    if (variant === 'week') {
        return (
            <div
                onClick={onClick}
                className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
            >
                <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
                    {obtenerLabelTipoEvento(evento.tipo || 'otro')}
                </p>
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-0.5 line-clamp-1">
                    {evento.titulo}
                </p>
                {linea3 && (
                    <p className="text-[10px] text-[var(--color-text-secondary)] mb-1">
                        {linea3}
                    </p>
                )}
                {evento.mediaLinks && Array.isArray(evento.mediaLinks) && evento.mediaLinks.length > 0 && onMediaClick && (
                    <div className="mt-1">
                        <MediaLinksBadges
                            mediaLinks={evento.mediaLinks}
                            onMediaClick={(idx: number) => onMediaClick(idx, evento.mediaLinks || [])}
                            compact={true}
                            maxDisplay={3}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Variante default (completa) - para Mes y Lista
    return (
        <div
            onClick={onClick}
            className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
        >
            <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
                {obtenerLabelTipoEvento(evento.tipo || 'otro')}
            </p>
            <p className="text-[10px] text-[var(--color-text-secondary)] mb-0.5 line-clamp-1">
                {evento.titulo}
            </p>
            {linea3 && (
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-1">
                    {linea3}
                </p>
            )}
            {evento.mediaLinks && Array.isArray(evento.mediaLinks) && evento.mediaLinks.length > 0 && onMediaClick && (
                <div className="mt-1">
                    <MediaLinksBadges
                        mediaLinks={evento.mediaLinks}
                        onMediaClick={(idx: number) => onMediaClick(idx, evento.mediaLinks || [])}
                        compact={true}
                        maxDisplay={3}
                    />
                </div>
            )}
        </div>
    );
}
