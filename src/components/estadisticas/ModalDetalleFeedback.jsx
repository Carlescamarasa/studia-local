import React, { useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ds";
import { getNombreVisible } from "@/components/utils/helpers";
import MediaLinksBadges from "../common/MediaLinksBadges";
import { componentStyles } from "@/design/componentStyles";
import { MessageSquare, Calendar, User, Music, Brain, TrendingUp, Zap, Gauge, Target } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * ModalDetalleFeedback - Modal de solo lectura para ver detalles de un feedback semanal unificado.
 */
export default function ModalDetalleFeedback({ open, onOpenChange, feedback, usuarios, onMediaClick, isMediaModalOpen }) {
    // Use ref to always have the latest isMediaModalOpen value (avoids stale closure in event handlers)
    const isMediaModalOpenRef = useRef(isMediaModalOpen);
    useEffect(() => {
        isMediaModalOpenRef.current = isMediaModalOpen;
    }, [isMediaModalOpen]);

    if (!feedback) return null;

    const profesor = usuarios.find(u => u.id === feedback.profesorId);
    const alumno = usuarios.find(u => u.id === feedback.alumnoId);

    // Calcular rango de fechas de la semana
    const fechaInicio = feedback.semanaInicioISO ? new Date(feedback.semanaInicioISO) : null;
    let rangoSemana = "";
    if (fechaInicio) {
        const start = startOfWeek(fechaInicio, { weekStartsOn: 1 });
        const end = endOfWeek(fechaInicio, { weekStartsOn: 1 });
        rangoSemana = `${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM", { locale: es })}`;
    }

    // Parsear XP Deltas si existen (guardados en xp_delta_by_skill)
    const xpDeltas = feedback.xp_delta_by_skill || {};
    const hasXpDeltas = Object.keys(xpDeltas).length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-lg max-h-[90vh] overflow-y-auto p-4"
                onPointerDownOutside={(e) => {
                    // PRIORITY 1: If media modal is open, NEVER close this dialog
                    // Using ref to avoid stale closure - always get the CURRENT value
                    if (isMediaModalOpenRef.current) {
                        e.preventDefault();
                        return;
                    }

                    // PRIORITY 2: Check for explicit prevent-close attribute (handles content clicks)
                    const target = e.target;
                    if (target instanceof Element && target.closest('[data-prevent-outside-close="true"]')) {
                        e.preventDefault();
                        return;
                    }

                    // PRIORITY 3: Fallback z-index check
                    if (target) {
                        const style = window.getComputedStyle(target);
                        if (parseInt(style.zIndex, 10) >= 200) {
                            e.preventDefault();
                            return;
                        }
                    }
                }}
            >
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                        Detalles de Feedback
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Información detallada del feedback semanal
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Profesor:</span>
                            <span className="font-medium truncate">{getNombreVisible(profesor)}</span>
                        </div>
                        {alumno && (
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                                <span className="text-xs text-[var(--color-text-secondary)]">Alumno:</span>
                                <span className="font-medium truncate">{getNombreVisible(alumno)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 col-span-2">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Semana:</span>
                            <span>{rangoSemana}</span>
                        </div>
                        {(feedback.lastEditedAt || feedback.updated_at || feedback.updatedAt || feedback.timestamp || feedback.createdAt || feedback.created_at) && (
                            <div className="col-span-2 text-[10px] text-[var(--color-text-muted)] italic text-right">
                                Última edición: {new Date(feedback.lastEditedAt || feedback.updated_at || feedback.updatedAt || feedback.timestamp || feedback.createdAt || feedback.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>

                    {/* 1. Evaluación (Scores & XP) */}
                    {(feedback.sonido != null || feedback.cognicion != null || hasXpDeltas) && (
                        <div className="space-y-2 pb-2 border-b border-[var(--color-border-default)]">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Evaluación</h4>
                            <div className="flex flex-wrap gap-4">
                                {feedback.sonido != null && (
                                    <div className="flex items-center gap-1.5">
                                        <Music className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium">Sonido:</span>
                                        <Badge variant={feedback.sonido >= 7 ? 'success' : 'default'}>{feedback.sonido}/10</Badge>
                                    </div>
                                )}
                                {feedback.cognicion != null && (
                                    <div className="flex items-center gap-1.5">
                                        <Brain className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-medium">Cognición:</span>
                                        <Badge variant={feedback.cognicion >= 7 ? 'success' : 'default'}>{feedback.cognicion}/10</Badge>
                                    </div>
                                )}
                            </div>

                            {/* XP Deltas */}
                            {hasXpDeltas && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-[var(--color-text-secondary)] mb-1">Ajustes XP Habilidades:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(xpDeltas).map(([skill, delta]) => {
                                            let icon = TrendingUp;
                                            let colorClass = "text-[var(--color-text-primary)]";
                                            if (skill === 'motricidad') { icon = Gauge; colorClass = "text-green-600"; }
                                            if (skill === 'articulacion') { icon = Target; colorClass = "text-orange-600"; }
                                            if (skill === 'flexibilidad') { icon = Zap; colorClass = "text-yellow-600"; }
                                            const IconComp = icon;

                                            return (
                                                <Badge key={skill} variant="outline" className="flex items-center gap-1 pl-1 pr-2">
                                                    <IconComp className={`w-3 h-3 ${colorClass}`} />
                                                    <span className="capitalize text-xs">{skill}:</span>
                                                    <span className={`font-mono font-bold ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {delta > 0 ? '+' : ''}{delta} XP
                                                    </span>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Comentarios */}
                    {feedback.notaProfesor && (
                        <div className="space-y-1.5 pb-2 border-b border-[var(--color-border-default)]">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Comentarios</h4>
                            <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed italic bg-[var(--color-surface-muted)]/50 p-3 rounded-md border border-[var(--color-border-default)]">
                                "{feedback.notaProfesor}"
                            </div>
                        </div>
                    )}

                    {/* 3. Multimedia */}
                    {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
                        <div className="pt-1">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">Multimedia Adjunto</h4>
                            <MediaLinksBadges
                                mediaLinks={feedback.mediaLinks}
                                compact={false}
                                onMediaClick={onMediaClick ? (index) => onMediaClick(feedback.mediaLinks, index) : undefined}
                            />
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}
