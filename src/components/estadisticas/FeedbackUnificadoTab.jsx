import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { MessageSquare, ClipboardCheck, Gauge, Music, Brain, Zap, Target, Edit, BookOpen, Star } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import { MediaIcon } from "@/components/common/MediaEmbed";
import { displayName } from "@/components/utils/helpers";
import { cn } from "@/lib/utils";
import ModalSesion from "@/components/calendario/ModalSesion";
import ModalDetalleFeedback from "@/components/estadisticas/ModalDetalleFeedback";

/**
 * FeedbackUnificadoTab - Muestra comentarios del profesor, evaluaciones técnicas y sesiones
 * en una única lista ordenada por created_at (timestamp) con filtros tipo pills
 */
export default function FeedbackUnificadoTab({
    feedbacks = [],
    evaluaciones = [],
    registros = [],
    usuarios = {},
    isEstu = false,
    onEditFeedback,
    puedeEditar,
    onMediaClick
}) {
    const isMobile = useIsMobile();

    // Pills filter state: 'todos' | 'sesiones' | 'feedback_profesor'
    const [tipoFiltro, setTipoFiltro] = useState('todos');

    // Modal state for viewing details
    const [modalSesionOpen, setModalSesionOpen] = useState(false);
    const [registroSesionSeleccionado, setRegistroSesionSeleccionado] = useState(null);

    const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
    const [feedbackSeleccionado, setFeedbackSeleccionado] = useState(null);

    // Handlers
    const handleViewSesion = (registro) => {
        setRegistroSesionSeleccionado(registro);
        setModalSesionOpen(true);
    };

    const handleViewFeedback = (feedback) => {
        setFeedbackSeleccionado(feedback);
        setModalFeedbackOpen(true);
    };

    // Convertir usuarios a mapa si es array
    const usuariosMap = useMemo(() => {
        if (Array.isArray(usuarios)) {
            const map = {};
            usuarios.forEach(u => { map[u.id] = u; });
            return map;
        }
        return usuarios;
    }, [usuarios]);

    // Obtener nombre del usuario
    const getNombre = (userId) => {
        const usuario = usuariosMap[userId];
        if (!usuario) return 'Profesor';
        return displayName(usuario);
    };

    // Combinar feedbacks, evaluaciones (legacy) y sesiones en una sola lista
    const itemsCombinados = useMemo(() => {
        const items = [];

        // 1. Feedbacks (New & Old Unified)
        feedbacks.forEach(feedback => {
            const dateStr = feedback.createdAt || feedback.created_at || feedback.semanaInicioISO;
            const timestamp = dateStr ? new Date(dateStr) : new Date(0);
            items.push({
                tipo: 'feedback',
                timestamp,
                data: feedback,
                id: `feedback-${feedback.id}`
            });
        });

        // 2. Evaluaciones Técnicas (Legacy - Read Only)
        // Se muestran también como tipo 'evaluacion' pero se filtran junto a 'feedback_profesor'
        evaluaciones.forEach(ev => {
            const dateStr = ev.createdAt || ev.created_at;
            const timestamp = dateStr ? new Date(dateStr) : new Date(0);
            items.push({
                tipo: 'evaluacion', // Legacy type
                timestamp,
                data: ev,
                id: `eval-${ev.id}`
            });
        });

        // 3. Registros de sesión
        registros.forEach(registro => {
            const dateStr = registro.inicioISO;
            const timestamp = dateStr ? new Date(dateStr) : new Date(0);
            items.push({
                tipo: 'sesion',
                timestamp,
                data: registro,
                id: `sesion-${registro.id}`
            });
        });

        // Ordenar por timestamp descendente
        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [feedbacks, evaluaciones, registros]);

    // Filter items based on selected pill
    const itemsFiltrados = useMemo(() => {
        if (tipoFiltro === 'todos') {
            return itemsCombinados;
        } else if (tipoFiltro === 'sesiones') {
            return itemsCombinados.filter(item => item.tipo === 'sesion');
        } else if (tipoFiltro === 'feedback_profesor') {
            // Incluye feedbacks unificados Y evaluaciones legacy
            return itemsCombinados.filter(item => item.tipo === 'feedback' || item.tipo === 'evaluacion');
        }
        return itemsCombinados;
    }, [itemsCombinados, tipoFiltro]);

    // Formatear fecha con hora
    const formatFechaHora = (date) => {
        if (!date || isNaN(date.getTime())) return 'Sin fecha';
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get calificacion badge style
    const getCalificacionBadge = (cal) => {
        if (!cal || cal <= 0) return null;
        const calInt = Math.round(cal);
        if (calInt === 1) return componentStyles.status.badgeDanger;
        if (calInt === 2) return componentStyles.status.badgeWarning;
        if (calInt === 3) return componentStyles.status.badgeInfo;
        if (calInt === 4) return componentStyles.status.badgeSuccess;
        return componentStyles.status.badgeDefault;
    };

    // Helper para rendering habilidades in-line (legacy eval renderer reuse)
    const renderHabilidades = (habilidades) => {
        if (!habilidades) return null;
        const skills = [];

        if (habilidades.sonido !== undefined && habilidades.sonido !== null) {
            skills.push(
                <div key="sonido" className="flex items-center gap-1.5 text-xs">
                    <Music className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-medium">Sonido:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.sonido}/10</span>
                </div>
            );
        }
        // ... (keep legacy render logic if needed, or simplified)
        // Simplified for brevity in legacy rendering, main focus is unified feedback
        return null; // Legacy details are inside modal mostly? Visual cue is duplicate.
        // Actually keep it visible in list if desired. I'll stick to cleaner list.
    };

    // Renderizar un item de feedback
    const renderFeedback = (item) => {
        const feedback = item.data;
        const prof = usuariosMap[feedback.profesorId];
        const puedeEditarEste = puedeEditar ? puedeEditar(feedback) : false;

        return (
            <div
                key={item.id}
                className="group flex items-start gap-3 py-3 px-4 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors rounded-r-lg cursor-pointer"
                onClick={() => handleViewFeedback(feedback)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewFeedback(feedback); }}
            >
                <MessageSquare className="w-5 h-5 text-[var(--color-info)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-[var(--color-info)]">🗨️ Comentario del profesor</span>
                        {prof && (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                                • {getNombre(feedback.profesorId)}
                            </span>
                        )}
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            • {formatFechaHora(item.timestamp)}
                        </span>
                        {!isEstu && feedback.alumnoNombre && (
                            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                                → {feedback.alumnoNombre}
                            </span>
                        )}
                    </div>
                    {feedback.notaProfesor && (
                        <p className="text-sm text-[var(--color-text-primary)] break-words line-clamp-2">
                            {feedback.notaProfesor}
                        </p>
                    )}
                    {feedback.lastEditedAt && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 italic text-right w-full">
                            Editado: {formatFechaHora(new Date(feedback.lastEditedAt))}
                        </p>
                    )}

                    {/* Metrics Badges Preview */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(feedback.sonido != null) && (
                            <Badge variant="outline" className="text-xs py-0 h-5">🎵 {feedback.sonido}</Badge>
                        )}
                        {(feedback.cognicion != null) && (
                            <Badge variant="outline" className="text-xs py-0 h-5">🧠 {feedback.cognicion}</Badge>
                        )}
                        {(feedback.mediaLinks?.length > 0) && (
                            <Badge variant="outline" className="text-xs py-0 h-5 flex items-center gap-1">
                                {feedback.mediaLinks.length === 1 ? (
                                    <>
                                        <MediaIcon url={feedback.mediaLinks[0]} className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sm">📎</span>
                                        <span>{feedback.mediaLinks.length} adjuntos</span>
                                    </>
                                )}
                            </Badge>
                        )}
                    </div>
                </div>
                {puedeEditarEste && onEditFeedback && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditFeedback(feedback);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 text-sm shrink-0 transition-opacity"
                    >
                        <Edit className="w-4 h-4" />
                        {!isMobile && 'Editar'}
                    </button>
                )}
            </div>
        );
    };

    // Renderizar un item de evaluación (legacy)
    const renderEvaluacion = (item) => {
        const evaluacion = item.data;
        // Legacy evals are read-only mostly, no special modal for them?
        // Actually, we can open a modal for them too if we adapt data?
        // For now, render as static card or use same modal if compatible.
        // Let's keep it simple: static card for legacy.

        return (
            <div key={item.id} className="flex items-start gap-3 py-3 px-4 border-l-4 border-l-[var(--color-border-default)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors rounded-r-lg opacity-80">
                <ClipboardCheck className="w-5 h-5 text-[var(--color-text-secondary)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">📋 Evaluación (Legacy)</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            • {formatFechaHora(item.timestamp)}
                        </span>
                    </div>
                    {/* Basic legacy display */}
                    {evaluacion.notas && (
                        <p className="text-sm text-[var(--color-text-secondary)] italic break-words line-clamp-2">"{evaluacion.notas}"</p>
                    )}
                </div>
            </div>
        );
    };

    // Renderizar un item de sesión
    const renderSesion = (item) => {
        const registro = item.data;
        const badgeClass = getCalificacionBadge(registro.calificacion);

        return (
            <div
                key={item.id}
                className="flex items-start gap-3 py-3 px-4 border-l-4 border-l-[var(--color-success)] bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 transition-colors rounded-r-lg cursor-pointer"
                onClick={() => handleViewSesion(registro)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewSesion(registro); }}
            >
                <BookOpen className="w-5 h-5 text-[var(--color-success)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-[var(--color-success)]">📖 Sesión de estudio</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">• {formatFechaHora(item.timestamp)}</span>
                        {registro.calificacion && registro.calificacion > 0 && badgeClass && (
                            <Badge className={`${badgeClass} shrink-0 ml-auto scale-90 origin-right`}>
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {Math.round(registro.calificacion)}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-1 truncate">
                        {registro.sesionNombre || 'Sesión sin nombre'}
                    </p>
                </div>
            </div>
        );
    };

    // Counts for badges
    const counts = useMemo(() => ({
        todos: itemsCombinados.length,
        sesiones: itemsCombinados.filter(i => i.tipo === 'sesion').length,
        feedback_profesor: itemsCombinados.filter(i => i.tipo === 'feedback' || i.tipo === 'evaluacion').length,
    }), [itemsCombinados]);

    const totalItems = itemsFiltrados.length;

    return (
        <>
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Feedback
                        <span className="text-xs text-[var(--color-text-secondary)] font-normal ml-2 hidden sm:inline">
                            📖 Sesiones + 🗨️ Comentarios
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Pills filter unified style */}
                    <div className="flex bg-[var(--color-surface-muted)] p-1 rounded-lg w-fit mb-4">
                        <button
                            onClick={() => setTipoFiltro('todos')}
                            className={cn(
                                "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                tipoFiltro === 'todos'
                                    ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            Todos
                            {counts.todos > 0 && (
                                <span className={cn(
                                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border",
                                    tipoFiltro === 'todos'
                                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
                                        : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
                                )}>
                                    {counts.todos}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setTipoFiltro('sesiones')}
                            className={cn(
                                "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                tipoFiltro === 'sesiones'
                                    ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            <BookOpen className="w-3.5 h-3.5 mr-2" />
                            Sesiones
                            {counts.sesiones > 0 && (
                                <span className={cn(
                                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border",
                                    tipoFiltro === 'sesiones'
                                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
                                        : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
                                )}>
                                    {counts.sesiones}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setTipoFiltro('feedback_profesor')}
                            className={cn(
                                "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                tipoFiltro === 'feedback_profesor'
                                    ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            )}
                        >
                            <MessageSquare className="w-3.5 h-3.5 mr-2" />
                            Feedback
                            {counts.feedback_profesor > 0 && (
                                <span className={cn(
                                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border",
                                    tipoFiltro === 'feedback_profesor'
                                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
                                        : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
                                )}>
                                    {counts.feedback_profesor}
                                </span>
                            )}
                        </button>
                    </div>

                    {totalItems === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <MessageSquare className={componentStyles.components.emptyStateIcon} />
                            <p className={componentStyles.components.emptyStateText}>
                                No hay registros en el periodo seleccionado
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {itemsFiltrados.map((item) => {
                                if (item.tipo === 'feedback') return renderFeedback(item);
                                if (item.tipo === 'evaluacion') return renderEvaluacion(item);
                                if (item.tipo === 'sesion') return renderSesion(item);
                                return null;
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ModalSesion
                open={modalSesionOpen}
                onOpenChange={setModalSesionOpen}
                registroSesion={registroSesionSeleccionado}
                usuarios={Object.values(usuariosMap)}
                onMediaClick={onMediaClick}
            />

            <ModalDetalleFeedback
                open={modalFeedbackOpen}
                onOpenChange={setModalFeedbackOpen}
                feedback={feedbackSeleccionado}
                usuarios={Object.values(usuariosMap)}
                onMediaClick={onMediaClick}
            />
        </>
    );
}
