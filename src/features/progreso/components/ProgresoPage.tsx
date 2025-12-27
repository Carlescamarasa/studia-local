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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { useUsers } from "@/hooks/entities/useUsers";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { resolveUserIdActual, displayName } from "@/components/utils/helpers";
import { toast } from "sonner";
import { createManualSessionDraft } from '@/services/manualSessionService';
import { updateBackpackFromSession } from '@/shared/services/backpackService';
import { getDerivedBackpackStatus } from '@/shared/services/backpackDerivedStatus';
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
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, PageHeader } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import MultiSelect from "@/components/ui/MultiSelect";
import StatsDateHeader from "./StatsDateHeader";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Tab Components (reutilizados)
import ResumenTab from "./ResumenTab";
import ProgresoTab from "./ProgresoTab";
import HabilidadesView from "./HabilidadesView";
import FeedbackUnificadoTab from "./FeedbackUnificadoTab";
import LevelBadge from "@/components/common/LevelBadge";
import TabBoundary from "@/components/common/TabBoundary";
import UnifiedTable from "@/components/tables/UnifiedTable";

import TotalXPDisplay from "./TotalXPDisplay";
import HabilidadesRadarChart from "./HabilidadesRadarChart";
import HeatmapFranjas from "./HeatmapFranjas";
import StatTile from "./StatTile";
import CompactCard from "./CompactCard";

// New imports for Estadísticas subtabs
import TiposBloquesTab from "./TiposBloquesTab";
import TopEjerciciosTab from "./TopEjerciciosTab";
import AutoevaluacionesTab from "./AutoevaluacionesTab";
import ComparativaEstudiantes from "./ComparativaEstudiantes";
import ModalFeedbackSemanal from "@/components/calendario/ModalFeedbackSemanal";
import StreakMetric from "./StreakMetric";
import RatingStarsMetric from "./RatingStarsMetric";

// Icons
import {
    Activity, BarChart3, Star, MessageSquare, Backpack, Target,
    Clock, Trophy, ChevronDown, ChevronUp, Filter, User, TrendingUp,
    Layers, List, Users, Info, BookOpen, PieChart, Timer, CalendarRange, Repeat,
    PlayCircle, CheckCircle2
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { startOfWeek, endOfWeek, format, isSameDay } from 'date-fns';
import { StudiaUser, RegistroSesion, RegistroBloque, FeedbackSemanal, StudentBackpackItem } from "@/shared/types/domain";
import RequireRole from "@/components/auth/RequireRole";
import { toStudia } from "@/lib/routes";
import { es } from "date-fns/locale";

import { useFeedbacksSemanal } from "@/hooks/entities/useFeedbacksSemanal";

import KpiTile from "./KpiTile";
import MediaPreviewModal from "@/shared/components/media/MediaPreviewModal";

// Cast internal JSX components to any to avoid TS errors
const CardAny = Card as any;
const CardContentAny = CardContent as any;
const CardHeaderAny = CardHeader as any;
const CardTitleAny = CardTitle as any;
const StatTileAny = StatTile as any;
const RatingStarsMetricAny = RatingStarsMetric as any;
const StreakMetricAny = StreakMetric as any;
const KpiTileAny = KpiTile as any;
const UnifiedTableAny = UnifiedTable as any;
const MultiSelectAny = MultiSelect as any;
const StatsDateHeaderAny = StatsDateHeader as any;
const HabilidadesViewAny = HabilidadesView as any;
const ProgresoTabAny = ProgresoTab as any;
const PageHeaderAny = PageHeader as any;
const ResumenTabAny = ResumenTab as any;
const FeedbackUnificadoTabAny = FeedbackUnificadoTab as any;
const ModalFeedbackSemanalAny = ModalFeedbackSemanal as any;
const MediaPreviewModalAny = MediaPreviewModal as any;

// Valid tabs for normalization
const VALID_TABS = ['resumen', 'habilidades', 'estadisticas', 'mochila', 'feedback', 'comparar'];

// ============================================================================
// Main Component
// ============================================================================

export default function ProgresoPage() {
    const anyOfRoles: any = ['ESTU', 'PROF', 'ADMIN'];

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
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
        if (!effectiveStudentId && isProf) return estudiantesDelProfesor;
        if (!effectiveStudentId && isAdmin) return usuarios.filter(u => u.rolPersonalizado === 'ESTU').map(u => u.id);
        return effectiveStudentId ? [effectiveStudentId] : [];
    }, [effectiveStudentId, isProf, isAdmin, estudiantesDelProfesor, usuarios]);

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
        evaluacionesTecnicas = [],
        registrosSesion: registros = []
    } = progressSummary || {};

    const { data: feedbacksSemanal = [], refetch: refetchFeedbacksHook } = useFeedbacksSemanal();

    // Maintain compatibility with existing refetch calls
    const refetchFeedbacks = () => {
        refetchSummary();
        refetchFeedbacksHook();
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

            if (periodoInicio) {
                const inicioDate = parseLocalDate(periodoInicio);
                const createdDate = new Date(createdAt);
                const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                const updatedDate = new Date(updatedAt);
                const updatedDateOnly = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());

                if (createdDateOnly < inicioDate && updatedDateOnly < inicioDate) {
                    return false;
                }
            }

            if (periodoFin) {
                const finDate = parseLocalDate(periodoFin);
                const createdDate = new Date(createdAt);
                const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                const updatedDate = new Date(updatedAt);
                const updatedDateOnly = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());

                if (createdDateOnly > finDate && updatedDateOnly > finDate) {
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
            resultado = resultado.filter((f: FeedbackSemanal) => { // Type function parameters
                const createdAt = f.created_at;
                const updatedAt = f.updated_at || createdAt;

                if (!createdAt) return true;

                const createdDate = new Date(createdAt);
                const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                const updatedDate = new Date(updatedAt);
                const updatedDateOnly = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());

                if (periodoInicio) {
                    const inicioDate = parseLocalDate(periodoInicio);
                    if (createdDateOnly < inicioDate && updatedDateOnly < inicioDate) {
                        return false;
                    }
                }

                if (periodoFin) {
                    const finDate = parseLocalDate(periodoFin);
                    if (createdDateOnly > finDate && updatedDateOnly > finDate) {
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

    const evaluacionesFiltradas = useMemo(() => {
        let resultado = [...evaluacionesTecnicas];

        if (effectiveStudentId) {
            resultado = resultado.filter(e => e.alumnoId === effectiveStudentId);
        } else if (isEstu) {
            resultado = resultado.filter(e => e.alumnoId === userIdActual);
        } else if (alumnosSeleccionados.length > 0 && alumnosSeleccionados[0]) {
            resultado = resultado.filter(e => alumnosSeleccionados.includes(e.alumnoId));
        }

        if (periodoInicio || periodoFin) {
            resultado = resultado.filter(e => {
                const fechaEval = e.fecha || e.created_at;
                if (!fechaEval) return true;

                const evalDate = parseLocalDate(fechaEval.split('T')[0]);

                if (periodoInicio) {
                    const inicioDate = parseLocalDate(periodoInicio);
                    if (evalDate < inicioDate) return false;
                }

                if (periodoFin) {
                    const finDate = parseLocalDate(periodoFin);
                    if (evalDate > finDate) return false;
                }

                return true;
            });
        }

        resultado.sort((a, b) => {
            const fechaA = a.createdAt || a.created_at || '';
            const fechaB = b.createdAt || b.created_at || '';
            return fechaB.localeCompare(fechaA);
        });

        return resultado;
    }, [evaluacionesTecnicas, effectiveStudentId, userIdActual, alumnosSeleccionados, periodoInicio, periodoFin, isEstu]);

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
                ? ((totalCompletados / (totalCompletados + totalOmitidos)) * 100).toFixed(1)
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
    const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [previewMediaLinks, setPreviewMediaLinks] = useState<string[]>([]);

    const handleMediaClick = (mediaLinks: string[] | any, index = 0) => {
        if (!mediaLinks || mediaLinks.length === 0) {
            return;
        }
        setPreviewMediaLinks(mediaLinks);
        setSelectedMediaIndex(index);
        setMediaPreviewOpen(true);
    };

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
        let mondayISO = feedback.semanaInicioISO;
        let label = "Semana seleccionada";

        if (mondayISO) {
            const monday = new Date(mondayISO);
            const endWeek = new Date(monday);
            endWeek.setDate(endWeek.getDate() + 6);
            label = `Semana del ${format(monday, 'd MMM', { locale: es })} al ${format(endWeek, 'd MMM', { locale: es })}`;
        }

        setSelectedFeedback(feedback);
        setFeedbackWeekInfo({ startISO: mondayISO, label });
        setFeedbackModalOpen(true);
    };

    const handleFeedbackSaved = () => {
        refetchFeedbacks();
        queryClient.invalidateQueries({ queryKey: ['calendarSummary'] });
        setFeedbackModalOpen(false);
    };

    return (
        <div className={componentStyles.layout.appBackground}>
            <PageHeaderAny
                icon={Target}
                title="Progreso"
                subtitle={isEstu ? 'Tu evolución y logros' : 'Seguimiento del progreso de estudiantes'}
                actions={
                    <>
                        {/* Bloque 2: Unified student selector - always visible for PROF/ADMIN */}
                        {(isProf || isAdmin) && (
                            <MultiSelectAny
                                label={selectedStudentIds.length === 0 ? "Todos los alumnos" : "Alumnos"}
                                icon={User}
                                items={estudiantesDisponibles.map(s => ({
                                    value: s.id,
                                    label: displayName(s)
                                }))}
                                value={selectedStudentIds}
                                onChange={setSelectedStudentIds}
                            />
                        )}
                        <StatsDateHeaderAny
                            startDate={periodoInicio}
                            endDate={periodoFin}
                            onDateChange={(range: any) => {
                                setPeriodoInicio(range?.from);
                                setPeriodoFin(range?.to);
                                if (range?.from || range?.to) {
                                    setRangoPreset('personalizado');
                                }
                            }}
                            className="mr-2"
                        />
                    </>
                }
            />

            <div className="studia-section">
                {/* Main tabs */}
                <div className="mb-6">
                    <Tabs
                        variant="segmented"
                        value={tabActiva}
                        onChange={setTabActiva}
                        className="w-full"
                        items={tabItems}
                    />
                </div>

                {/* Tab content */}
                {tabActiva === 'resumen' && (
                    <TabResumenContent
                        kpis={kpis}
                        datosLinea={datosLinea}
                        granularidad={granularidad}
                        onGranularidadChange={setGranularidad}
                        userIdActual={(effectiveStudentId || userIdActual) as string}
                        alumnosSeleccionados={alumnosSeleccionados}
                        allStudentIds={((estudiantes || []) as any[]).map((u: any) => u.id).filter((id): id is string => !!id)}
                        xpData={xpTotals}
                        evaluations={evaluacionesTecnicas}
                        feedbacks={feedbacksSemanal}
                        users={usuarios}
                    />
                )}
                {tabActiva === 'habilidades' && (
                    <CardAny>
                        <CardContentAny className="pt-6">
                            <HabilidadesViewAny
                                alumnosSeleccionados={alumnosSeleccionados}
                                allStudentIds={((estudiantes || []) as any[]).map((u: any) => u.id).filter((id): id is string => !!id)}
                                userIdActual={userIdActual}
                                fechaInicio={periodoInicio}
                                fechaFin={periodoFin}
                                xpData={xpTotals}
                                evaluations={evaluacionesTecnicas}
                                feedbacks={feedbacksSemanal}
                                users={usuarios}
                            />
                        </CardContentAny>
                    </CardAny>
                )}
                {tabActiva === 'estadisticas' && (
                    <TabEstadisticasContent
                        kpis={kpis}
                        datosLinea={datosLinea}
                        granularidad={granularidad}
                        onGranularidadChange={setGranularidad}
                        tiempoRealVsObjetivo={tiempoRealVsObjetivo}
                        registrosFiltrados={registrosFiltradosUnicos}
                        periodoInicio={periodoInicio}
                        periodoFin={periodoFin}
                        tiposBloques={tiposBloques}
                        topEjercicios={topEjercicios}
                        bloquesFiltrados={bloquesFiltrados}
                        usuarios={usuarios}
                        userIdActual={(userIdActual || '') as string}
                        effectiveUser={effectiveUser}
                        isEstu={isEstu}
                        isProf={isProf}
                        isAdmin={isAdmin}
                        estudiantesComparacion={estudiantesComparacion}
                    />
                )}
                {tabActiva === 'mochila' && (
                    <MochilaTabContent
                        studentId={(effectiveStudentId || userIdActual) as string}
                        isEstu={isEstu}
                        hasSelectedStudent={!!effectiveStudentId}
                    />
                )}
                {tabActiva === 'feedback' && (
                    <FeedbackUnificadoTabAny
                        isProf={isProf}
                        isAdmin={isAdmin}
                        isEstu={isEstu}
                        selectedStudentIds={alumnosSeleccionados}
                        userIdActual={userIdActual}
                        feedbacks={isEstu ? feedbackProfesor : feedbacksParaProfAdmin}
                        effectiveUser={effectiveUser}
                        onEditFeedback={handleEditFeedback}
                        onCreateFeedback={handleCreateFeedback}
                        onMediaClick={handleMediaClick}
                    />
                )}
                {tabActiva === 'comparar' && (isProf || isAdmin) && (
                    <ComparativaEstudiantes
                        estudiantes={estudiantesComparacion}
                        usuarios={usuarios}
                    />
                )}
            </div>

            {/* Modal Feedback Semanal */}
            <ModalFeedbackSemanalAny
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                feedback={selectedFeedback}
                studentId={(selectedFeedback as any)?.alumnoId || effectiveStudentId || (alumnosSeleccionados.length === 1 ? alumnosSeleccionados[0] : null)}
                weekStartISO={feedbackWeekInfo.startISO}
                weekLabel={feedbackWeekInfo.label}
                onSaved={handleFeedbackSaved}
                onMediaClick={handleMediaClick}
            />

            {/* Media Preview Modal */}
            <MediaPreviewModalAny
                open={mediaPreviewOpen}
                onClose={() => setMediaPreviewOpen(false)}
                urls={previewMediaLinks}
                initialIndex={selectedMediaIndex}
            />
        </div>
    );
}

// ============================================================================
// Tab Resumen Content - Extended with XP & Toggle
// ============================================================================

interface TabResumenContentProps {
    kpis: any;
    datosLinea: any;
    granularidad: string;
    onGranularidadChange: (g: string) => void;
    userIdActual: string;
    alumnosSeleccionados?: string[];
    allStudentIds?: string[];
    xpData?: any;
    evaluations?: any;
    feedbacks?: any;
    users?: any;
}

function TabResumenContent({
    kpis, datosLinea, granularidad, onGranularidadChange, userIdActual,
    alumnosSeleccionados = [], allStudentIds = [],
    // [NEW] Data props
    xpData, evaluations, feedbacks, users
}: TabResumenContentProps) {
    return (
        <div className="space-y-4">
            {/* KPIs Bar - 6-tile uniform layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pb-4">
                {/* 1. Tiempo Total */}
                <KpiTileAny
                    icon={Timer}
                    label="Tiempo total"
                    value={formatDurationDDHHMM(kpis.tiempoTotal, 'sec')}
                    valueClassName="text-orange-500"
                />

                {/* 2. Promedio/Sesión */}
                <KpiTileAny
                    icon={Clock}
                    label="Prom/sesión"
                    value={`${Math.round((kpis.tiempoPromedioPorSesion || 0) / 60)} min`}
                />

                {/* 3. Valoración */}
                <RatingStarsMetricAny
                    value={kpis.calidadPromedio}
                    max={4}
                />

                {/* 4. Racha */}
                <StreakMetricAny
                    streakDays={kpis.racha.actual}
                    maxStreak={kpis.racha.maxima}
                />

                {/* 5. Semanas Activas */}
                <KpiTileAny
                    icon={CalendarRange}
                    label="Semanas activas"
                    value={kpis.semanasDistintas}
                    subtext="en el periodo"
                />

                {/* 6. Frecuencia Semanal */}
                <KpiTileAny
                    icon={Repeat}
                    label="Frecuencia semanal"
                    value={kpis.mediaSemanalSesiones.toFixed(1)}
                    valueClassName="text-[var(--color-success)]"
                    subtext="ses/sem · media"
                />
            </div>

            {/* Habilidades Card - Reusing HabilidadesView with accumulated XP (forma mode) */}
            <HabilidadesViewAny
                alumnosSeleccionados={alumnosSeleccionados}
                allStudentIds={allStudentIds}
                userIdActual={userIdActual}
                hideViewModeToggle={true}
                forceViewMode="forma"
                customTitle="Habilidades"
                // [NEW] Pass data props
                xpData={xpData}
                evaluations={evaluations}
                feedbacks={feedbacks}
                users={users}
            />
        </div>
    );
}

// ============================================================================
// Tab Estadísticas Content - EMBEDDED (Bloque 3) - 2 Pills: Rendimiento / Ejercicios
// ============================================================================

interface TabEstadisticasContentProps {
    kpis: any;
    datosLinea: any;
    granularidad: string;
    onGranularidadChange: (g: string) => void;
    tiempoRealVsObjetivo: any;
    registrosFiltrados: any[];
    periodoInicio: string | null;
    periodoFin: string | null;
    tiposBloques: any[];
    topEjercicios: any[];
    bloquesFiltrados: any[];
    usuarios: any[];
    userIdActual: string;
    effectiveUser: any;
    isEstu: boolean;
    isProf: boolean;
    isAdmin: boolean;
    estudiantesComparacion: any[];
}

function TabEstadisticasContent({
    kpis, datosLinea, granularidad, onGranularidadChange, tiempoRealVsObjetivo,
    registrosFiltrados, periodoInicio, periodoFin,
    // Props for sections
    tiposBloques, topEjercicios, bloquesFiltrados, usuarios, userIdActual,
    effectiveUser, isEstu, isProf, isAdmin, estudiantesComparacion
}: TabEstadisticasContentProps) {
    return (
        <ProgresoTabAny
            datosLinea={datosLinea}
            granularidad={granularidad}
            onGranularidadChange={onGranularidadChange}
            tiempoRealVsObjetivo={tiempoRealVsObjetivo}
            kpis={kpis}
            tiposBloque={tiposBloques}
            topEjercicios={topEjercicios}
            registrosFiltrados={registrosFiltrados}
            periodoInicio={periodoInicio}
            periodoFin={periodoFin}
        />
    );
}

// ============================================================================
// Mochila Tab Content
// ============================================================================

function MochilaTabContent({ studentId, isEstu, hasSelectedStudent }: { studentId: string, isEstu: boolean, hasSelectedStudent: boolean }) {
    // Mochila only supports single student
    const { data: backpackItems = [], isLoading, error } = useStudentBackpack(studentId);

    // Filter state
    const [statusFilter, setStatusFilter] = useState('en_progreso');

    // Selection state
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const navigate = useNavigate();

    // Reset selection when filter changes (optional, but safer)
    useEffect(() => {
        setSelectedKeys(new Set());
    }, [statusFilter]);


    // Calculate counts from FULL dataset using DERIVED status
    const counts = useMemo(() => {
        const c: Record<string, number> = {
            todos: backpackItems.length,
            nuevo: 0,
            en_progreso: 0,
            dominado: 0,
            oxidado: 0,
            archivado: 0,
            // Metric for "Items en Mochila" card (active items)
            activeTotal: 0
        };

        backpackItems.forEach((item: any) => {
            const derivedStatus = getDerivedBackpackStatus(item);
            if (c[derivedStatus] !== undefined) {
                c[derivedStatus]++;
            }
            if (derivedStatus !== 'archivado') {
                c.activeTotal++;
            }
        });

        return c;
    }, [backpackItems]);

    // Filter items for table using DERIVED status
    const filteredItems = useMemo(() => {
        if (statusFilter === 'todos') return backpackItems;
        return backpackItems.filter(item => getDerivedBackpackStatus(item) === statusFilter);
    }, [backpackItems, statusFilter]);

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'dominado': return 'success';
            case 'en_progreso': return 'info';
            case 'oxidado': return 'warning';
            case 'archivado': return 'outline';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'dominado': return 'Dominado';
            case 'en_progreso': return 'En Progreso';
            case 'oxidado': return 'Oxidado';
            case 'archivado': return 'Archivado';
            case 'nuevo': return 'Nuevo';
            default: return status;
        }
    };

    // Columns for UnifiedTable
    const columns = useMemo(() => [
        {
            key: 'backpackKey',
            label: 'Ejercicio / Item',
            sortable: true,
            mobileIsPrimary: true,
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            sortValue: (item: any) => getDerivedBackpackStatus(item),
            render: (item: any) => {
                const derivedStatus = getDerivedBackpackStatus(item);
                return (
                    <Badge variant={getStatusBadgeVariant(derivedStatus)}>
                        {getStatusLabel(derivedStatus)}
                    </Badge>
                );
            },
        },
        {
            key: 'masteryScore',
            label: 'Nivel Maestría',
            sortable: true,
            sortValue: (item: any) => item.masteryScore,
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    <div className="w-full bg-[var(--color-surface-muted)] rounded-full h-2.5 max-w-[100px] overflow-hidden">
                        <div
                            className="bg-[var(--color-primary)] h-2.5 rounded-full"
                            style={{ width: `${Math.min(100, item.masteryScore)}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">{item.masteryScore} XP</span>
                </div>
            ),
        },
        {
            key: 'lastPracticedAt',
            label: 'Última Práctica',
            sortable: true,
            sortValue: (item: any) => item.lastPracticedAt ? new Date(item.lastPracticedAt).getTime() : 0,
            render: (item: any) => (
                <span className="text-[var(--color-text-secondary)]">
                    {item.lastPracticedAt
                        ? format(new Date(item.lastPracticedAt), "d MMM yyyy", { locale: es })
                        : '-'
                    }
                </span>
            ),
        },
    ], []);

    // Show message if PROF/ADMIN hasn't selected a student or selected multiple
    if (!isEstu && !hasSelectedStudent) {
        return (
            <CardAny className={componentStyles.components.cardBase}>
                <CardContentAny className="p-8 text-center">
                    <Backpack className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[var(--color-text-secondary)]">
                        Selecciona un alumno para ver su mochila
                    </p>
                </CardContentAny>
            </CardAny>
        );
    }

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                Error cargando la mochila: {error.message}
            </div>
        );
    }

    // Define filters configuration
    const filters = [
        { key: 'en_progreso', label: 'En Progreso', icon: Clock },
        { key: 'dominado', label: 'Dominado', icon: Trophy },
        { key: 'nuevo', label: 'Nuevo', icon: Star },
        { key: 'oxidado', label: 'Oxidado', icon: Activity }, // Activity as generic icon, or Reuse Timer? Activity is fine.
        { key: 'archivado', label: 'Archivado', icon: Backpack }, // Backpack or Archive. Backpack is already imported.
        { key: 'todos', label: 'Todos', icon: List },
    ];

    // Hooks moved to top

    const handlePracticeSelection = async () => {
        if (selectedKeys.size === 0) return;

        try {
            // Map selected IDs back to exercise codes (backpackKey)
            // We need to find the items in the current filtered list (or full list)
            // backpackItems has the data.
            const selectedExercises = backpackItems
                .filter((item: any) => selectedKeys.has(item.id))
                .map((item: any) => item.backpack_key || item.backpackKey);

            if (selectedExercises.length === 0) {
                toast.error("No se han encontrado ejercicios válidos en la selección");
                return;
            }

            const { sessionId, asignacionId, semanaIdx, sesionIdx } = await createManualSessionDraft({
                studentId: studentId,
                exerciseCodes: selectedExercises,
                source: 'mochila'
            });

            // Navigate using existing helper
            navigate(toStudia({ asignacionId, semanaIdx, sesionIdx }));

        } catch (err) {
            console.error(err);
            toast.error("No se ha podido iniciar la práctica");
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter Pills */}
            <div className="relative flex justify-center items-center pt-2 gap-3">
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer p-1 rounded-full hover:bg-[var(--color-surface-muted)]">
                                <Info className="w-5 h-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-[280px] p-4 text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] shadow-xl z-50 text-[var(--color-text-primary)]"
                        >
                            <div className="flex flex-col gap-2">
                                <p>La Mochila muestra el estado actual (foto fija).</p>
                                <p>Los estados se actualizan al practicar:<br /><span className="font-semibold text-[var(--color-primary)]">Nuevo → En progreso → Dominado</span></p>
                                <p className="text-[var(--color-text-muted)] text-xs">Oxidado/Archivado solo aparecen si se marcan/gestionan manualmente (por ahora).</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-2">
                    <div className="flex flex-wrap justify-center bg-[var(--color-surface-muted)] p-1 rounded-lg gap-1">
                        {filters.map(f => {
                            const count = counts[f.key];
                            const isActive = statusFilter === f.key;
                            const Icon = f.icon;

                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={cn(
                                        "flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                        isActive
                                            ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 mr-2" />
                                    {f.label}
                                    <span className={cn(
                                        "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border",
                                        isActive
                                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
                                            : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {selectedKeys.size > 0 && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handlePracticeSelection}
                                className="ml-2 shadow-sm"
                            >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Practicar ({selectedKeys.size})
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Table */}
            <CardAny className={componentStyles.containers.cardBase}>
                <CardHeaderAny>
                    <CardTitleAny className="text-[var(--color-text-primary)]">Repertorio Activo</CardTitleAny>
                </CardHeaderAny>
                <CardContentAny>
                    <UnifiedTableAny
                        columns={columns}
                        data={filteredItems}
                        keyField="id"
                        selectable={true}
                        selectedKeys={selectedKeys}
                        onSelectionChange={setSelectedKeys}
                        onRowClick={(item: any) => {
                            const newSelected = new Set(selectedKeys);
                            if (newSelected.has(item.id)) {
                                newSelected.delete(item.id);
                            } else {
                                newSelected.add(item.id);
                            }
                            setSelectedKeys(newSelected);
                        }}
                        emptyMessage={
                            statusFilter === 'todos'
                                ? "Mochila vacía. A medida que practiques, los ejercicios se guardarán aquí automáticamente."
                                : `No hay ejercicios con estado "${getStatusLabel(statusFilter)}".`
                        }
                        emptyIcon={Backpack}
                        paginated={true}
                        defaultPageSize={10}
                    />
                </CardContentAny>
            </CardAny>
        </div>
    );
}
