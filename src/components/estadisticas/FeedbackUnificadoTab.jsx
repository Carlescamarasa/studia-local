import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { MessageSquare, ClipboardCheck, Gauge, Music, Brain, Zap, Target, Edit, BookOpen, Star } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import { displayName } from "@/components/utils/helpers";
import { cn } from "@/lib/utils";
import ModalSesion from "@/components/calendario/ModalSesion";

/**
 * FeedbackUnificadoTab - Muestra comentarios del profesor, evaluaciones técnicas y sesiones
 * en una única lista ordenada por created_at (timestamp) con filtros tipo pills
 * 
 * @param {Object} props
 * @param {Array} props.feedbacks - Array de feedbacks del profesor
 * @param {Array} props.evaluaciones - Array de evaluaciones técnicas
 * @param {Array} props.registros - Array de registros de sesión (sessions)
 * @param {Object} props.usuarios - Mapa/Array de usuarios para obtener nombres
 * @param {boolean} props.isEstu - Si es estudiante
 * @param {Function} props.onEditFeedback - Callback para editar feedback
 * @param {Function} props.puedeEditar - Función que determina si se puede editar un feedback
 * @param {Function} props.onMediaClick - Callback para abrir medialinks
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
    // Note: 'evaluaciones' removed - sonido/cognicion now part of feedbacks
    const [tipoFiltro, setTipoFiltro] = useState('todos');

    // Modal state for viewing session details
    const [modalSesionOpen, setModalSesionOpen] = useState(false);
    const [registroSesionSeleccionado, setRegistroSesionSeleccionado] = useState(null);

    // Handler to open session modal
    const handleViewSesion = (registro) => {
        setRegistroSesionSeleccionado(registro);
        setModalSesionOpen(true);
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

    // Combinar feedbacks y sesiones en una sola lista ordenada por timestamp
    // Note: evaluaciones técnicas (EvaluacionTecnica) ya no se usan - sonido/cognicion están en feedbacks
    const itemsCombinados = useMemo(() => {
        const items = [];

        // Agregar feedbacks (ahora incluyen sonido/cognicion)
        feedbacks.forEach(feedback => {
            // Supabase returns createdAt (camelCase via snakeToCamel), local has created_at
            const dateStr = feedback.createdAt || feedback.created_at || feedback.semanaInicioISO;
            const timestamp = dateStr ? new Date(dateStr) : new Date(0);
            items.push({
                tipo: 'feedback',
                timestamp,
                data: feedback,
                id: `feedback-${feedback.id}`
            });
        });

        // Agregar registros de sesión
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

        // Ordenar por timestamp descendente (más reciente primero)
        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [feedbacks, registros]);

    // Filter items based on selected pill
    const itemsFiltrados = useMemo(() => {
        if (tipoFiltro === 'todos') {
            return itemsCombinados;
        } else if (tipoFiltro === 'sesiones') {
            return itemsCombinados.filter(item => item.tipo === 'sesion');
        } else if (tipoFiltro === 'feedback_profesor') {
            return itemsCombinados.filter(item => item.tipo === 'feedback');
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

    // Renderizar habilidades de evaluación
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

        if (habilidades.flexibilidad !== undefined && habilidades.flexibilidad !== null) {
            skills.push(
                <div key="flexibilidad" className="flex items-center gap-1.5 text-xs">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-medium">Flexibilidad:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.flexibilidad}/10</span>
                </div>
            );
        }

        if (habilidades.cognitivo !== undefined && habilidades.cognitivo !== null) {
            skills.push(
                <div key="cognitivo" className="flex items-center gap-1.5 text-xs">
                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-medium">Cognición:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.cognitivo}/10</span>
                </div>
            );
        }

        if (habilidades.motricidad !== undefined && habilidades.motricidad !== null) {
            skills.push(
                <div key="motricidad" className="flex items-center gap-1.5 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-medium">Motricidad:</span>
                    <span className="text-[var(--color-text-primary)]">{habilidades.motricidad} BPM</span>
                </div>
            );
        }

        if (habilidades.articulacion) {
            const art = habilidades.articulacion;
            const artParts = [];
            if (art.t !== undefined && art.t !== null) artParts.push(`T: ${art.t}`);
            if (art.tk !== undefined && art.tk !== null) artParts.push(`TK: ${art.tk}`);
            if (art.ttk !== undefined && art.ttk !== null) artParts.push(`TTK: ${art.ttk}`);

            if (artParts.length > 0) {
                skills.push(
                    <div key="articulacion" className="flex items-center gap-1.5 text-xs">
                        <Target className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-medium">Articulación:</span>
                        <span className="text-[var(--color-text-primary)]">{artParts.join(', ')} BPM</span>
                    </div>
                );
            }
        }

        if (skills.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {skills}
            </div>
        );
    };

    // Renderizar un item de feedback
    const renderFeedback = (item) => {
        const feedback = item.data;
        const prof = usuariosMap[feedback.profesorId];
        const puedeEditarEste = puedeEditar ? puedeEditar(feedback) : false;

        return (
            <div key={item.id} className="flex items-start gap-3 py-3 px-4 border-l-4 border-l-[var(--color-info)] bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10 transition-colors rounded-r-lg">
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
                        <p className="text-sm text-[var(--color-text-primary)] break-words">
                            {feedback.notaProfesor}
                        </p>
                    )}
                    {/* Mostrar métricas técnicas si existen (sonido/cognicion) */}
                    {(feedback.sonido != null || feedback.cognicion != null) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {feedback.sonido != null && (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Music className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="font-medium">Sonido:</span>
                                    <span className="text-[var(--color-text-primary)]">{feedback.sonido}/10</span>
                                </div>
                            )}
                            {feedback.cognicion != null && (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                                    <span className="font-medium">Cognición:</span>
                                    <span className="text-[var(--color-text-primary)]">{feedback.cognicion}/10</span>
                                </div>
                            )}
                        </div>
                    )}
                    {feedback.mediaLinks && feedback.mediaLinks.length > 0 && (
                        <div className="mt-2">
                            <MediaLinksBadges
                                mediaLinks={feedback.mediaLinks}
                                onMediaClick={onMediaClick ? (index) => onMediaClick(feedback.mediaLinks, index) : undefined}
                                compact={true}
                                maxDisplay={3}
                            />
                        </div>
                    )}
                </div>
                {puedeEditarEste && onEditFeedback && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditFeedback(feedback);
                        }}
                        className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 text-sm shrink-0"
                    >
                        <Edit className="w-4 h-4" />
                        {!isMobile && 'Editar'}
                    </button>
                )}
            </div>
        );
    };

    // Renderizar un item de evaluación
    const renderEvaluacion = (item) => {
        const evaluacion = item.data;

        return (
            <div key={item.id} className="flex items-start gap-3 py-3 px-4 border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors rounded-r-lg">
                <ClipboardCheck className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-[var(--color-primary)]">📋 Evaluación técnica</span>
                        {evaluacion.profesorId && (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                                • {getNombre(evaluacion.profesorId)}
                            </span>
                        )}
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            • {formatFechaHora(item.timestamp)}
                        </span>
                        {!isEstu && evaluacion.alumnoNombre && (
                            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                                → {evaluacion.alumnoNombre}
                            </span>
                        )}
                    </div>
                    {renderHabilidades(evaluacion.habilidades)}
                    {evaluacion.notas && (
                        <p className="text-sm text-[var(--color-text-primary)] italic break-words mt-1">
                            "{evaluacion.notas}"
                        </p>
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
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            • {formatFechaHora(item.timestamp)}
                        </span>
                        {registro.piezaNombre && (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                                • {registro.piezaNombre}
                            </span>
                        )}
                        {registro.calificacion && registro.calificacion > 0 && badgeClass && (
                            <Badge className={`${badgeClass} shrink-0 ml-auto`}>
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {isNaN(registro.calificacion) ? '0' : Math.round(registro.calificacion)}/4
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-1">
                        {registro.sesionNombre || 'Sesión sin nombre'}
                    </p>
                    {registro.notas && registro.notas.trim() && (
                        <p className="text-sm text-[var(--color-text-primary)] italic break-words">
                            "{registro.notas.trim()}"
                        </p>
                    )}
                    {registro.mediaLinks && Array.isArray(registro.mediaLinks) && registro.mediaLinks.length > 0 && (
                        <div className="mt-2">
                            <MediaLinksBadges
                                mediaLinks={registro.mediaLinks}
                                onMediaClick={onMediaClick ? (index) => onMediaClick(registro.mediaLinks, index) : undefined}
                                compact={true}
                                maxDisplay={3}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const totalItems = itemsFiltrados.length;

    // Counts for badges
    const counts = useMemo(() => ({
        todos: itemsCombinados.length,
        sesiones: itemsCombinados.filter(i => i.tipo === 'sesion').length,
        feedback_profesor: itemsCombinados.filter(i => i.tipo === 'feedback').length,
    }), [itemsCombinados]);

    return (
        <>
            <Card className={componentStyles.components.cardBase}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                        Feedback
                        <span className="text-xs text-[var(--color-text-secondary)] font-normal ml-2">
                            📖 Sesiones + 🗨️ Comentarios
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Pills filter */}
                    <div className="flex gap-1.5 flex-wrap mb-4">
                        <Button
                            variant={tipoFiltro === 'todos' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTipoFiltro('todos')}
                            className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                        >
                            Todos
                            {counts.todos > 0 && (
                                <Badge variant="outline" className="ml-1.5 text-xs px-1.5 py-0">
                                    {counts.todos}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant={tipoFiltro === 'sesiones' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTipoFiltro('sesiones')}
                            className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                        >
                            <BookOpen className="w-3.5 h-3.5 mr-1" />
                            Registro Sesiones
                            {counts.sesiones > 0 && (
                                <Badge variant="outline" className="ml-1.5 text-xs px-1.5 py-0">
                                    {counts.sesiones}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant={tipoFiltro === 'feedback_profesor' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTipoFiltro('feedback_profesor')}
                            className="text-xs h-8 sm:h-9 rounded-xl focus-brand transition-all"
                        >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Feedback Profesor
                            {counts.feedback_profesor > 0 && (
                                <Badge variant="outline" className="ml-1.5 text-xs px-1.5 py-0">
                                    {counts.feedback_profesor}
                                </Badge>
                            )}
                        </Button>
                    </div>

                    {totalItems === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            {tipoFiltro === 'sesiones' ? (
                                <BookOpen className={componentStyles.components.emptyStateIcon} />
                            ) : tipoFiltro === 'feedback_profesor' ? (
                                <MessageSquare className={componentStyles.components.emptyStateIcon} />
                            ) : (
                                <MessageSquare className={componentStyles.components.emptyStateIcon} />
                            )}
                            <p className={componentStyles.components.emptyStateText}>
                                {tipoFiltro === 'todos'
                                    ? 'No hay feedback ni sesiones en el periodo seleccionado'
                                    : tipoFiltro === 'sesiones'
                                        ? 'No hay registros de sesiones en el periodo seleccionado'
                                        : 'No hay comentarios del profesor en el periodo seleccionado'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {itemsFiltrados.map((item) => {
                                if (item.tipo === 'feedback') {
                                    return renderFeedback(item);
                                } else if (item.tipo === 'sesion') {
                                    return renderSesion(item);
                                }
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
        </>
    );
}
