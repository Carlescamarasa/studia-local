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
import { useQuery } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { useEffectiveUser, resolveUserIdActual, displayName } from "@/components/utils/helpers";
import { formatLocalDate, parseLocalDate, startOfMonday, formatDuracionHM, formatDurationDDHHMM } from "@/components/estadisticas/utils";
import { chooseBucket } from "@/components/estadisticas/chartHelpers";
import { useEstadisticas, safeNumber } from "@/components/estadisticas/hooks/useEstadisticas";
import { useStudentBackpack } from "@/hooks/useStudentBackpack";
import { useHabilidadesStats, useHabilidadesStatsMultiple } from "@/hooks/useHabilidadesStats";
import {
    useTotalXP,
    totalXPToObject,
    useLifetimePracticeXP,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals
} from "@/hooks/useXP";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, PageHeader } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import MultiSelect from "@/components/ui/MultiSelect";
import StatsDateHeader from "@/components/estadisticas/StatsDateHeader";
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
import ResumenTab from "@/components/estadisticas/ResumenTab";
import ProgresoTab from "@/components/estadisticas/ProgresoTab";
import HabilidadesView from "@/components/estadisticas/HabilidadesView";
import FeedbackUnificadoTab from "@/components/estadisticas/FeedbackUnificadoTab";
import LevelBadge from "@/components/common/LevelBadge";
import TabBoundary from "@/components/common/TabBoundary";
import UnifiedTable from "@/components/tables/UnifiedTable";

import TotalXPDisplay from "@/components/estadisticas/TotalXPDisplay";
import HabilidadesRadarChart from "@/components/estadisticas/HabilidadesRadarChart";
import HeatmapFranjas from "@/components/estadisticas/HeatmapFranjas";
import StatTile from "@/components/estadisticas/StatTile";
import CompactCard from "@/components/estadisticas/CompactCard";

// New imports for Estadísticas subtabs
import TiposBloquesTab from "@/components/estadisticas/TiposBloquesTab";
import TopEjerciciosTab from "@/components/estadisticas/TopEjerciciosTab";
import AutoevaluacionesTab from "@/components/estadisticas/AutoevaluacionesTab";
import ComparativaEstudiantes from "@/components/estadisticas/ComparativaEstudiantes";
import ModalFeedbackSemanal from "@/components/calendario/ModalFeedbackSemanal";
import MediaPreviewModal from "@/components/common/MediaPreviewModal";
import StreakMetric from "@/components/estadisticas/StreakMetric";
import RatingStarsMetric from "@/components/estadisticas/RatingStarsMetric";
import KpiTile from "@/components/estadisticas/KpiTile";

// Icons
import {
    Activity, BarChart3, Star, MessageSquare, Backpack, Target,
    Clock, Trophy, ChevronDown, ChevronUp, Filter, User, TrendingUp,
    Layers, List, Users, Info, BookOpen, PieChart, Timer, CalendarRange, Repeat
} from "lucide-react";

import RequireRole from "@/components/auth/RequireRole";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

// Valid tabs for normalization
const VALID_TABS = ['resumen', 'habilidades', 'estadisticas', 'mochila', 'feedback', 'comparar'];

// ============================================================================
// Main Component
// ============================================================================

export default function ProgresoPage() {
    return (
        <RequireRole anyOf={['ESTU', 'PROF', 'ADMIN']}>
            <ProgresoPageContent />
        </RequireRole>
    );
}

function ProgresoPageContent() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab state from URL with fallback to 'resumen' (Bloque 1)
    const [tabActiva, setTabActiva] = useState(() => {
        const tabFromUrl = searchParams.get('tab');
        return VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'resumen';
    });

    // User and role detection
    const effectiveUser = useEffectiveUser();
    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';
    const isEstu = effectiveUser?.rolPersonalizado === 'ESTU';

    // Date range state
    const [filtersExpanded, setFiltersExpanded] = useState(false);
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
    const [selectedStudentIds, setSelectedStudentIds] = useState(() => {
        const raw = searchParams.get('students') || '';
        return raw ? raw.split(',').filter(Boolean) : [];
    });

    const [granularidad, setGranularidad] = useState('dia');

    // Load users
    const { data: usuarios = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => localDataClient.entities.User.list(),
        staleTime: 5 * 60 * 1000,
    });

    // Resolve current user ID
    const userIdActual = useMemo(() => {
        return resolveUserIdActual(effectiveUser, usuarios);
    }, [effectiveUser, usuarios]);

    // Load assignments for professor to filter students
    const { data: asignacionesProf = [] } = useQuery({
        queryKey: ['asignacionesProf', userIdActual],
        queryFn: () => localDataClient.entities.Asignacion.list(),
        enabled: (isProf || isAdmin) && !!userIdActual,
        staleTime: 5 * 60 * 1000,
    });

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
        if (isEstu) return [userIdActual];
        if (selectedStudentIds.length > 0) return selectedStudentIds;
        return []; // Empty = all students (for PROF, will be filtered by estudiantesDelProfesor)
    }, [isEstu, selectedStudentIds, userIdActual]);

    const effectiveIds = useMemo(() => {
        if (!effectiveStudentId && isProf) return estudiantesDelProfesor;
        if (!effectiveStudentId && isAdmin) return usuarios.filter(u => u.rolPersonalizado === 'ESTU').map(u => u.id);
        return effectiveStudentId ? [effectiveStudentId] : [];
    }, [effectiveStudentId, isProf, isAdmin, estudiantesDelProfesor, usuarios]);

    // Level calculation for Resumen
    const { currentLevel, nextLevel } = useAggregateLevelGoals(effectiveIds);



    // ============================================================================
    // Data Loading - Registros y Bloques
    // ============================================================================

    const { data: registros = [] } = useQuery({
        queryKey: ['registrosSesion'],
        queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
        staleTime: 1 * 60 * 1000,
    });

    const registrosSesionValidos = useMemo(
        () => registros.filter(r => r.calificacion != null),
        [registros]
    );

    const { data: bloques = [] } = useQuery({
        queryKey: ['registrosBloques'],
        queryFn: () => localDataClient.entities.RegistroBloque.list('-inicioISO'),
        staleTime: 1 * 60 * 1000,
    });

    const { data: feedbacksSemanal = [], refetch: refetchFeedbacks } = useQuery({
        queryKey: ['feedbacksSemanal'],
        queryFn: () => localDataClient.entities.FeedbackSemanal.list('-created_at'),
        staleTime: 2 * 60 * 1000,
    });

    const { data: evaluacionesTecnicas = [] } = useQuery({
        queryKey: ['evaluacionesTecnicas'],
        queryFn: () => localDataClient.entities.EvaluacionTecnica.list(),
        staleTime: 2 * 60 * 1000,
    });

    // ============================================================================
    // Filter registros
    // ============================================================================

    const registrosFiltrados = useMemo(() => {
        let filtered = registrosSesionValidos
            .filter(r => {
                const duracion = safeNumber(r.duracionRealSeg);
                return duracion > 0 && duracion <= 43200;
            })
            .map(r => ({
                ...r,
                duracionRealSeg: safeNumber(r.duracionRealSeg),
                duracionObjetivoSeg: safeNumber(r.duracionObjetivoSeg),
                bloquesCompletados: safeNumber(r.bloquesCompletados),
                bloquesOmitidos: safeNumber(r.bloquesOmitidos),
                calificacion: r.calificacion != null ? safeNumber(r.calificacion) : null,
            }));

        // Filter by student
        if (isEstu) {
            filtered = filtered.filter(r => r.alumnoId === userIdActual);
        } else {
            let targetAlumnoIds = new Set();
            if (alumnosSeleccionados.length > 0 && alumnosSeleccionados[0]) {
                alumnosSeleccionados.forEach(id => targetAlumnoIds.add(id));
            } else if (isProf && estudiantesDelProfesor.length > 0) {
                estudiantesDelProfesor.forEach(id => targetAlumnoIds.add(id));
            } else {
                estudiantes.forEach(e => targetAlumnoIds.add(e.id));
            }
            if (targetAlumnoIds.size > 0) {
                filtered = filtered.filter(r => targetAlumnoIds.has(r.alumnoId));
            }
        }

        // Filter by date range
        if (periodoInicio) {
            const inicioDate = parseLocalDate(periodoInicio);
            filtered = filtered.filter(r => {
                if (!r.inicioISO) return false;
                const registroDate = new Date(r.inicioISO);
                const registroLocal = new Date(registroDate.getFullYear(), registroDate.getMonth(), registroDate.getDate());
                return registroLocal >= inicioDate;
            });
        }
        if (periodoFin) {
            const finDate = parseLocalDate(periodoFin);
            finDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => {
                if (!r.inicioISO) return false;
                const registroDate = new Date(r.inicioISO);
                return registroDate <= finDate;
            });
        }

        return filtered;
    }, [registrosSesionValidos, isEstu, isProf, userIdActual, alumnosSeleccionados, estudiantesDelProfesor, estudiantes, periodoInicio, periodoFin]);

    // Unique registros
    const registrosFiltradosUnicos = useMemo(() => {
        const map = new Map();
        registrosFiltrados.forEach((r) => {
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
                if (!start) start = formatLocalDate(new Date(Math.min(...timestamps)));
                if (!end) end = formatLocalDate(new Date(Math.max(...timestamps)));
            }
        }

        const bucket = chooseBucket(start, end);
        setGranularidad(bucket.mode);
    }, [periodoInicio, periodoFin, registrosFiltradosUnicos]);

    const bloquesFiltrados = useMemo(() => {
        const registrosIds = new Set(registrosFiltradosUnicos.map(r => r.id));
        return bloques
            .filter(b => registrosIds.has(b.registroSesionId))
            .map(b => ({
                ...b,
                duracionRealSeg: safeNumber(b.duracionRealSeg),
                duracionObjetivoSeg: safeNumber(b.duracionObjetivoSeg),
            }));
    }, [bloques, registrosFiltradosUnicos]);

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
        userIdActual: effectiveStudentId || userIdActual,
    });

    const { kpis, datosLinea, tiposBloques, topEjercicios, tiempoRealVsObjetivo } = estadisticas;

    // ============================================================================
    // Feedback filtering
    // ============================================================================

    const feedbackProfesor = useMemo(() => {
        const targetId = effectiveStudentId || userIdActual;
        if (!targetId) return [];

        const filtrados = feedbacksSemanal.filter(f => {
            if (f.alumnoId !== targetId) return false;

            const createdAt = f.createdAt || f.created_at;
            const updatedAt = f.updatedAt || f.updated_at || createdAt;

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

        return filtrados.sort((a, b) => {
            const aUpdated = a.updatedAt || a.updated_at || a.createdAt || a.created_at || '';
            const bUpdated = b.updatedAt || b.updated_at || b.createdAt || b.created_at || '';
            return bUpdated.localeCompare(aUpdated);
        });
    }, [feedbacksSemanal, effectiveStudentId, userIdActual, periodoInicio, periodoFin]);

    const feedbacksParaProfAdmin = useMemo(() => {
        if (isEstu) return [];

        let resultado = [...feedbacksSemanal];

        if (alumnosSeleccionados.length > 0 && alumnosSeleccionados[0]) {
            resultado = resultado.filter(f => alumnosSeleccionados.includes(f.alumnoId));
        } else if (isProf && estudiantesDelProfesor.length > 0) {
            resultado = resultado.filter(f => estudiantesDelProfesor.includes(f.alumnoId));
        }

        // Date filter
        if (periodoInicio || periodoFin) {
            resultado = resultado.filter(f => {
                const createdAt = f.createdAt || f.created_at;
                const updatedAt = f.updatedAt || f.updated_at || createdAt;

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
        resultado = resultado.map(f => {
            const alumno = usuarios.find(u => u.id === f.alumnoId);
            return {
                ...f,
                alumnoNombre: alumno ? displayName(alumno) : f.alumnoId || 'N/A'
            };
        });

        resultado.sort((a, b) => {
            const fechaA = a.updatedAt || a.updated_at || a.createdAt || a.created_at || '';
            const fechaB = b.updatedAt || b.updated_at || b.createdAt || b.created_at || '';
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
        const map = {};
        usuarios.forEach(u => { map[u.id] = u; });
        return map;
    }, [usuarios]);

    // Helper function to calculate streak (reutilized from estadisticas.jsx)
    const calcularRacha = (registros, alumnoId = null) => {
        const targetRegistros = registros
            .filter(r => (!alumnoId || r.alumnoId === alumnoId) && (r.duracionRealSeg || 0) >= 60);

        if (targetRegistros.length === 0) return { actual: 0, maxima: 0 };

        const diasUnicos = new Set();
        targetRegistros.forEach(r => {
            if (r.inicioISO) {
                const fecha = new Date(r.inicioISO);
                const fechaLocal = formatLocalDate(fecha);
                diasUnicos.add(fechaLocal);
            }
        });

        if (diasUnicos.size === 0) return { actual: 0, maxima: 0 };

        const diasArraySortedDesc = Array.from(diasUnicos).sort((a, b) => b.localeCompare(a));
        const diasArraySortedAsc = Array.from(diasUnicos).sort((a, b) => a.localeCompare(b));

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
                for (let i = 1; i < diasArraySortedDesc.length; i++) {
                    const currentDate = parseLocalDate(diasArraySortedDesc[i]);
                    const previousDate = parseLocalDate(diasArraySortedDesc[i - 1]);
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

            for (let i = 1; i < diasArraySortedAsc.length; i++) {
                const currentDate = parseLocalDate(diasArraySortedAsc[i]);
                const previousDate = parseLocalDate(diasArraySortedAsc[i - 1]);
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
        const estudiantesIds = alumnosSeleccionados.length > 0 && alumnosSeleccionados[0]
            ? alumnosSeleccionados
            : (isProf && estudiantesDelProfesor.length > 0)
                ? estudiantesDelProfesor
                : estudiantes.map(e => e.id);

        return estudiantesIds.map(alumnoId => {
            const registrosEstudiante = registrosFiltradosUnicos.filter(r => r.alumnoId === alumnoId);

            // Calculate metrics for each student
            const tiempoTotal = registrosEstudiante.reduce((sum, r) => {
                const duracion = safeNumber(r.duracionRealSeg);
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
                const cal = safeNumber(r.calificacion);
                return cal > 0 && cal <= 4;
            });
            const calificacionPromedio = conCalificacion.length > 0
                ? (conCalificacion.reduce((acc, r) => acc + safeNumber(r.calificacion), 0) / conCalificacion.length).toFixed(1)
                : '0.0';

            const totalCompletados = registrosEstudiante.reduce((sum, r) =>
                sum + safeNumber(r.bloquesCompletados), 0
            );
            const totalOmitidos = registrosEstudiante.reduce((sum, r) =>
                sum + safeNumber(r.bloquesOmitidos), 0
            );
            const ratioCompletado = (totalCompletados + totalOmitidos) > 0
                ? ((totalCompletados / (totalCompletados + totalOmitidos)) * 100).toFixed(1)
                : 0;

            const racha = calcularRacha(registrosEstudiante, null);

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
        const params = {};
        if (tabActiva !== 'resumen') params.tab = tabActiva;
        if (periodoInicio) params.inicio = periodoInicio;
        if (periodoFin) params.fin = periodoFin;
        if (!isEstu && selectedStudentIds.length > 0) params.students = selectedStudentIds.join(',');
        setSearchParams(params, { replace: true });
    }, [tabActiva, periodoInicio, periodoFin, selectedStudentIds, isEstu, setSearchParams]);

    // ============================================================================
    // Preset Application
    // ============================================================================

    const aplicarPreset = (preset) => {
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
    const [previewMediaLinks, setPreviewMediaLinks] = useState([]);

    const handleMediaClick = (mediaLinks, index = 0) => {
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

    const handleEditFeedback = (feedback) => {
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
        setFeedbackModalOpen(false);
    };

    return (
        <div className={componentStyles.layout.appBackground}>
            <PageHeader
                icon={Target}
                title="Progreso"
                subtitle={isEstu ? 'Tu evolución y logros' : 'Seguimiento del progreso de estudiantes'}
                actions={
                    <>
                        {/* Bloque 2: Unified student selector - always visible for PROF/ADMIN */}
                        {(isProf || isAdmin) && (
                            <MultiSelect
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
                        <StatsDateHeader
                            startDate={periodoInicio}
                            endDate={periodoFin}
                            onDateChange={(range) => {
                                setPeriodoInicio(range?.from);
                                setPeriodoFin(range?.to);
                                if (range?.from || range?.to) {
                                    setRangoPreset('personalizado');
                                }
                            }}
                            isOpen={filtersExpanded}
                            onToggle={() => setFiltersExpanded(!filtersExpanded)}
                            className="mr-2"
                        />
                    </>
                }
            />

            {/* Filters panel */}
            {filtersExpanded && (
                <div className="studia-section py-3">
                    <Card className={componentStyles.containers.cardBase}>
                        <CardContent className="p-3 sm:p-4 md:p-6">
                            <div className="flex flex-wrap gap-2 justify-end">
                                {presets.map((p) => (
                                    <Button
                                        key={p.key}
                                        variant={rangoPreset === p.key ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => aplicarPreset(p.key)}
                                        className={cn(
                                            "h-9 px-3 text-xs sm:text-sm whitespace-nowrap",
                                            rangoPreset === p.key
                                                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        {p.label}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                    <TabBoundary>
                        <TabResumenContent
                            kpis={kpis}
                            datosLinea={datosLinea}
                            granularidad={granularidad}
                            onGranularidadChange={setGranularidad}
                            userIdActual={effectiveStudentId || userIdActual}
                            alumnosSeleccionados={alumnosSeleccionados}
                            allStudentIds={estudiantesDisponibles.map(s => s.id)}
                        />
                    </TabBoundary>
                )}

                {tabActiva === 'habilidades' && (
                    <TabBoundary>
                        <HabilidadesView
                            alumnosSeleccionados={alumnosSeleccionados}
                            allStudentIds={estudiantesDisponibles.map(s => s.id)}
                            userIdActual={userIdActual}
                            fechaInicio={periodoInicio}
                            fechaFin={periodoFin}
                        />
                    </TabBoundary>
                )}

                {/* Bloque 3: Embedded statistics instead of link */}
                {tabActiva === 'estadisticas' && (
                    <TabBoundary>
                        <TabEstadisticasContent
                            kpis={kpis}
                            datosLinea={datosLinea}
                            granularidad={granularidad}
                            onGranularidadChange={setGranularidad}
                            tiempoRealVsObjetivo={tiempoRealVsObjetivo}
                            registrosFiltrados={registrosFiltradosUnicos}
                            periodoInicio={periodoInicio}
                            periodoFin={periodoFin}
                            // NEW props for subtabs
                            tiposBloques={tiposBloques}
                            topEjercicios={topEjercicios}
                            bloquesFiltrados={bloquesFiltrados}
                            usuarios={usuarios}
                            userIdActual={effectiveStudentId || userIdActual}
                            effectiveUser={effectiveUser}
                            isEstu={isEstu}
                            isProf={isProf}
                            isAdmin={isAdmin}
                            estudiantesComparacion={estudiantesComparacion}
                        />
                    </TabBoundary>
                )}

                {tabActiva === 'mochila' && (
                    <TabBoundary>
                        <MochilaTabContent
                            studentId={effectiveStudentId || userIdActual}
                            isEstu={isEstu}
                            hasSelectedStudent={selectedStudentIds.length === 1}
                        />
                    </TabBoundary>
                )}

                {tabActiva === 'feedback' && (
                    <TabBoundary>
                        <FeedbackUnificadoTab
                            feedbacks={isEstu ? feedbackProfesor : feedbacksParaProfAdmin}
                            evaluaciones={evaluacionesFiltradas}
                            registros={registrosFiltradosUnicos}
                            usuarios={usuariosMap}
                            isEstu={isEstu}
                            onEditFeedback={(isProf || isAdmin) ? handleEditFeedback : undefined}
                            puedeEditar={(f) => isProf || isAdmin}
                            onMediaClick={handleMediaClick}
                            isMediaModalOpen={mediaPreviewOpen}
                            actionButton={
                                (isProf || isAdmin) && alumnosSeleccionados.length === 1 ? (
                                    <Button
                                        onClick={handleCreateFeedback}
                                        variant="primary"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Nuevo Feedback Semanal
                                    </Button>
                                ) : undefined
                            }
                        />
                    </TabBoundary>
                )}

                {/* Tab Comparar - PROF/ADMIN only */}
                {tabActiva === 'comparar' && (
                    <TabBoundary>
                        {(isProf || isAdmin) ? (
                            <ComparativaEstudiantes
                                estudiantes={estudiantesComparacion}
                                usuarios={usuarios}
                            />
                        ) : (
                            <Card className={componentStyles.components.cardBase}>
                                <CardContent className="p-8 text-center">
                                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-[var(--color-text-secondary)]">
                                        No tienes permisos para ver esta sección
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabBoundary>
                )}

                {/* Modal Feedback Semanal */}
                <ModalFeedbackSemanal
                    open={feedbackModalOpen}
                    onOpenChange={setFeedbackModalOpen}
                    feedback={selectedFeedback}
                    studentId={selectedFeedback?.alumnoId || effectiveStudentId || (alumnosSeleccionados.length === 1 ? alumnosSeleccionados[0] : null)}
                    weekStartISO={feedbackWeekInfo.startISO}
                    weekLabel={feedbackWeekInfo.label}
                    onSaved={handleFeedbackSaved}
                    onMediaClick={handleMediaClick}
                />

                {/* Media Preview Modal */}
                <MediaPreviewModal
                    open={mediaPreviewOpen}
                    onClose={() => setMediaPreviewOpen(false)}
                    urls={previewMediaLinks}
                    initialIndex={selectedMediaIndex}
                />
            </div>
        </div>
    );
}

// ============================================================================
// Tab Resumen Content - Extended with XP & Toggle
// ============================================================================

function TabResumenContent({ kpis, datosLinea, granularidad, onGranularidadChange, userIdActual, alumnosSeleccionados = [], allStudentIds = [] }) {
    return (
        <div className="space-y-4">
            {/* KPIs Bar - 6-tile uniform layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pb-4">
                {/* 1. Tiempo Total */}
                <KpiTile
                    icon={Timer}
                    label="Tiempo total"
                    value={formatDurationDDHHMM(kpis.tiempoTotal, 'sec')}
                    valueClassName="text-orange-500"
                />

                {/* 2. Promedio/Sesión */}
                <KpiTile
                    icon={Clock}
                    label="Prom/sesión"
                    value={`${Math.round((kpis.tiempoPromedioPorSesion || 0) / 60)} min`}
                />

                {/* 3. Valoración */}
                <RatingStarsMetric
                    value={kpis.calidadPromedio}
                    max={4}
                />

                {/* 4. Racha */}
                <StreakMetric
                    streakDays={kpis.racha.actual}
                    maxStreak={kpis.racha.maxima}
                />

                {/* 5. Semanas Activas */}
                <KpiTile
                    icon={CalendarRange}
                    label="Semanas activas"
                    value={kpis.semanasDistintas}
                    subtext="en el periodo"
                />

                {/* 6. Frecuencia Semanal */}
                <KpiTile
                    icon={Repeat}
                    label="Frecuencia semanal"
                    value={kpis.mediaSemanalSesiones.toFixed(1)}
                    valueClassName="text-[var(--color-success)]"
                    subtext="ses/sem · media"
                />
            </div>

            {/* Habilidades Card - Reusing HabilidadesView with accumulated XP (forma mode) */}
            <HabilidadesView
                alumnosSeleccionados={alumnosSeleccionados}
                allStudentIds={allStudentIds}
                userIdActual={userIdActual}
                hideViewModeToggle={true}
                forceViewMode="forma"
                customTitle="Habilidades"
            />
        </div>
    );
}

// ============================================================================
// Tab Estadísticas Content - EMBEDDED (Bloque 3) - 2 Pills: Rendimiento / Ejercicios
// ============================================================================

// ============================================================================
// Tab Estadísticas Content - EMBEDDED (Bloque 3) - 2 Pills: Rendimiento / Ejercicios
// ============================================================================


function TabEstadisticasContent({
    kpis, datosLinea, granularidad, onGranularidadChange, tiempoRealVsObjetivo,
    registrosFiltrados, periodoInicio, periodoFin,
    // Props for sections
    tiposBloques, topEjercicios, bloquesFiltrados, usuarios, userIdActual,
    effectiveUser, isEstu, isProf, isAdmin, estudiantesComparacion
}) {
    return (
        <ProgresoTab
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

function MochilaTabContent({ studentId, isEstu, hasSelectedStudent }) {
    // Mochila only supports single student
    const { data: backpackItems = [], isLoading, error } = useStudentBackpack(studentId);

    const stats = useMemo(() => {
        return {
            total: backpackItems.length,
            mastered: backpackItems.filter(i => i.status === 'dominado').length,
            inProgress: backpackItems.filter(i => i.status === 'en_progreso').length,
        };
    }, [backpackItems]);

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'dominado': return 'success';
            case 'en_progreso': return 'info';
            case 'oxidado': return 'warning';
            case 'archivado': return 'outline';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
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
            render: (item) => (
                <Badge variant={getStatusBadgeVariant(item.status)}>
                    {getStatusLabel(item.status)}
                </Badge>
            ),
        },
        {
            key: 'masteryScore',
            label: 'Nivel Maestría',
            sortable: true,
            sortValue: (item) => item.masteryScore,
            render: (item) => (
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
            sortValue: (item) => item.lastPracticedAt ? new Date(item.lastPracticedAt).getTime() : 0,
            render: (item) => (
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
            <Card className={componentStyles.components.cardBase}>
                <CardContent className="p-8 text-center">
                    <Backpack className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-[var(--color-text-secondary)]">
                        Selecciona un alumno para ver su mochila
                    </p>
                </CardContent>
            </Card>
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

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={componentStyles.containers.cardBase}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items en Mochila</CardTitle>
                        <Backpack className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card className={componentStyles.containers.cardBase}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominados</CardTitle>
                        <Trophy className="h-4 w-4 text-[var(--color-success)]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.mastered}</div>
                    </CardContent>
                </Card>
                <Card className={componentStyles.containers.cardBase}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                        <Clock className="h-4 w-4 text-[var(--color-info)]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.inProgress}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Content Table */}
            <Card className={componentStyles.containers.cardBase}>
                <CardHeader>
                    <CardTitle className="text-[var(--color-text-primary)]">Repertorio Activo</CardTitle>
                </CardHeader>
                <CardContent>
                    <UnifiedTable
                        columns={columns}
                        data={backpackItems}
                        keyField="id"
                        emptyMessage="Mochila vacía. A medida que practiques, los ejercicios se guardarán aquí automáticamente."
                        emptyIcon={Backpack}
                        paginated={true}
                        defaultPageSize={10}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
