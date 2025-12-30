import React from "react";
import { Badge } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import {
    Notebook, Music, PlayCircle, ChevronRight, MessageSquare,
    Edit, Trash2
} from "lucide-react";
// @ts-ignore
import UserActionsMenu from "@/features/shared/components/common/UserActionsMenu";
import SessionContentView from "@/features/shared/components/study/SessionContentView";
// @ts-ignore
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";
import { calcularTiempoSesion } from "@/features/estudio/components/sessionSequence";
import { displayName } from "@/features/shared/utils/helpers";
import { focoLabels } from "../utils";
import { UserEntity } from "@/features/shared/hooks/useUsers";
import { Asignacion, FeedbackSemanal } from "@/types/data.types";

interface Sesion {
    nombre: string;
    foco?: string;
    [key: string]: unknown;
}

interface Semana {
    nombre?: string;
    sesiones?: Sesion[];
}

interface MediaLink {
    url: string;
    tipo?: string;
}

interface EstudianteCardProps {
    alumno: UserEntity;
    asignacionActiva?: Asignacion | null | undefined;
    semana?: any; // Keeping any for Semana to avoid strict conflicts with legacy PlanSnapshot
    semanaIdx: number;
    feedback?: FeedbackSemanal | null | undefined;
    usuarios: UserEntity[];
    userIdActual: string;
    isAdmin: boolean;
    expandedSessions: Set<string>;
    onToggleSession: (key: string) => void;
    onOpenFeedback: (alumno: UserEntity, feedback?: FeedbackSemanal | null) => void;
    onDeleteFeedback: (id: string) => void;
    onPreviewMedia: (idx: number, links: MediaLink[]) => void;
}

/**
 * EstudianteCard - Individual student card showing assignment and feedback info
 */
export default function EstudianteCard({
    alumno,
    asignacionActiva,
    semana,
    semanaIdx,
    feedback,
    usuarios,
    userIdActual,
    isAdmin,
    expandedSessions,
    onToggleSession,
    onOpenFeedback,
    onDeleteFeedback,
    onPreviewMedia,
}: EstudianteCardProps) {
    const nombre = displayName(alumno);

    return (
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface-default)] dark:bg-[var(--color-surface-elevated)] px-4 py-3 md:px-5 md:py-4 shadow-sm rounded-xl flex flex-col gap-4">
            {/* Header Line */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface-muted)]/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[var(--color-text-primary)] font-semibold text-sm">
                            {nombre.slice(0, 1).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="font-medium text-sm">{nombre}</p>
                        {asignacionActiva && semana && (
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                                    Semana {(semanaIdx + 1)} de {asignacionActiva.plan?.semanas?.length || '?'}
                                </Badge>
                                {asignacionActiva.plan?.nombre && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 truncate max-w-[150px]">
                                        {asignacionActiva.plan.nombre}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* @ts-ignore UserActionsMenu types mismatch */}
                <UserActionsMenu user={alumno} usuarios={usuarios} />
            </div>

            {/* Content */}
            {!asignacionActiva || !semana ? (
                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-dashed text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Notebook className="w-4 h-4" />
                        <span>Sin asignación activa esta semana</span>
                    </div>
                    {!feedback && (
                        <Button variant="outline" size="sm" onClick={() => onOpenFeedback(alumno)}>
                            <MessageSquare className="w-4 h-4 mr-2" /> Dar feedback
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Sessions */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Music className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">
                                {asignacionActiva.piezaSnapshot?.nombre || "Pieza sin nombre"}
                            </span>
                            {semana.nombre && (
                                <span className="text-muted-foreground text-sm mx-1">• {semana.nombre}</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            {semana.sesiones?.map((sesion: Sesion, idx: number) => {
                                const sesionKey = `${alumno.id}-${semanaIdx}-${idx}`;
                                const isExpanded = expandedSessions.has(sesionKey);
                                const tiempo = calcularTiempoSesion(sesion);
                                const mins = Math.floor(tiempo / 60);

                                return (
                                    <div key={idx} className="space-y-1">
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-all"
                                            onClick={() => onToggleSession(sesionKey)}
                                        >
                                            <PlayCircle className="w-4 h-4 text-info shrink-0" />
                                            <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
                                                <span className="font-medium">{sesion.nombre}</span>
                                                {mins > 0 && (
                                                    <span className="text-muted-foreground text-xs">• {mins} min</span>
                                                )}
                                                {sesion.foco && focoLabels[sesion.foco] && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                        {focoLabels[sesion.foco]}
                                                    </Badge>
                                                )}
                                            </div>
                                            <ChevronRight
                                                className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                        </div>
                                        {isExpanded && (
                                            <div className="ml-4 pl-4 border-l-2 border-muted">
                                                <SessionContentView sesion={sesion} compact />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Feedback */}
                    <div className="md:w-1/3 min-w-[250px] space-y-3">
                        {!feedback ? (
                            <div className="bg-muted/30 rounded-lg p-4 border border-dashed flex flex-col items-center justify-center text-center gap-2 h-full min-h-[100px]">
                                <p className="text-xs text-muted-foreground">Sin feedback semanal</p>
                                <Button variant="outline" size="sm" onClick={() => onOpenFeedback(alumno)}>
                                    <MessageSquare className="w-3.5 h-3.5 mr-2" /> Dar feedback
                                </Button>
                            </div>
                        ) : (
                            <FeedbackDisplay
                                feedback={feedback}
                                usuarios={usuarios}
                                userIdActual={userIdActual}
                                isAdmin={isAdmin}
                                onEdit={() => onOpenFeedback(alumno, feedback)}
                                onDelete={() => onDeleteFeedback(feedback.id)}
                                onPreviewMedia={onPreviewMedia}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface FeedbackDisplayProps {
    feedback: FeedbackSemanal;
    usuarios: UserEntity[];
    userIdActual: string;
    isAdmin: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onPreviewMedia: (idx: number, links: MediaLink[]) => void;
}

function FeedbackDisplay({ feedback, usuarios, userIdActual, isAdmin, onEdit, onDelete, onPreviewMedia }: FeedbackDisplayProps) {
    // @ts-ignore - legacy check
    const habilidades = feedback.habilidades || {};
    // @ts-ignore
    const xpDeltas = habilidades.xpDeltas || {};
    // @ts-ignore
    const hasXP = xpDeltas.motricidad || xpDeltas.articulacion || xpDeltas.flexibilidad;
    const profesor = usuarios.find(u => u.id === feedback.profesorId);
    // @ts-ignore
    const profesorNombre = profesor?.nombre || profesor?.email?.split('@')[0] || 'Profesor';
    const fechaEdicion = feedback.created_date // Fallback for lastEditedAt if missing in shared type?
        ? new Date(feedback.created_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Feedback</span>
                </div>

                {(isAdmin || feedback.profesorId === userIdActual) && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                            <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => { if (confirm('¿Borrar feedback?')) onDelete(); }}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                )}
            </div>

            {feedback.notaProfesor && (
                <p className="text-sm italic text-foreground/80 line-clamp-3">"{feedback.notaProfesor}"</p>
            )}

            {(habilidades.sonido != null || habilidades.cognicion != null) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {habilidades.sonido != null && (
                        <div className="flex items-center gap-1 text-xs bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                            <Music className="w-3 h-3" />
                            <span>{habilidades.sonido}/10</span>
                        </div>
                    )}
                    {habilidades.cognicion != null && (
                        <div className="flex items-center gap-1 text-xs bg-purple-100/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                            <Notebook className="w-3 h-3" />
                            <span>{habilidades.cognicion}/10</span>
                        </div>
                    )}
                </div>
            )}

            {hasXP && (
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {xpDeltas.motricidad != null && xpDeltas.motricidad !== 0 && (
                        <span className={`font-mono ${xpDeltas.motricidad > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {xpDeltas.motricidad > 0 ? '+' : ''}{xpDeltas.motricidad} Motr
                        </span>
                    )}
                    {xpDeltas.articulacion != null && xpDeltas.articulacion !== 0 && (
                        <span className={`font-mono ${xpDeltas.articulacion > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {xpDeltas.articulacion > 0 ? '+' : ''}{xpDeltas.articulacion} Art
                        </span>
                    )}
                    {xpDeltas.flexibilidad != null && xpDeltas.flexibilidad !== 0 && (
                        <span className={`font-mono ${xpDeltas.flexibilidad > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {xpDeltas.flexibilidad > 0 ? '+' : ''}{xpDeltas.flexibilidad} Flex
                        </span>
                    )}
                </div>
            )}

            {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
                <MediaLinksBadges
                    mediaLinks={feedback.mediaLinks.map((url: string | MediaLink) => typeof url === 'string' ? { url } : url)}
                    onMediaClick={(idx: number) => onPreviewMedia(idx, feedback.mediaLinks!.map((url: string | MediaLink) => typeof url === 'string' ? { url } : url))}
                    compact
                    maxDisplay={2}
                />
            )}

            <div className="text-[10px] text-muted-foreground pt-1 border-t border-orange-100 dark:border-orange-900/30 mt-2">
                Por: {profesorNombre}{fechaEdicion && ` · ${fechaEdicion}`}
            </div>
        </div>
    );
}
