import React, { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ds";
import { Users } from "lucide-react";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { useUsers } from "@/hooks/entities/useUsers";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { useFeedbacksSemanal } from "@/hooks/entities/useFeedbacksSemanal";
import { localDataClient } from "@/api/localDataClient";
import {
    calcularOffsetSemanas,
    resolveUserIdActual,
    displayName
} from "@/components/utils/helpers";
import { isoWeekNumber, parseLocalDate } from "../utils";
// @ts-expect-error ModalFeedbackSemanal is not typed
import ModalFeedbackSemanal from "@/shared/components/feedback/ModalFeedbackSemanal";
// @ts-expect-error MediaPreviewModal is not typed
import MediaPreviewModal from "@/shared/components/media/MediaPreviewModal";
import EstudianteCard from "./EstudianteCard";

// Types
interface Usuario {
    id: string;
    nombre?: string;
    email?: string;
    rolPersonalizado?: string;
    profesorAsignadoId?: string;
}

interface Semana {
    nombre?: string;
    sesiones?: Array<{ nombre: string; foco?: string }>;
}

interface Asignacion {
    id: string;
    alumnoId: string;
    profesorId?: string;
    semanaInicioISO: string;
    estado: string;
    plan?: {
        nombre?: string;
        semanas?: Semana[];
    };
    piezaSnapshot?: {
        nombre?: string;
    };
}

interface Feedback {
    id: string;
    alumnoId: string;
    profesorId: string;
    semanaInicioISO: string;
    notaProfesor?: string;
    lastEditedAt?: string;
    mediaLinks?: Array<{ url: string; tipo?: string }>;
    habilidades?: {
        sonido?: number;
        cognicion?: number;
        xpDeltas?: {
            motricidad?: number;
            articulacion?: number;
            flexibilidad?: number;
        };
    };
}

interface SelectedFeedbackData {
    studentId: string;
    feedback: Feedback | null;
    weekStartISO: string;
    weekLabel: string;
}

interface CuadernoEstudiantesTabProps {
    semanaActualISO: string;
    searchTerm: string;
}

/**
 * CuadernoEstudiantesTab - Displays list of students with their assignments and feedback
 */
export default function CuadernoEstudiantesTab({ semanaActualISO, searchTerm }: CuadernoEstudiantesTabProps) {
    const queryClient = useQueryClient();
    const ctx = useEffectiveUser();
    const effectiveRole = ctx.effectiveRole;
    const isAdmin = effectiveRole === 'ADMIN';

    // Filters
    const [filtroRapido, setFiltroRapido] = useState('todos');
    const [roleFilter, setRoleFilter] = useState(isAdmin ? 'todos' : 'mis');

    // Session & Modal state
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedFeedbackData, setSelectedFeedbackData] = useState<SelectedFeedbackData | null>(null);
    const [showMediaPreview, setShowMediaPreview] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<Array<{ url: string; tipo?: string }>>([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    // Data hooks
    const { data: usuarios = [] } = useUsers() as { data: Usuario[] };
    const { data: asignacionesRaw = [] } = useAsignaciones() as { data: Asignacion[] };
    const { data: feedbacksSemanalRaw = [] } = useFeedbacksSemanal() as { data: Feedback[] };

    const userIdActual = useMemo(() =>
        resolveUserIdActual({ id: ctx.effectiveUserId, email: ctx.effectiveEmail }, usuarios),
        [ctx.effectiveUserId, ctx.effectiveEmail, usuarios]
    );

    const estudiantes = useMemo(() =>
        usuarios.filter((u: Usuario) => u.rolPersonalizado === 'ESTU'),
        [usuarios]
    );

    const asignaciones = useMemo(() =>
        asignacionesRaw.filter((a: Asignacion) => {
            if (!a.alumnoId) return false;
            if (!a.plan || !Array.isArray(a.plan.semanas) || a.plan.semanas.length === 0) return false;
            if (!a.semanaInicioISO) return false;
            return true;
        }),
        [asignacionesRaw]
    );

    // Build table data
    const tableData = useMemo(() => {
        let baseList = estudiantes;

        // Role filter
        if (roleFilter === 'mis' && userIdActual) {
            const asignacionesDelProfesor = asignaciones.filter((a: Asignacion) => a.profesorId === userIdActual);
            const alumnosAsignadosIds = new Set(asignacionesDelProfesor.map((a: Asignacion) => a.alumnoId));
            baseList = baseList.filter((e: Usuario) =>
                alumnosAsignadosIds.has(e.id) || e.profesorAsignadoId === userIdActual
            );
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            baseList = baseList.filter((e: Usuario) => {
                const nombre = displayName(e).toLowerCase();
                const email = (e.email || '').toLowerCase();
                return nombre.includes(term) || email.includes(term);
            });
        }

        return baseList.map((alumno: Usuario) => {
            const asignacionActiva = asignaciones.find((a: Asignacion) => {
                if (a.alumnoId !== alumno.id) return false;
                if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
                const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
                return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
            });

            const feedbacksAlumno = feedbacksSemanalRaw.filter((f: Feedback) =>
                f.alumnoId === alumno.id && f.semanaInicioISO === semanaActualISO
            );
            const feedback = feedbacksAlumno.find((f: Feedback) => f.profesorId === userIdActual) || feedbacksAlumno[0];

            const semanaIdx = asignacionActiva ?
                calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;
            const semana = asignacionActiva?.plan?.semanas?.[semanaIdx];

            return { id: alumno.id, alumno, asignacionActiva, semana, semanaIdx, feedback };
        }).filter((row: { asignacionActiva?: Asignacion | null; feedback?: Feedback | null }) => {
            if (filtroRapido === 'todos') return true;
            if (filtroRapido === 'con-asignacion') return !!row.asignacionActiva;
            if (filtroRapido === 'sin-asignacion') return !row.asignacionActiva;
            if (filtroRapido === 'feedback-pendiente') return row.asignacionActiva && !row.feedback;
            return true;
        });
    }, [estudiantes, asignaciones, feedbacksSemanalRaw, semanaActualISO, userIdActual, roleFilter, searchTerm, filtroRapido]);

    // Handlers
    const toggleSession = (key: string) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const abrirFeedbackModal = (alumno: Usuario, feedbackExistente: Feedback | null = null) => {
        const lunesSemana = parseLocalDate(semanaActualISO);
        const domingoSemana = new Date(lunesSemana);
        domingoSemana.setDate(lunesSemana.getDate() + 6);
        const numeroSemana = isoWeekNumber(lunesSemana);
        const rangeText = `${lunesSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${domingoSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        setSelectedFeedbackData({
            studentId: alumno.id,
            feedback: feedbackExistente,
            weekStartISO: semanaActualISO,
            weekLabel: `Semana ${numeroSemana} · ${rangeText}`
        });
        setFeedbackModalOpen(true);
    };

    const handleFeedbackSaved = () => {
        queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
    };

    const eliminarFeedbackMutation = useMutation({
        mutationFn: async (id: string) => await localDataClient.entities.FeedbackSemanal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
        }
    });

    const handlePreviewMedia = (index: number, urls: Array<{ url: string; tipo?: string }>) => {
        setPreviewUrls(urls);
        setPreviewIndex(index);
        setShowMediaPreview(true);
    };

    return (
        <div className="space-y-6">
            {/* Quick Filters & Role Toggles */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border">
                    {isAdmin ? (
                        <>
                            <Button variant={roleFilter === 'todos' ? 'default' : 'ghost'} size="sm" onClick={() => setRoleFilter('todos')} className={roleFilter === 'todos' ? "shadow-sm" : ""}>Todos</Button>
                            <Button variant={roleFilter === 'mis' ? 'default' : 'ghost'} size="sm" onClick={() => setRoleFilter('mis')} className={roleFilter === 'mis' ? "shadow-sm" : ""}>Mis alumnos</Button>
                        </>
                    ) : (
                        <>
                            <Button variant={roleFilter === 'mis' ? 'default' : 'ghost'} size="sm" onClick={() => setRoleFilter('mis')} className={roleFilter === 'mis' ? "shadow-sm" : ""}>Mis alumnos</Button>
                            <Button variant={roleFilter === 'todos' ? 'default' : 'ghost'} size="sm" onClick={() => setRoleFilter('todos')} className={roleFilter === 'todos' ? "shadow-sm" : ""}>Todos</Button>
                        </>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'con-asignacion', label: 'Con asignación' },
                        { id: 'sin-asignacion', label: 'Sin asignación' },
                        { id: 'feedback-pendiente', label: 'Feedback pendiente' },
                    ].map(f => (
                        <Badge
                            key={f.id}
                            variant={filtroRapido === f.id ? 'default' : 'outline'}
                            className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5"
                            onClick={() => setFiltroRapido(f.id)}
                        >
                            {f.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {tableData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>{searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes que coincidan con los filtros'}</p>
                    </div>
                ) : (
                    tableData.map((row: { id: string; alumno: Usuario; asignacionActiva?: Asignacion | null; semana?: Semana | null; semanaIdx: number; feedback?: Feedback | null }) => (
                        <EstudianteCard
                            key={row.id}
                            alumno={row.alumno}
                            asignacionActiva={row.asignacionActiva}
                            semana={row.semana}
                            semanaIdx={row.semanaIdx}
                            feedback={row.feedback}
                            usuarios={usuarios}
                            userIdActual={userIdActual || ''}
                            isAdmin={isAdmin}
                            expandedSessions={expandedSessions}
                            onToggleSession={toggleSession}
                            onOpenFeedback={abrirFeedbackModal}
                            onDeleteFeedback={(id: string) => eliminarFeedbackMutation.mutate(id)}
                            onPreviewMedia={handlePreviewMedia}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            <ModalFeedbackSemanal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                studentId={selectedFeedbackData?.studentId}
                feedback={selectedFeedbackData?.feedback}
                weekStartISO={selectedFeedbackData?.weekStartISO}
                weekLabel={selectedFeedbackData?.weekLabel}
                onSaved={handleFeedbackSaved}
            />

            {showMediaPreview && (
                <MediaPreviewModal
                    urls={previewUrls}
                    initialIndex={previewIndex}
                    open={showMediaPreview}
                    onClose={() => setShowMediaPreview(false)}
                />
            )}
        </div>
    );
}
