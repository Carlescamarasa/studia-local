import React, { useState, useMemo } from "react";
import { Card, CardContent, Badge } from "@/components/ds";
import TablePagination from "@/components/common/TablePagination";
import { MessageSquare, ClipboardCheck, BookOpen, Star, LayoutList, Edit } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { MediaIcon } from "@/shared/components/media/MediaEmbed";
import { displayName } from "@/components/utils/helpers";
import { cn } from "@/lib/utils";
import ModalSesion from "@/components/calendario/ModalSesion";
import ModalFeedbackDetalle from "@/shared/components/feedback/ModalFeedbackDetalle";
import { Button } from "@/components/ds/Button";

/**
 * FeedbackUnificadoTab - Muestra comentarios del profesor, evaluaciones técnicas y sesiones
 * en una única lista ordenada por created_at (timestamp) con filtros tipo pills
 */
export interface FeedbackUnificadoTabProps {
    feedbacks: any[];
    evaluaciones: any[];
    registros: any[];
    usuarios: any | any[];
    isEstu: boolean;
    onEditFeedback?: (feedback: any) => void;
    onDeleteFeedback?: (id: string) => void;
    puedeEditar?: (feedback: any) => boolean;
    onMediaClick?: (mediaLinks: any[], index: number) => void;
    isMediaModalOpen?: boolean;
    actionButton?: React.ReactNode;
    userIdActual?: string;
    userRole?: 'ADMIN' | 'PROF' | 'ESTU';
}

export default function FeedbackUnificadoTab({
    feedbacks = [],
    evaluaciones = [],
    registros = [],
    usuarios = {},
    isEstu = false,
    onEditFeedback,
    onDeleteFeedback,
    puedeEditar,
    onMediaClick,
    isMediaModalOpen,
    actionButton,
    userIdActual,
    userRole = 'ESTU'
}: FeedbackUnificadoTabProps) {
    const isMobile = useIsMobile();

    // Pills filter state: 'todos' | 'sesiones' | 'feedback_profesor'
    const [tipoFiltro, setTipoFiltro] = useState('todos');

    // Modal state for viewing details
    const [modalSesionOpen, setModalSesionOpen] = useState(false);
    const [registroSesionSeleccionado, setRegistroSesionSeleccionado] = useState<any | null>(null);

    const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
    const [feedbackSeleccionado, setFeedbackSeleccionado] = useState<any | null>(null);

    // Pagination state
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Handlers
    const handleViewSesion = (registro: any) => {
        setRegistroSesionSeleccionado(registro);
        setModalSesionOpen(true);
    };

    const handleViewFeedback = (feedback: any) => {
        setFeedbackSeleccionado(feedback);
        setModalFeedbackOpen(true);
    };

    // Convertir usuarios a mapa si es array
    const usuariosMap = useMemo(() => {
        if (Array.isArray(usuarios)) {
            const map: Record<string, any> = {};
            usuarios.forEach(u => { map[u.id] = u; });
            return map;
        }
        return usuarios;
    }, [usuarios]);

    // Obtener nombre del usuario
    const getNombre = (userId: string) => {
        const usuario = usuariosMap[userId];
        if (!usuario) return 'Profesor';
        return displayName(usuario);
    };

    // Combinar feedbacks, evaluaciones (legacy) y sesiones en una sola lista
    const itemsCombinados = useMemo(() => {
        const items: any[] = [];

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
        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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

    // Reset pagination when filter changes
    React.useEffect(() => {
        setPagina(1);
    }, [tipoFiltro]);

    // Pagination Logic
    const itemsPaginados = useMemo(() => {
        const start = (pagina - 1) * pageSize;
        return itemsFiltrados.slice(start, start + pageSize);
    }, [itemsFiltrados, pagina, pageSize]);

    // Formatear fecha con hora
    const formatFechaHora = (date: Date) => {
        if (!date || isNaN(date.getTime())) return 'Sin fecha';
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get calificacion badge style
    const getCalificacionBadge = (cal: number | undefined | null) => {
        if (!cal || cal <= 0) return null;
        const calInt = Math.round(cal);
        if (calInt === 1) return componentStyles.status.badgeDanger;
        if (calInt === 2) return componentStyles.status.badgeWarning;
        if (calInt === 3) return componentStyles.status.badgeInfo;
        if (calInt === 4) return componentStyles.status.badgeSuccess;
        return componentStyles.status.badgeDefault;
    };

    // Renderizar un item de feedback
    const renderFeedback = (item: any) => {
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
    const renderEvaluacion = (item: any) => {
        const evaluacion = item.data;

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
    const renderSesion = (item: any) => {
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
            {/* Pills filter - OUTSIDE the card like Estadísticas/Resumen */}
            <div className="relative flex justify-center items-center mb-6">
                <div className="flex bg-[var(--color-surface-muted)] p-1 rounded-lg">
                    <button
                        onClick={() => setTipoFiltro('todos')}
                        className={cn(
                            "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            tipoFiltro === 'todos'
                                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        <LayoutList className="w-3.5 h-3.5 mr-2" />
                        Todos
                        {counts.todos > 0 && (
                            <span className={cn(
                                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border",
                                "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
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
                {actionButton && (
                    <div className="absolute right-0">
                        {actionButton}
                    </div>
                )}
            </div>

            {/* Content Card - no header since title is in tab */}
            <Card className={componentStyles.components.cardBase}>
                <CardContent className="p-4">
                    {totalItems === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <MessageSquare className={componentStyles.components.emptyStateIcon} />
                            <p className={componentStyles.components.emptyStateText}>
                                No hay registros en el periodo seleccionado
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 mb-4">
                                {itemsPaginados.map((item) => {
                                    if (item.tipo === 'feedback') return renderFeedback(item);
                                    if (item.tipo === 'evaluacion') return renderEvaluacion(item);
                                    if (item.tipo === 'sesion') return renderSesion(item);
                                    return null;
                                })}
                            </div>

                            <TablePagination
                                data={itemsFiltrados as any[]}
                                currentPage={pagina}
                                pageSize={pageSize}
                                onPageChange={setPagina}
                                onPageSizeChange={(newSize) => {
                                    setPageSize(newSize);
                                    setPagina(1);
                                }}
                                pageSizeOptions={[10, 20, 50, 100]}
                            />
                        </>
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

            <ModalFeedbackDetalle
                open={modalFeedbackOpen}
                onOpenChange={setModalFeedbackOpen}
                feedback={feedbackSeleccionado}
                usuarios={Object.values(usuariosMap)}
                onMediaClick={onMediaClick}
                isMediaModalOpen={isMediaModalOpen}
                onEdit={onEditFeedback}
                onDelete={onDeleteFeedback}
                userIdActual={userIdActual}
                userRole={userRole}
            />
        </>
    );
}
