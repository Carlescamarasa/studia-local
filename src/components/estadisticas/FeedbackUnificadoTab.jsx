import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { MessageSquare, ClipboardCheck, Gauge, Music, Brain, Zap, Target, Edit } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import { displayName } from "@/components/utils/helpers";

/**
 * FeedbackUnificadoTab - Muestra comentarios del profesor y evaluaciones técnicas
 * en una única lista ordenada por created_at (timestamp)
 * 
 * @param {Object} props
 * @param {Array} props.feedbacks - Array de feedbacks del profesor
 * @param {Array} props.evaluaciones - Array de evaluaciones técnicas
 * @param {Object} props.usuarios - Mapa/Array de usuarios para obtener nombres
 * @param {boolean} props.isEstu - Si es estudiante
 * @param {Function} props.onEditFeedback - Callback para editar feedback
 * @param {Function} props.puedeEditar - Función que determina si se puede editar un feedback
 * @param {Function} props.onMediaClick - Callback para abrir medialinks
 */
export default function FeedbackUnificadoTab({
    feedbacks = [],
    evaluaciones = [],
    usuarios = {},
    isEstu = false,
    onEditFeedback,
    puedeEditar,
    onMediaClick
}) {
    const isMobile = useIsMobile();

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

    // Combinar feedbacks y evaluaciones en una sola lista ordenada por created_at
    const itemsCombinados = useMemo(() => {
        const items = [];

        // Agregar feedbacks
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

        // Agregar evaluaciones
        evaluaciones.forEach(evaluacion => {
            // Supabase returns createdAt (camelCase via snakeToCamel), local has created_at or created_date
            const dateStr = evaluacion.createdAt || evaluacion.created_at || evaluacion.created_date || evaluacion.fecha;
            const timestamp = dateStr ? new Date(dateStr) : new Date(0);
            items.push({
                tipo: 'evaluacion',
                timestamp,
                data: evaluacion,
                id: `evaluacion-${evaluacion.id}`
            });
        });

        // Ordenar por timestamp descendente (más reciente primero)
        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [feedbacks, evaluaciones]);

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

    const totalItems = itemsCombinados.length;

    return (
        <Card className={componentStyles.components.cardBase}>
            <CardHeader>
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
                    Feedback ({totalItems})
                    <span className="text-xs text-[var(--color-text-secondary)] font-normal ml-2">
                        🗨️ Comentarios + 📋 Evaluaciones
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {totalItems === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <MessageSquare className={componentStyles.components.emptyStateIcon} />
                        <p className={componentStyles.components.emptyStateText}>
                            No hay feedback ni evaluaciones en el periodo seleccionado
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {itemsCombinados.map((item) => {
                            if (item.tipo === 'feedback') {
                                return renderFeedback(item);
                            } else {
                                return renderEvaluacion(item);
                            }
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
