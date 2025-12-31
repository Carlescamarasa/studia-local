/**
 * Progreso - Dashboard unificado de progreso
 * 
 * Tabs:
 * - resumen: Resumen con KPIs + XP total + radar
 * - habilidades: Vista de habilidades maestras (HabilidadesView)
 * - estadisticas: Estadísticas embebidas (gráficos reales)
 * - mochila: Tabla de mochila con toggles
 * - feedback: Feedback unificado del profesor
 * 
 * Bloque 1: Navigation normalizada (tab fallback a resumen)
 * Bloque 2: Selector alumno único global
 * Bloque 3: Estadísticas embebidas (no link)
 */

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { useUsers } from "@/features/shared/hooks/useUsers";
import { useAsignaciones } from "@/features/asignaciones/hooks/useAsignaciones";
import { resolveUserIdActual, displayName } from "@/features/shared/utils/helpers";
import { toast } from "sonner";
import { createManualSessionDraft } from '@/services/manualSessionService';
import { updateBackpackFromSession } from '@/features/shared/services/backpackService';
import { getDerivedBackpackStatus } from '@/features/shared/services/backpackDerivedStatus';
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { formatLocalDate, parseLocalDate, startOfMonday, formatDuracionHM, formatDurationDDHHMM } from "../utils/progresoUtils";
import { chooseBucket } from "../utils/chartHelpers";
import { useEstadisticas, safeNumber } from "../hooks/useEstadisticas";
import { useStudentBackpack } from "@/hooks/useStudentBackpack";
import { useHabilidadesStats, useHabilidadesStatsMultiple } from "../hooks/useHabilidadesStats";
import {
    useTotalXP,
    totalXPToObject,
    useLifetimePracticeXP,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals,
    useAllStudentXPTotals // [NEW] Centralized fetch
} from "../hooks/useXP";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, PageHeader } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ds/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/features/shared/components/ui/tabs";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import MultiSelect from "@/features/shared/components/ui/MultiSelect";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/features/shared/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/features/shared/components/ui/tooltip";

// Tab Components (reutilizados)
import HabilidadesView from "./HabilidadesView";
import MochilaViewContent from "./MochilaViewContent";
import LevelBadge from "@/features/shared/components/common/LevelBadge";
import TabBoundary from "@/features/shared/components/common/TabBoundary";
import UnifiedTable from "@/features/shared/components/tables/UnifiedTable";

import {
    ComparativaEstudiantes,
    FeedbackUnificadoTab,
    HeatmapFranjas,
    KpiTile,
    ProgresoTab,
    RatingStarsMetric,
    ResumenTab,
    StatTile,
    StatsDateHeader,
    StreakMetric,
    TiposBloquesTab,
    TopEjerciciosTab,
} from "./index";

import ModalFeedbackSemanal from "@/features/shared/components/feedback/ModalFeedbackSemanal";
import MediaPreviewModal from "@/features/shared/components/media/MediaPreviewModal";

import { StudiaUser, RegistroSesion, RegistroBloque, FeedbackSemanal, StudentBackpackItem } from "@/features/shared/types/domain";
import RequireRole from "@/features/auth/components/RequireRole";
import { toStudia } from "@/lib/routes";
import { es } from "date-fns/locale";
import { startOfWeek, format } from "date-fns";
import {
    Activity,
    BarChart3,
    Star,
    MessageSquare,
    Backpack,
    Users,
    TrendingUp,
    CalendarRange,
    PieChart,
    Trophy,
    Timer,
    Repeat,
    PlayCircle,
    Clock,
    List,
    Info,
    CheckCircle2,
    Plus
} from "lucide-react";

import { useFeedbacksSemanal } from "@/features/progreso/hooks/useFeedbacksSemanal";
import { useEvaluacionesTecnicas } from "@/features/progreso/hooks/useEvaluacionesTecnicas";
import { useIsMobile } from "@/hooks/use-mobile.jsx";

// Cast internal JSX components to any to avoid TS errors
const CardAny: any = Card;
const CardContentAny: any = CardContent;
const CardHeaderAny: any = CardHeader;
const CardTitleAny: any = CardTitle;
const StatTileAny: any = StatTile;
const RatingStarsMetricAny: any = RatingStarsMetric;
const StreakMetricAny: any = StreakMetric;
const KpiTileAny: any = KpiTile;
const UnifiedTableAny: any = UnifiedTable;
const MultiSelectAny: any = MultiSelect;
const StatsDateHeaderAny: any = StatsDateHeader;
const HabilidadesViewAny: any = HabilidadesView;
const ProgresoTabAny: any = ProgresoTab;
const PageHeaderAny: any = PageHeader;
const ResumenTabAny: any = ResumenTab;
const FeedbackUnificadoTabAny: any = FeedbackUnificadoTab;
const ModalFeedbackSemanalAny: any = ModalFeedbackSemanal;
const MediaPreviewModalAny: any = MediaPreviewModal;
const HeatmapFranjasAny: any = HeatmapFranjas;
const TiposBloquesTabAny: any = TiposBloquesTab;
const TopEjerciciosTabAny: any = TopEjerciciosTab;
const ComparativaEstudiantesAny: any = ComparativaEstudiantes;


const TabsAny: any = Tabs;
const TabsListAny: any = TabsList;
const TabsTriggerAny: any = TabsTrigger;
const TabsContentAny: any = TabsContent;
const SelectAny: any = Select;
const SelectTriggerAny: any = SelectTrigger;
const SelectContentAny: any = SelectContent;
const SelectItemAny: any = SelectItem;

// Valid tabs for normalization
const VALID_TABS = ['resumen', 'habilidades', 'estadisticas', 'mochila', 'feedback', 'comparar'];

// ============================================================================
// Main Component
// ============================================================================

export default function ProgresoPage() {
    const anyOfRoles: any = ['ESTU', 'PROF', 'ADMIN'];

    return (
        <div className="min-h-screen bg-transparent animate-in fade-in duration-500">
            <RequireRole anyOf={anyOfRoles}>
                <ProgresoPageContent />
            </RequireRole>
        </div>
    );
}

function ProgresoPageContent() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();

    // Tab state from URL with fallback to 'resumen' (Bloque 1)
    const [tabActiva, setTabActiva] = useState(() => {
        const tabFromUrl = searchParams.get('tab');
        return (tabFromUrl && VALID_TABS.includes(tabFromUrl)) ? tabFromUrl : 'resumen';
    });

    // User and role detection - use effectiveRole from new provider for impersonation
    const { effectiveUserId, effectiveEmail, effectiveRole, isImpersonating } = useEffectiveUser();
    // Objeto para compatibilidad con código existente
    const effectiveUser = { id: effectiveUserId, email: effectiveEmail, rolPersonalizado: effectiveRole };
    const isAdmin = effectiveRole === 'ADMIN';
    const isProf = effectiveRole === 'PROF';
    const isEstu = effectiveRole === 'ESTU';

    // Date range state
    const [rangoPreset, setRangoPreset] = useState('4-semanas');
    const [periodoInicio, setPeriodoInicio] = useState(() => {
        const stored = searchParams.get('inicio');
        if (stored) return stored;
        const hace4Semanas = new Date();
        hace4Semanas.setDate(hace4Semanas.getDate() - 28);
        return formatLocalDate(hace4Semanas);
    });
    const [periodoFin, setPeriodoFin] = useState(() => {
        return searchParams.get('fin') || formatLocalDate(new Date());
    });

    // Bloque 2: Unified student selector (multiselect)
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
        const raw = searchParams.get('students') || '';
        return raw ? raw.split(',').filter(Boolean) : [];
    });

    const [granularidad, setGranularidad] = useState('dia');

    // Usar hook centralizado para usuarios
    const { data: usuarios = [] } = useUsers();

    // Resolve current user ID
    const userIdActual = useMemo(() => {
        return resolveUserIdActual(effectiveUser, usuarios);
    }, [effectiveUser, usuarios]);

    // Usar hook centralizado para asignaciones
    const { data: asignacionesProf = [] } = useAsignaciones();

    const estudiantesDelProfesor = useMemo(() => {
        if (!isProf || !effectiveUser) return [];
        const misAsignaciones = asignacionesProf.filter(a =>
            a.profesorId === userIdActual &&
            (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
        );
        const alumnosIds = [...new Set(misAsignaciones.map(a => a.alumnoId))];
        return alumnosIds;
    }, [asignacionesProf, effectiveUser, isProf, userIdActual]);

    const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');

    // Available students for selector (PROF sees their students, ADMIN sees all)
    const estudiantesDisponibles = useMemo(() => {
        if (isEstu) return [];
        if (isProf) {
            return estudiantes.filter(e => estudiantesDelProfesor.includes(e.id));
        }
        return estudiantes;
    }, [isEstu, isProf, estudiantes, estudiantesDelProfesor]);

    // Available students for selector (PROF sees their students, ADMIN sees all)
    // Effective student ID for data (ESTU uses their own, PROF/ADMIN uses selected or all)
    // For single student view (e.g., Mochila), use first selected or empty
    const effectiveStudentId = useMemo(() => {
        if (isEstu) return userIdActual;
        return selectedStudentIds.length === 1 ? selectedStudentIds[0] : '';
    }, [isEstu, selectedStudentIds, userIdActual]);

    // For filtering: array of student IDs
    const alumnosSeleccionados = useMemo(() => {
        if (isEstu) return [userIdActual].filter((id): id is string => !!id);
        if (selectedStudentIds.length > 0) return selectedStudentIds;
        return []; // Empty = all students (for PROF, will be filtered by estudiantesDelProfesor)
    }, [isEstu, selectedStudentIds, userIdActual]);

    const effectiveIds = useMemo(() => {
        if (selectedStudentIds.length > 0) return selectedStudentIds;
        if (isEstu) return [userIdActual].filter((id): id is string => !!id);
        if (isProf) return estudiantesDelProfesor;
        if (isAdmin) return usuarios.filter(u => u.rolPersonalizado === 'ESTU').map(u => u.id);
        return [];
    }, [selectedStudentIds, isEstu, userIdActual, isProf, isAdmin, estudiantesDelProfesor, usuarios]);

    // Level calculation for Resumen
    const aggregateLevelGoals = useAggregateLevelGoals(effectiveIds);



    // ============================================================================
    // Data Loading - Registros y Bloques
    // ============================================================================

    const { data: progressSummary, refetch: refetchSummary } = useQuery({
        queryKey: ['progressSummary', effectiveStudentId || 'ALL'],
        queryFn: () => localDataClient.getProgressSummary((effectiveStudentId || '') as string),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false
    });

    const {
        xpTotals = [],
        registrosSesion: registros = []
    } = progressSummary || {};

    const { data: feedbacksSemanal = [], refetch: refetchFeedbacksHook } = useFeedbacksSemanal();
    const { data: evaluacionesTecnicas = [] } = useEvaluacionesTecnicas();

    // Maintain compatibility with existing refetch calls
    const refetchFeedbacks = () => {
        refetchSummary();
        refetchFeedbacksHook();
    };

    const deleteFeedbackMutation = useMutation({
        mutationFn: async (id: string) => {
            return await localDataClient.entities.FeedbackSemanal.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedbacksSemanal'] });
            queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
            toast.success('✅ Feedback eliminado');
        },
        onError: () => {
            toast.error('❌ Error al eliminar feedback');
        },
    });

    const handleDeleteFeedback = (id: string) => {
        deleteFeedbackMutation.mutate(id);
    };

    const registrosSesionValidos = useMemo(
        () => registros.filter((r: any) => r.calificacion != null),
        [registros]
    );

    // ============================================================================
    // Filter registros
    // ============================================================================

    const registrosFiltrados = useMemo(() => {
        let filtered = registrosSesionValidos
            .filter((r: RegistroSesion) => {
                const duracion = safeNumber(r.duracionRealSeg);
                return duracion > 0 && duracion <= 43200;
            })
            .map((r: RegistroSesion) => ({
                ...r,
                duracionRealSeg: safeNumber(r.duracionRealSeg),
                duracionObjetivoSeg: safeNumber(r.duracionObjetivoSeg),
                bloquesCompletados: safeNumber(r.bloquesCompletados),
                bloquesOmitidos: safeNumber(r.bloquesOmitidos),
                calificacion: r.calificacion != null ? safeNumber(r.calificacion) : null,
                inicioISO: r.inicioISO || '',
                finISO: r.finISO || ''
            }));

        const targetId = effectiveStudentId || userIdActual;

        if (isEstu) {
            filtered = filtered.filter((r: any) => r.alumnoId === targetId);
        } else if (isProf) {
            if (alumnosSeleccionados.length > 0) {
                filtered = filtered.filter((r: any) => alumnosSeleccionados.includes(r.alumnoId));
            } else {
                filtered = filtered.filter((r: any) => estudiantesDelProfesor.includes(r.alumnoId));
            }
        } else if (isAdmin) {
            if (alumnosSeleccionados.length > 0) {
                filtered = filtered.filter((r: any) => alumnosSeleccionados.includes(r.alumnoId));
            }
        }

        // Filter by date range
        if (periodoInicio) {
            const inicioDate = parseLocalDate(periodoInicio);
            filtered = filtered.filter((r: RegistroSesion) => {
                if (!r.inicioISO) return false;
                const registroDate = new Date(r.inicioISO);
                const registroLocal = new Date(registroDate.getFullYear(), registroDate.getMonth(), registroDate.getDate());
                return registroLocal >= inicioDate;
            });
        }
        if (periodoFin) {
            const finDate = parseLocalDate(periodoFin);
            finDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((r: any) => {
                if (!r.inicioISO) return false;
                const registroDate = new Date(r.inicioISO);
                return registroDate <= finDate;
            });
        }
        // Redundant block removed (it was already filtered above by alumnosSeleccionados)

        return filtered;
    }, [registrosSesionValidos, isEstu, isProf, userIdActual, alumnosSeleccionados, estudiantesDelProfesor, estudiantes, periodoInicio, periodoFin]);

    // Unique registros
    const registrosFiltradosUnicos = useMemo(() => {
        const map = new Map<string, any>();
        registrosFiltrados.forEach((r: any) => {
            if (!r || !r.id) return;
            if (!map.has(r.id)) {
                map.set(r.id, r);
            }
        });
        return Array.from(map.values());
    }, [registrosFiltrados]);

    // Auto-update granularity when date range changes
    // Moved here to rely on registrosFiltradosUnicos
    useEffect(() => {
        let start = periodoInicio;
        let end = periodoFin;

        // If "Todo" mode (null dates), infer from data to choose correct bucket
        if ((!start || !end) && registrosFiltradosUnicos.length > 0) {
            const timestamps = registrosFiltradosUnicos
                .map(r => r.inicioISO ? new Date(r.inicioISO).getTime() : null)
                .filter(t => t !== null && !isNaN(t));

            if (timestamps.length > 0) {
                if (!start) start = formatLocalDate(new Date(Math.min(...(timestamps as number[]))));
                if (!end) end = formatLocalDate(new Date(Math.max(...(timestamps as number[]))));
            }
        }

        const bucket = chooseBucket(start, end);
        setGranularidad(bucket.mode);
    }, [periodoInicio, periodoFin, registrosFiltradosUnicos]);

    const bloquesFiltrados = useMemo(() => {
        return registrosFiltradosUnicos.flatMap((r: any) => {
            const bloques = r.registrosBloque || [];
            return bloques.map((b: any) => ({ // Changed from filter to map to transform each block
                ...b,
                duracionRealSeg: safeNumber(b.duracionRealSeg),
                duracionObjetivoSeg: safeNumber(b.duracionObjetivoSeg),
                // Asegurar que tenga el registroSesionId por si acaso (aunque venga anidado)
                registroSesionId: r.id,
                // Heredar inicioISO del registro si el bloque no lo tiene
                inicioISO: b.inicioISO || r.inicioISO,
            }));
        });
    }, [registrosFiltradosUnicos]);

    // ============================================================================
    // Use estadisticas hook for KPIs
    // ============================================================================

    const estadisticas = useEstadisticas({
        registrosFiltradosUnicos,
        bloquesFiltrados,
        periodoInicio,
        periodoFin,
        granularidad,
        isEstu,
        userIdActual: (effectiveStudentId || userIdActual) as string,
    });

    const { kpis, datosLinea, tiposBloques, topEjercicios, tiempoRealVsObjetivo } = estadisticas;

    // ============================================================================
    // Feedback filtering
    // ============================================================================

    const feedbackProfesor = useMemo(() => {
        const targetId = effectiveStudentId || userIdActual;
        if (!targetId) return [];

        const filtrados = feedbacksSemanal.filter((f: FeedbackSemanal) => { // Type function parameters
            if (f.alumnoId !== targetId) return false;

            const createdAt = f.created_at;
            const updatedAt = f.updated_at || createdAt;

            if (!createdAt) return false;

            // Use the most recent date (updated if different, otherwise created)
            const fechaRelevante = updatedAt && updatedAt !== createdAt ? updatedAt : createdAt;
            if (!fechaRelevante) return false;

            // Apply same filtering logic as sessions
            const feedbackDate = new Date(fechaRelevante);
            const feedbackDateOnly = new Date(feedbackDate.getFullYear(), feedbackDate.getMonth(), feedbackDate.getDate());

            if (periodoInicio) {
                const inicioDate = parseLocalDate(periodoInicio);
                if (feedbackDateOnly < inicioDate) {
                    return false;
                }
            }

            if (periodoFin) {
                const finDate = parseLocalDate(periodoFin);
                finDate.setHours(23, 59, 59, 999);
                if (feedbackDate > finDate) {
                    return false;
                }
            }

            return true;
        });

        return filtrados.sort((a: FeedbackSemanal, b: FeedbackSemanal) => { // Type function parameters
            const aUpdated = a.updated_at || a.created_at || '';
            const bUpdated = b.updated_at || b.created_at || '';
            return bUpdated.localeCompare(aUpdated);
        });
    }, [feedbacksSemanal, effectiveStudentId, userIdActual, periodoInicio, periodoFin]);

    const feedbacksParaProfAdmin = useMemo(() => {
        if (isEstu) return [];

        let resultado = [...feedbacksSemanal];

        if (alumnosSeleccionados.length > 0 && alumnosSeleccionados[0]) {
            resultado = resultado.filter((f: FeedbackSemanal) => alumnosSeleccionados.includes(f.alumnoId)); // Type function parameters
        } else if (isProf && estudiantesDelProfesor.length > 0) {
            resultado = resultado.filter((f: FeedbackSemanal) => estudiantesDelProfesor.includes(f.alumnoId)); // Type function parameters
        }

        if (periodoInicio || periodoFin) {
            resultado = resultado.filter((f: FeedbackSemanal) => {
                // Check multiple possible date field names (snake_case and camelCase)
                const createdAt = (f as any).created_at || (f as any).createdAt;
                const updatedAt = (f as any).updated_at || (f as any).updatedAt || createdAt;

                // Use semanaInicioISO as fallback date reference
                const semanaInicio = (f as any).semanaInicioISO;

                // Determine the best date to use for filtering
                const fechaRelevante = updatedAt || createdAt || semanaInicio;

                if (!fechaRelevante) {
                    // When filtering is active, exclude feedbacks without any date
                    console.log('[FeedbackFilter] Excluding feedback without any date field:', f.id);
                    return false;
                }

                // Apply same filtering logic as sessions
                const feedbackDate = new Date(fechaRelevante);
                const feedbackDateOnly = new Date(feedbackDate.getFullYear(), feedbackDate.getMonth(), feedbackDate.getDate());

                if (periodoInicio) {
                    const inicioDate = parseLocalDate(periodoInicio);
                    if (feedbackDateOnly < inicioDate) {
                        return false;
                    }
                }

                if (periodoFin) {
                    const finDate = parseLocalDate(periodoFin);
                    finDate.setHours(23, 59, 59, 999);
                    if (feedbackDate > finDate) {
                        return false;
                    }
                }

                return true;
            });
        }

        // Add student name
        resultado = resultado.map((f: FeedbackSemanal) => { // Type function parameters
            const alumno = usuarios.find(u => u.id === f.alumnoId);
            return {
                ...f,
                alumnoNombre: alumno ? displayName(alumno) : f.alumnoId || 'N/A'
            };
        });

        resultado.sort((a: FeedbackSemanal, b: FeedbackSemanal) => { // Type function parameters
            const fechaA = a.updated_at || a.created_at || ''; // Fixed FeedbackSemanal properties
            const fechaB = b.updated_at || b.created_at || ''; // Fixed FeedbackSemanal properties
            return fechaB.localeCompare(fechaA);
        });

        return resultado;
    }, [feedbacksSemanal, alumnosSeleccionados, estudiantesDelProfesor, periodoInicio, periodoFin, isEstu, isProf, usuarios]);



    const usuariosMap = useMemo(() => {
        const map: Record<string, any> = {};
        usuarios.forEach(u => { map[u.id] = u; });
        return map;
    }, [usuarios]);

    // Helper function to calculate streak (reutilized from estadisticas.jsx)
    const calcularRacha = (registros: any[], alumnoId: string | null = null) => {
        const targetRegistros = registros
            .filter((r: any) => (!alumnoId || r.alumnoId === alumnoId) && (r.duracionRealSeg || 0) >= 60);

        if (targetRegistros.length === 0) return { actual: 0, maxima: 0 };

        const diasSet = new Set<string>();
        targetRegistros.forEach((r: RegistroSesion) => {
            if (r.inicioISO) {
                const fecha = new Date(r.inicioISO);
                const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
                const diaISO = formatLocalDate(fechaLocal);
                diasSet.add(diaISO);
            }
        });

        if (diasSet.size === 0) return { actual: 0, maxima: 0 };

        const diasArraySortedDesc = Array.from(diasSet).sort((a: string, b: string) => b.localeCompare(a));
        const diasArraySortedAsc = Array.from(diasSet).sort((a: string, b: string) => {
            return parseLocalDate(a).getTime() - parseLocalDate(b).getTime();
        });
        let rachaActual = 0;
        const hoy = formatLocalDate(new Date());
        const ayer = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return formatLocalDate(d);
        })();

        if (diasArraySortedDesc.length > 0) {
            const lastPracticeDay = diasArraySortedDesc[0];
            if (lastPracticeDay === hoy || lastPracticeDay === ayer) {
                rachaActual = 1;
                for (let i = 1; i < diasArraySortedAsc.length; i++) {
                    const currentDate = parseLocalDate(diasArraySortedAsc[i] as string);
                    const previousDate = parseLocalDate(diasArraySortedAsc[i - 1] as string);
                    const diffDays = Math.round((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        rachaActual++;
                    } else if (diffDays > 1) {
                        break;
                    }
                }
            }
        }

        let rachaMaxima = 1;
        if (diasArraySortedAsc.length > 0) {
            let currentMaxStreak = 1;

            for (let i = 1; i < (diasArraySortedAsc as string[]).length; i++) {
                const currentDate = parseLocalDate((diasArraySortedAsc as string[])[i]);
                const previousDate = parseLocalDate((diasArraySortedAsc as string[])[i - 1]);
                const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentMaxStreak++;
                } else if (diffDays > 1) {
                    currentMaxStreak = 1;
                }
                rachaMaxima = Math.max(rachaMaxima, currentMaxStreak);
            }
        }

        return { actual: rachaActual, maxima: rachaMaxima };
    };

    // Calculate student comparison data (for PROF/ADMIN Comparar tab)
    const estudiantesComparacion = useMemo(() => {
        if (isEstu) return [];

        // Get student IDs to compare
        const estudiantesIds = (alumnosSeleccionados.length > 0 && alumnosSeleccionados[0])
            ? alumnosSeleccionados
            : (isProf && estudiantesDelProfesor.length > 0)
                ? estudiantesDelProfesor
                : (estudiantes || []).map((e: any) => e.id);

        return estudiantesIds.map(alumnoId => {
            const registrosEstudiante = registrosFiltradosUnicos.filter(r => r.alumnoId === alumnoId);

            // Calculate metrics for each student
            const tiempoTotal = registrosEstudiante.reduce((sum, r) => {
                const duracion = safeNumber((r as any).duracionRealSeg);
                return sum + (duracion > 0 && duracion <= 43200 ? duracion : 0);
            }, 0);

            const numSesiones = registrosEstudiante.length;

            let mediaSemanalSesiones = 0;
            if (periodoInicio && periodoFin) {
                const inicio = parseLocalDate(periodoInicio);
                const fin = parseLocalDate(periodoFin);
                const diffMs = fin.getTime() - inicio.getTime();
                const numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
                mediaSemanalSesiones = numDias > 0 ? (numSesiones / numDias) * 7 : 0;
            }

            const conCalificacion = registrosEstudiante.filter(r => {
                const cal = safeNumber((r as any).calificacion);
                return cal > 0 && cal <= 4;
            });
            const calificacionPromedio = conCalificacion.length > 0
                ? (conCalificacion.reduce((acc, r) => acc + safeNumber((r as any).calificacion), 0) / conCalificacion.length).toFixed(1)
                : '0.0';

            const totalCompletados = registrosEstudiante.reduce((sum, r) =>
                sum + safeNumber((r as any).bloquesCompletados), 0
            );
            const totalOmitidos = registrosEstudiante.reduce((sum, r) =>
                sum + safeNumber((r as any).bloquesOmitidos), 0
            );
            const ratioCompletado = (totalCompletados + totalOmitidos) > 0
                ? Number(((totalCompletados / (totalCompletados + totalOmitidos)) * 100).toFixed(1))
                : 0;

            const racha = (calcularRacha as any)(registrosEstudiante, null);

            return {
                id: alumnoId,
                tiempoTotal,
                sesiones: numSesiones,
                sesionesPorSemana: mediaSemanalSesiones,
                calificacionPromedio,
                ratioCompletado,
                racha: racha.actual,
                rachaMaxima: racha.maxima,
            };
        });
    }, [isEstu, isProf, alumnosSeleccionados, estudiantesDelProfesor, estudiantes, registrosFiltradosUnicos, periodoInicio, periodoFin]);

    // ============================================================================
    // URL Sync
    // ============================================================================

    useEffect(() => {
        const params: any = {};
        if (tabActiva !== 'resumen') params.tab = tabActiva;
        if (periodoInicio) params.inicio = periodoInicio;
        if (periodoFin) params.fin = periodoFin;
        if (!isEstu && (selectedStudentIds || []).length > 0) params.students = selectedStudentIds.join(',');
        setSearchParams(params, { replace: true });
    }, [tabActiva, periodoInicio, periodoFin, selectedStudentIds, isEstu, setSearchParams]);

    // ============================================================================
    // Preset Application
    // ============================================================================

    const aplicarPreset = (preset: string) => {
        const hoy = new Date();
        let inicio, fin;

        switch (preset) {
            case 'esta-semana':
                inicio = startOfMonday(hoy);
                fin = hoy;
                break;
            case '4-semanas':
                inicio = new Date(hoy);
                inicio.setDate(inicio.getDate() - 28);
                fin = hoy;
                break;
            case 'este-mes':
                inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                fin = hoy;
                break;
            case '3-meses':
                inicio = new Date(hoy);
                inicio.setMonth(inicio.getMonth() - 3);
                fin = hoy;
                break;
            case 'todo':
                inicio = null;
                fin = null;
                break;
            default:
                inicio = null;
                fin = null;
                break;
        }

        setPeriodoInicio(inicio ? formatLocalDate(inicio) : '');
        setPeriodoFin(fin ? formatLocalDate(fin) : '');
        setRangoPreset(preset);
    };

    // ============================================================================
    // Tab config
    // ============================================================================

    // Build tab items, conditionally including Comparar for PROF/ADMIN
    const tabItems = [
        { value: 'resumen', label: 'Resumen', icon: BarChart3 },
        { value: 'habilidades', label: 'Habilidades', icon: Star },
        { value: 'estadisticas', label: 'Estadísticas', icon: Activity },
        { value: 'mochila', label: 'Mochila', icon: Backpack },
        { value: 'feedback', label: 'Feedback', icon: MessageSquare },
        // Comparar tab only for PROF/ADMIN
        ...((isProf || isAdmin) ? [{ value: 'comparar', label: 'Comparar', icon: Users }] : []),
    ];

    const presets = [
        { key: 'esta-semana', label: 'Semana' },
        { key: '4-semanas', label: '4 sem' },
        { key: 'este-mes', label: 'Mes' },
        { key: '3-meses', label: '3 meses' },
        { key: 'todo', label: 'Todo' },
    ];



    // ============================================================================
    // Render
    // ============================================================================

    // ============================================================================
    // Modal Feedback Logic
    // ============================================================================
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [feedbackWeekInfo, setFeedbackWeekInfo] = useState({ startISO: '', label: '' });

    // Media Preview State


    const handleCreateFeedback = () => {
        // Default to current week
        const now = new Date();
        const monday = startOfWeek(now, { weekStartsOn: 1 });
        const mondayISO = format(monday, 'yyyy-MM-dd');
        const endWeek = new Date(monday);
        endWeek.setDate(endWeek.getDate() + 6);
        const label = `Semana del ${format(monday, 'd MMM', { locale: es })} al ${format(endWeek, 'd MMM', { locale: es })}`;

        setSelectedFeedback(null);
        setFeedbackWeekInfo({ startISO: mondayISO, label });
        setFeedbackModalOpen(true);
    };

    const handleEditFeedback = (feedback: any) => {
        const mondayISO = feedback.semanaInicioISO;
        const monday = parseLocalDate(mondayISO);
        const endWeek = new Date(monday);
        endWeek.setDate(endWeek.getDate() + 6);
        const label = `Semana del ${format(monday, 'd MMM', { locale: es })} al ${format(endWeek, 'd MMM', { locale: es })}`;

        setSelectedFeedback(feedback);
        setFeedbackWeekInfo({ startISO: mondayISO, label });
        setFeedbackModalOpen(true);
    };

    // ============================================================================
    // Media & Modal Handling
    // ============================================================================

    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaModalIndex, setMediaModalIndex] = useState(0);
    const [mediaModalLinks, setMediaModalLinks] = useState<any[]>([]);

    const handleMediaClick = (mediaLinks: any[], initialIndex = 0) => {
        setMediaModalLinks(mediaLinks);
        setMediaModalIndex(initialIndex);
        setMediaModalOpen(true);
    };

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header: Using PageHeader for consistency */}
            <PageHeaderAny
                icon={Activity}
                title="Progreso"
                subtitle="Seguimiento detallado de tu evolución musical"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Range Picker */}
                        <StatsDateHeaderAny
                            startDate={periodoInicio}
                            endDate={periodoFin}
                            onDateChange={({ from, to }: { from: string | null; to: string | null }) => {
                                setPeriodoInicio(from || '');
                                setPeriodoFin(to || '');
                                if (from || to) setRangoPreset('personalizado');
                            }}
                            presets={presets}
                        />
                        {/* Student Selector - Only for PROF/ADMIN */}
                        {(isProf || isAdmin) && (
                            <MultiSelectAny
                                items={estudiantesDisponibles.map((e: any) => ({ value: e.id, label: displayName(e) }))}
                                value={selectedStudentIds}
                                onChange={setSelectedStudentIds}
                                label="Alumnos"
                                className="w-full md:w-[220px]"
                            />
                        )}
                    </div>
                }
            />

            {/* Navigation Tabs (Bloque 1) - Manual State Management */}
            <div className="studia-section">
                {/* Mobile Tab Select */}
                <div className="md:hidden w-full mb-4">
                    <SelectAny value={tabActiva} onValueChange={setTabActiva} >
                        <SelectTriggerAny className="w-full">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const activeItem = tabItems.find(t => t.value === tabActiva);
                                    const Icon = activeItem?.icon || BarChart3;
                                    return (
                                        <>
                                            <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                                            <span>{activeItem?.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </SelectTriggerAny>
                        <SelectContentAny className="w-[var(--radix-select-content-width)]">
                            {tabItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <SelectItemAny key={item.value} value={item.value}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                            <span>{item.label}</span>
                                        </div>
                                    </SelectItemAny>
                                );
                            })}
                        </SelectContentAny>
                    </SelectAny>
                </div>

                {/* Desktop/Tablet Tabs List - Using design system styles */}
                <div className={cn(componentStyles.tabs.tabsSegmentedContainer, "hidden md:inline-flex mb-6")} data-testid="tabs-segmented">
                    {tabItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = tabActiva === item.value;
                        return (
                            <button
                                key={item.value}
                                onClick={() => setTabActiva(item.value)}
                                className={cn(
                                    componentStyles.tabs.tabsSegmentedItem,
                                    "flex flex-col items-center gap-1",
                                    isActive && componentStyles.tabs.tabsSegmentedItemActive
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]")} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* ============================================================================
                   Tab Content Panes
                   ============================================================================ */}

                {/* 1. RESUMEN TAB */}
                {tabActiva === 'resumen' && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        <ResumenTabAny
                            kpis={kpis}
                            datosLinea={datosLinea}
                            heatmapData={estadisticas.heatmapData}
                            periodoInicio={periodoInicio}
                            periodoFin={periodoFin}
                            registrosFiltrados={registrosFiltradosUnicos}
                            user={(isEstu && userIdActual) ? usuariosMap[userIdActual] : null}
                            aggregateLevelGoals={aggregateLevelGoals}
                            // Props for HabilidadesView
                            alumnosSeleccionados={effectiveIds}
                            allStudentIds={estudiantes.map(e => e.id)}
                            userIdActual={userIdActual}
                            fechaInicio={periodoInicio}
                            fechaFin={periodoFin}
                            xpData={registrosFiltradosUnicos}
                            evaluations={evaluacionesTecnicas}
                            feedbacks={feedbacksSemanal}
                            users={usuarios}
                        />
                    </div>
                )}

                {/* 2. HABILIDADES TAB */}
                {tabActiva === 'habilidades' && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        <HabilidadesViewAny
                            alumnosSeleccionados={effectiveIds}
                            userIdActual={userIdActual}
                            xpData={registrosFiltradosUnicos}
                            evaluations={evaluacionesTecnicas}
                            users={usuarios}
                            fechaInicio={periodoInicio}
                            fechaFin={periodoFin}
                        />
                    </div>
                )}

                {/* 3. ESTADISTICAS TAB */}
                {tabActiva === 'estadisticas' && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        {/* Subtabs for Estadisticas */}
                        <TabsAny defaultValue="progreso" className="w-full">
                            <TabsListAny className="justify-start bg-[var(--color-surface-muted)] p-1 rounded-lg w-full sm:w-auto mb-6 overflow-x-auto h-auto">
                                {[
                                    { id: 'progreso', label: 'Evolución', icon: TrendingUp },
                                    { id: 'tipos', label: 'Distribución', icon: PieChart },
                                    { id: 'ejercicios', label: 'Top Ejercicios', icon: Trophy },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <TabsTriggerAny
                                            key={tab.id}
                                            value={tab.id}
                                            className="px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap text-[var(--color-text-secondary)] data-[state=active]:bg-[var(--color-surface-elevated)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-sm transition-all"
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                        </TabsTriggerAny>
                                    );
                                })}
                            </TabsListAny>

                            <TabsContentAny value="progreso" className="space-y-6">
                                <ProgresoTabAny
                                    datosLinea={datosLinea}
                                    registrosFiltrados={registrosFiltradosUnicos}
                                    periodoInicio={periodoInicio}
                                    periodoFin={periodoFin}
                                    granularidad={granularidad}
                                    kpis={kpis}
                                />
                            </TabsContentAny>

                            <TabsContentAny value="tipos" className="space-y-6">
                                <TiposBloquesTabAny
                                    tiposBloques={tiposBloques}
                                    tiempoRealVsObjetivo={tiempoRealVsObjetivo}
                                />
                            </TabsContentAny>
                            <TabsContentAny value="ejercicios" className="space-y-6">
                                <TopEjerciciosTabAny
                                    topEjercicios={topEjercicios}
                                />
                            </TabsContentAny>

                        </TabsAny>
                    </div>
                )}

                {/* 4. MOCHILA TAB */}
                {tabActiva === 'mochila' && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        {/* Require single student selection */}
                        {!effectiveStudentId ? (
                            <CardAny className={componentStyles.components.cardBase}>
                                <EmptyState
                                    icon={<Backpack className="w-12 h-12 text-muted-foreground" />}
                                    title="Selecciona un Estudiante"
                                    description={isEstu
                                        ? "Tu mochila muestra el estado actual de todos tus ejercicios y piezas."
                                        : "Selecciona un estudiante arriba para ver su mochila de práctica."
                                    }
                                />
                            </CardAny>
                        ) : (
                            <MochilaViewContent
                                studentId={effectiveStudentId}
                                navigate={navigate}
                            />
                        )}
                    </div>
                )}

                {/* 5. FEEDBACK TAB */}
                {tabActiva === 'feedback' && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        <FeedbackUnificadoTabAny
                            feedbacks={isEstu ? feedbacksSemanal : feedbacksParaProfAdmin}
                            evaluaciones={[]} // Legacy support
                            registros={registrosFiltradosUnicos.filter(r => r.calificacion)} // Sessions with rating
                            usuarios={usuarios}
                            isEstu={isEstu}
                            onMediaClick={handleMediaClick}
                            isMediaModalOpen={mediaModalOpen}
                            onEditFeedback={handleEditFeedback}
                            onDeleteFeedback={handleDeleteFeedback}
                            userIdActual={userIdActual}
                            userRole={effectiveRole}
                            actionButton={
                                (isProf || isAdmin) ? (
                                    <Button size="sm" onClick={handleCreateFeedback}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Nuevo Feedback
                                    </Button>
                                ) : null
                            }
                        />
                    </div>
                )}

                {/* 6. COMPARAR TAB (Admin/Prof only) */}
                {tabActiva === 'comparar' && (isProf || isAdmin) && (
                    <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                        <ComparativaEstudiantes
                            estudiantes={estudiantesComparacion}
                            usuarios={usuarios}
                        />
                    </div>
                )}

            </div>

            {/* Global Media Modal */}
            <MediaPreviewModalAny
                isOpen={mediaModalOpen}
                onClose={() => setMediaModalOpen(false)}
                mediaLinks={mediaModalLinks}
                initialIndex={mediaModalIndex}
            />

            {/* Modal para Crear/Editar Feedback Semanal (Controlado) */}
            {(isProf || isAdmin) && (
                <ModalFeedbackSemanalAny
                    open={feedbackModalOpen}
                    onOpenChange={setFeedbackModalOpen}
                    feedback={selectedFeedback}
                    usuarios={usuarios}
                    userIdActual={userIdActual}
                    userRole={effectiveRole}
                    onFeedbackSaved={() => refetchFeedbacks()}
                    defaultStudentId={alumnosSeleccionados[0] || ''}
                />
            )}

        </div>
    );
}

