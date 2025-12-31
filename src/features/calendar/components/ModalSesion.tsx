import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/features/shared/components/ui/dialog";
import { Badge } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ds/Button";
import { getNombreVisible } from "@/features/shared/utils/helpers";
import { formatearHora, formatearFechaEvento } from "./utils";
import MediaLinksBadges from "@/features/shared/components/media/MediaLinksBadges";
import { componentStyles } from "@/design/componentStyles";
import { Clock, User, Calendar, CheckCircle, XCircle, PlayCircle, Star, BookOpen, Trash2 } from "lucide-react";

interface Usuario {
    id: string;
    [key: string]: unknown;
}

interface RegistroSesionData {
    id: string;
    alumnoId?: string;
    inicioISO?: string;
    sesionNombre?: string;
    semanaNombre?: string;
    piezaNombre?: string;
    foco?: string;
    duracionRealSeg?: number;
    bloquesCompletados?: number;
    bloquesTotales?: number;
    bloquesOmitidos?: number;
    finalizada?: boolean;
    finAnticipado?: boolean;
    calificacion?: number;
    notas?: string;
    mediaLinks?: unknown[];
    [key: string]: unknown;
}

type UserRole = 'ADMIN' | 'PROF' | 'ESTU';

interface ModalSesionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    registroSesion: RegistroSesionData | null;
    usuarios: Usuario[];
    userIdActual: string;
    userRole: UserRole;
    onDelete?: (id: string) => void;
    onMediaClick?: (mediaLinks: unknown[], index: number) => void;
}

export default function ModalSesion({
    open,
    onOpenChange,
    registroSesion,
    usuarios,
    userIdActual,
    userRole,
    onDelete = undefined,
    onMediaClick
}: ModalSesionProps) {
    if (!registroSesion) return null;

    const alumno = usuarios.find(u => u.id === registroSesion.alumnoId);
    const fecha = registroSesion.inicioISO ? new Date(registroSesion.inicioISO) : null;
    const fechaTexto = fecha && registroSesion.inicioISO ? formatearFechaEvento(registroSesion.inicioISO.split('T')[0]) : '';
    const horaTexto = registroSesion.inicioISO ? formatearHora(registroSesion.inicioISO) : '';
    const duracionRealSeg = registroSesion.duracionRealSeg || 0;
    const duracionMin = Math.floor(duracionRealSeg / 60);
    const duracionSeg = duracionRealSeg % 60;

    const getCalificacionBadge = (cal: number | undefined): string | null => {
        if (!cal || cal <= 0) return null;
        const calInt = Math.round(cal);
        if (calInt === 1) return componentStyles.status.badgeDanger;
        if (calInt === 2) return componentStyles.status.badgeWarning;
        if (calInt === 3) return componentStyles.status.badgeInfo;
        if (calInt === 4) return componentStyles.status.badgeSuccess;
        return componentStyles.status.badgeDefault;
    };

    const isAdmin = userRole === 'ADMIN';
    const isProf = userRole === 'PROF';
    const isEstu = userRole === 'ESTU';

    const canDelete = isAdmin || (isProf && registroSesion.alumnoId === userIdActual) || (isEstu && registroSesion.alumnoId === userIdActual);

    const handleDelete = () => {
        if (window.confirm('¿Eliminar esta sesión de estudio? Esta acción no se puede deshacer.')) {
            if (onDelete) {
                onDelete(registroSesion.id);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-[var(--color-info)]" />
                        Detalles de Sesión
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Información detallada de la sesión de estudio
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Estudiante:</span>
                            <span className="font-medium truncate">{getNombreVisible(alumno)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Fecha:</span>
                            <span>{fechaTexto}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Hora:</span>
                            <span>{horaTexto}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-secondary)]">Duración:</span>
                            <span>{duracionMin > 0 ? `${duracionMin}m ` : ''}{duracionSeg}s</span>
                        </div>
                    </div>

                    <div className="space-y-1.5 pb-2 border-b border-[var(--color-border-default)]">
                        {registroSesion.sesionNombre && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Sesión:</span>
                                <span className="font-medium">{registroSesion.sesionNombre}</span>
                            </div>
                        )}
                        {registroSesion.semanaNombre && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Semana:</span>
                                <span>{registroSesion.semanaNombre}</span>
                            </div>
                        )}
                        {registroSesion.piezaNombre && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Pieza:</span>
                                <span>{registroSesion.piezaNombre}</span>
                            </div>
                        )}
                        {registroSesion.foco && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Foco:</span>
                                <Badge variant="info" className="text-xs">{registroSesion.foco}</Badge>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[var(--color-success)]" />
                            <span className="text-xs">
                                {registroSesion.bloquesCompletados || 0}/{registroSesion.bloquesTotales || 0}
                            </span>
                        </div>
                        {(registroSesion.bloquesOmitidos || 0) > 0 && (
                            <div className="flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                                <span className="text-xs">Omitidos: {registroSesion.bloquesOmitidos}</span>
                            </div>
                        )}
                        {registroSesion.finalizada && (
                            <Badge variant="success" className="text-xs">Finalizada</Badge>
                        )}
                        {registroSesion.finAnticipado && (
                            <Badge variant="warning" className="text-xs">Anticipada</Badge>
                        )}
                    </div>

                    {(registroSesion.calificacion || registroSesion.notas) && (
                        <div className="space-y-1.5 pb-2 border-b border-[var(--color-border-default)]">
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-[var(--color-success)]" />
                                <span className="text-xs font-medium text-[var(--color-text-secondary)]">Autoevaluación</span>
                            </div>
                            {registroSesion.calificacion && registroSesion.calificacion > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Calificación:</span>
                                    <Badge className={`${getCalificacionBadge(registroSesion.calificacion)} shrink-0`}>
                                        <Star className="w-3 h-3 mr-1 fill-current" />
                                        {isNaN(registroSesion.calificacion) ? '0' : Math.round(registroSesion.calificacion)}/4
                                    </Badge>
                                </div>
                            )}
                            {registroSesion.notas && registroSesion.notas.trim() && (
                                <div className="pt-1">
                                    <p className="text-xs text-[var(--color-text-secondary)] mb-1">Notas:</p>
                                    <p className="text-sm italic whitespace-pre-wrap break-words bg-[var(--color-surface-muted)] p-2 rounded">
                                        &quot;{registroSesion.notas.trim()}&quot;
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {registroSesion.mediaLinks && Array.isArray(registroSesion.mediaLinks) && registroSesion.mediaLinks.length > 0 && (
                        <div className="pt-1">
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Multimedia:</p>
                            <MediaLinksBadges
                                mediaLinks={registroSesion.mediaLinks}
                                compact={true}
                                maxDisplay={5}
                                onMediaClick={onMediaClick ? (index) => onMediaClick(registroSesion.mediaLinks || [], index) : undefined}
                            />
                        </div>
                    )}

                    {canDelete && onDelete && (
                        <div className="flex justify-end pt-2 border-t border-[var(--color-border-default)]">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar sesión
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
