import React from "react";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import { formatearFechaEvento, obtenerColorEvento, obtenerLabelEstadoAsignacion, calcularPatronSemanasAsignacion } from "./utils";
import MediaLinksBadges from "@/shared/components/media/MediaLinksBadges";

import { Usuario, Sesion as RegistroSesion, Asignacion } from "./utils";

interface EventoAsignacionProps {
    asignacion: Asignacion & {
        mediaLinks?: string[];
        media_links?: string[];
    };
    usuarios: Usuario[];
    onClick?: (asignacion?: any, tipo?: string, idx?: number) => void;
    variant?: 'default' | 'week';
    registrosSesion?: RegistroSesion[];
    fechaEvento?: Date | string | null;
}

export default function EventoAsignacion({
    asignacion,
    usuarios,
    onClick,
    variant = 'default',
    registrosSesion = [],
    fechaEvento = null
}: EventoAsignacionProps) {
    const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
    const fechaSemana = asignacion.semanaInicioISO ? formatearFechaEvento(asignacion.semanaInicioISO) : '';
    const piezaNombre = asignacion.piezaSnapshot?.nombre || asignacion.piezaId || 'Sin pieza específica';

    const colores = obtenerColorEvento('asignacion');

    const estadoColors: Record<string, string> = {
        publicada: 'success',
        borrador: 'default',
        archivada: 'warning',
    };

    // Calcular patrón de semanas usando el helper reutilizable
    const fechaParaPatron = fechaEvento || asignacion.semanaInicioISO || null;
    const patronSemanas = calcularPatronSemanasAsignacion(asignacion, fechaParaPatron);

    // Variante compacta para vista Semana
    if (variant === 'week') {
        const asignacionMediaLinks = asignacion.mediaLinks || asignacion.media_links || [];

        return (
            <div
                onClick={() => onClick?.()}
                className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
            >
                <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
                    {piezaNombre}
                </p>
                {patronSemanas && (
                    <p className="text-[10px] text-[var(--color-text-secondary)] mb-1 font-mono">
                        {patronSemanas}
                    </p>
                )}
                {Array.isArray(asignacionMediaLinks) && asignacionMediaLinks.length > 0 && (
                    <div className="mt-1">
                        <MediaLinksBadges
                            mediaLinks={asignacionMediaLinks}
                            onMediaClick={(idx: number) => onClick?.(asignacion, 'asignacion', idx)}
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
            onClick={() => onClick?.()}
            className={`${colores.bg} ${colores.border} border rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
        >
            <p className="text-xs text-[var(--color-text-primary)] font-semibold mb-0.5 line-clamp-1">
                {piezaNombre}
            </p>
            <div className="text-[10px] text-[var(--color-text-secondary)] mb-1">
                <span>Asignación</span>
                {patronSemanas && (
                    <span className="ml-2 font-mono">{patronSemanas}</span>
                )}
            </div>
            {Array.isArray(asignacionMediaLinks) && asignacionMediaLinks.length > 0 && (
                <div className="mt-1">
                    <MediaLinksBadges
                        mediaLinks={asignacionMediaLinks as any[]}
                        onMediaClick={(idx: number) => onClick?.(asignacion, 'asignacion', idx)}
                        compact={true}
                        maxDisplay={3}
                    />
                </div>
            )}
        </div>
    );
}
