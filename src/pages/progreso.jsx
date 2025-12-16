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
import { formatLocalDate, parseLocalDate, startOfMonday, formatDuracionHM } from "@/components/estadisticas/utils";
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

// Tab Components (reutilizados)
import ResumenTab from "@/components/estadisticas/ResumenTab";
import ProgresoTab from "@/components/estadisticas/ProgresoTab";
import HabilidadesView from "@/components/estadisticas/HabilidadesView";
import FeedbackUnificadoTab from "@/components/estadisticas/FeedbackUnificadoTab";
import TotalXPDisplay from "@/components/estadisticas/TotalXPDisplay";
import HabilidadesRadarChart from "@/components/estadisticas/HabilidadesRadarChart";
import HeatmapFranjas from "@/components/estadisticas/HeatmapFranjas";

// New imports for Estadísticas subtabs
import TiposBloquesTab from "@/components/estadisticas/TiposBloquesTab";
import TopEjerciciosTab from "@/components/estadisticas/TopEjerciciosTab";
import AutoevaluacionesTab from "@/components/estadisticas/AutoevaluacionesTab";
import ComparativaEstudiantes from "@/components/estadisticas/ComparativaEstudiantes";

// Icons
import {
    Activity, BarChart3, Star, MessageSquare, Backpack, Target,
    Clock, Trophy, ChevronDown, ChevronUp, Filter, User, TrendingUp,
    Layers, List, Users
} from "lucide-react";

import RequireRole from "@/components/auth/RequireRole";
import { format } from "date-fns";
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

    const { data: feedbacksSemanal = [] } = useQuery({
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
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
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

            <div className={componentStyles.layout.page}>
                {/* Main tabs */}
                <Card className={`${componentStyles.components.cardBase} mb-6 p-0`}>
                    <div className="w-full">
                        <Tabs
                            variant="segmented"
                            value={tabActiva}
                            onChange={setTabActiva}
                            className="w-full"
                            items={tabItems}
                        />
                    </div>
                </Card>

                {/* Tab content */}
                {tabActiva === 'resumen' && (
                    <TabResumenContent
                        kpis={kpis}
                        datosLinea={datosLinea}
                        granularidad={granularidad}
                        onGranularidadChange={setGranularidad}
                        userIdActual={effectiveStudentId || userIdActual}
                        alumnosSeleccionados={alumnosSeleccionados}
                        allStudentIds={estudiantesDisponibles.map(s => s.id)}
                    />
                )}

                {tabActiva === 'habilidades' && (
                    <HabilidadesView
                        alumnosSeleccionados={alumnosSeleccionados}
                        allStudentIds={estudiantesDisponibles.map(s => s.id)}
                        userIdActual={userIdActual}
                    />
                )}

                {/* Bloque 3: Embedded statistics instead of link */}
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
                )}

                {tabActiva === 'mochila' && (
                    <MochilaTabContent
                        studentId={effectiveStudentId || userIdActual}
                        isEstu={isEstu}
                        hasSelectedStudent={selectedStudentIds.length === 1}
                    />
                )}

                {tabActiva === 'feedback' && (
                    <FeedbackUnificadoTab
                        feedbacks={isEstu ? feedbackProfesor : feedbacksParaProfAdmin}
                        evaluaciones={evaluacionesFiltradas}
                        registros={registrosFiltradosUnicos}
                        usuarios={usuariosMap}
                        isEstu={isEstu}
                    />
                )}

                {/* Tab Comparar - PROF/ADMIN only */}
                {tabActiva === 'comparar' && (
                    (isProf || isAdmin) ? (
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
                    )
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Tab Resumen Content - Extended with XP & Toggle
// ============================================================================

function TabResumenContent({ kpis, datosLinea, granularidad, onGranularidadChange, userIdActual, alumnosSeleccionados = [], allStudentIds = [] }) {
    // Logic for effective IDs:
    // 1. If students selected, use them.
    // 2. If NO students selected (and list of all exists), use ALL (Global Mode Default).
    // 3. Fallback to userIdActual (Individual) if everything else fails (shouldn't happen for PROF).

    // Check if we are in "Global Default" mode (Empty selection but we have available students)
    const isGlobalDefault = alumnosSeleccionados.length === 0 && allStudentIds.length > 0;

    const effectiveIds = isGlobalDefault
        ? allStudentIds
        : (alumnosSeleccionados.length > 0 ? alumnosSeleccionados : [userIdActual]);

    // Determine mode based on COUNT of effective IDs
    // If effectiveIds has 1 => Individual
    // If effectiveIds has > 1 => Multifile/Global
    const isMultiple = effectiveIds.length > 1;
    const singleId = effectiveIds.length === 1 ? effectiveIds[0] : '';

    // State for Source Toggle
    const [sourceFilter, setSourceFilter] = useState('ambos'); // 'experiencia' | 'evaluaciones' | 'ambos'

    // =========================================================================
    // USE THE SAME HOOKS AS TotalXPDisplay - This ensures radar = cards data
    // =========================================================================

    // Single student hooks (used when 1 student)
    const { data: totalXPSingle, isLoading: isLoadingTotalSingle } = useTotalXP(singleId);
    const { data: practiceXPSingle, isLoading: isLoadingPracticeSingle } = useLifetimePracticeXP(singleId);

    // Multi-student hooks (used when 2+ students)
    const { data: totalXPMultiple, isLoading: isLoadingTotalMultiple } = useTotalXPMultiple(isMultiple ? effectiveIds : []);
    const { data: practiceXPMultiple, isLoading: isLoadingPracticeMultiple } = useLifetimePracticeXPMultiple(isMultiple ? effectiveIds : []);

    // Aggregated Goals Hook - this gives us the denominator (maxXP)
    const aggregatedGoals = useAggregateLevelGoals(effectiveIds);

    // Fetch next level config for single student (like TotalXPDisplay does)
    const { data: studentProfile } = useQuery({
        queryKey: ['student-profile', singleId],
        queryFn: () => localDataClient.entities.User.get(singleId),
        enabled: !!singleId && !isMultiple
    });

    const currentLevel = studentProfile?.nivelTecnico || 0;
    const nextLevel = currentLevel + 1;

    const { data: nextLevelConfig } = useQuery({
        queryKey: ['level-config', nextLevel],
        queryFn: async () => {
            const configs = await localDataClient.entities.LevelConfig.list();
            const config = configs.find((c) => c.level === nextLevel);
            return config || null;
        },
        enabled: !isMultiple && !!nextLevel
    });

    // Use appropriate data based on count
    const totalXP = isMultiple ? totalXPMultiple : totalXPSingle;
    const practiceXP = isMultiple ? practiceXPMultiple : practiceXPSingle;
    const isLoadingXP = isMultiple
        ? (isLoadingTotalMultiple || isLoadingPracticeMultiple)
        : (isLoadingTotalSingle || isLoadingPracticeSingle);

    // Convert to object for easier access
    const total = totalXPToObject(totalXP);
    const practice = practiceXP || { motricidad: 0, articulacion: 0, flexibilidad: 0 };

    // Helper: get required XP for a skill (EXACTLY like TotalXPDisplay)
    const getRequiredXP = (skill) => {
        // Case Global: Use aggregated goals
        if (isMultiple) {
            return aggregatedGoals[skill] || 100;
        }

        // Case Single: Use level config
        if (!nextLevelConfig) return 100; // Fallback
        switch (skill) {
            case 'motricidad': return nextLevelConfig.minXpMotr || 100;
            case 'articulacion': return nextLevelConfig.minXpArt || 100;
            case 'flexibilidad': return nextLevelConfig.minXpFlex || 100;
            default: return 100;
        }
    };

    // Helper: get XP values for a skill based on filter (EXACTLY like TotalXPDisplay)
    const getXPValues = (skill) => {
        const totalVal = total[skill] || 0;
        const practiceVal = practice[skill] || 0;
        const evaluationVal = Math.max(0, totalVal - practiceVal);
        const maxXP = getRequiredXP(skill);

        return { practiceVal, evaluationVal, totalVal, maxXP };
    };

    // =========================================================================
    // QUALITATIVE DATA - From useHabilidadesStats (keep for Sonido/Cognición)
    // =========================================================================
    const { radarStats: singleStats, isLoading: loadingQualSingle } = useHabilidadesStats(isMultiple ? '' : singleId);
    const { radarStats: multipleStats, isLoading: loadingQualMultiple } = useHabilidadesStatsMultiple(isMultiple ? effectiveIds : []);

    const radarStatsRaw = isMultiple ? multipleStats : singleStats;
    const isLoadingQual = isMultiple ? loadingQualMultiple : loadingQualSingle;

    // Get qualitative values (0-10 scale, already)
    const getSonidoValue = () => {
        return radarStatsRaw?.combinedData?.find(d => d.subject === 'Sonido')?.original ?? 0;
    };

    const getCognicionValue = () => {
        return radarStatsRaw?.combinedData?.find(d => d.subject === 'Cognición')?.original ?? 0;
    };

    // Filter logic for XP Cards
    const xpFilter = useMemo(() => {
        if (sourceFilter === 'experiencia') return ['experiencia'];
        if (sourceFilter === 'evaluaciones') return ['evaluaciones'];
        return ['experiencia', 'evaluaciones'];
    }, [sourceFilter]);

    // =========================================================================
    // BUILD RADAR DATA - Using EXACT same values as cards, normalized to 0-10
    // =========================================================================
    const radarDataForChart = useMemo(() => {
        // Safe normalization: (xp / maxXp) * 10, with fallback if maxXp <= 0
        const normalize10 = (xp, maxXp) => {
            if (maxXp <= 0 || !Number.isFinite(xp) || !Number.isFinite(maxXp)) return 0;
            return Math.min(10, Math.max(0, (xp / maxXp) * 10));
        };

        // Get XP data for each skill
        const motrData = getXPValues('motricidad');
        const artData = getXPValues('articulacion');
        const flexData = getXPValues('flexibilidad');

        // Qualitative values (already 0-10)
        const sonidoVal = getSonidoValue();
        const cognicionVal = getCognicionValue();

        // Build radar data with normalized values (0-10 scale)
        const data = [
            {
                subject: 'Sonido',
                // Experiencia: Sonido = 0 (no practice XP for qualitative)
                // Evaluaciones/Ambos: use actual value
                Experiencia: 0,
                Evaluaciones: sonidoVal,
                Total: sonidoVal,
                original: sonidoVal,
                fullMark: 10
            },
            {
                subject: 'Motricidad',
                Experiencia: normalize10(motrData.practiceVal, motrData.maxXP),
                Evaluaciones: normalize10(motrData.evaluationVal, motrData.maxXP),
                Total: normalize10(motrData.totalVal, motrData.maxXP),
                originalExp: motrData.practiceVal,
                originalEval: motrData.evaluationVal,
                originalTotal: motrData.totalVal,
                maxXP: motrData.maxXP,
                fullMark: 10
            },
            {
                subject: 'Articulación (T)',
                Experiencia: normalize10(artData.practiceVal, artData.maxXP),
                Evaluaciones: normalize10(artData.evaluationVal, artData.maxXP),
                Total: normalize10(artData.totalVal, artData.maxXP),
                originalExp: artData.practiceVal,
                originalEval: artData.evaluationVal,
                originalTotal: artData.totalVal,
                maxXP: artData.maxXP,
                fullMark: 10
            },
            {
                subject: 'Flexibilidad',
                Experiencia: normalize10(flexData.practiceVal, flexData.maxXP),
                Evaluaciones: normalize10(flexData.evaluationVal, flexData.maxXP),
                Total: normalize10(flexData.totalVal, flexData.maxXP),
                originalExp: flexData.practiceVal,
                originalEval: flexData.evaluationVal,
                originalTotal: flexData.totalVal,
                maxXP: flexData.maxXP,
                fullMark: 10
            },
            {
                subject: 'Cognición',
                // Experiencia: Cognición = 0 (no practice XP for qualitative)
                Experiencia: 0,
                Evaluaciones: cognicionVal,
                Total: cognicionVal,
                original: cognicionVal,
                fullMark: 10
            },
        ];

        return data;
    }, [total, practice, aggregatedGoals, nextLevelConfig, isMultiple, radarStatsRaw, sourceFilter]);

    const isLoadingStats = isLoadingXP || isLoadingQual;

    // Get displayed values for qualitative cards (respect toggle)
    const getDisplayedSonido = () => {
        if (sourceFilter === 'experiencia') return 0;
        return getSonidoValue();
    };

    const getDisplayedCognicion = () => {
        if (sourceFilter === 'experiencia') return 0;
        return getCognicionValue();
    };

    return (
        <div className="space-y-6">
            {/* Source Toggle */}
            <div className="flex justify-center">
                <div className="bg-muted p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setSourceFilter('experiencia')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'experiencia'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Experiencia
                    </button>
                    <button
                        onClick={() => setSourceFilter('evaluaciones')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'evaluaciones'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Evaluaciones
                    </button>
                    <button
                        onClick={() => setSourceFilter('ambos')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'ambos'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Ambos
                    </button>
                </div>
            </div>

            {/* XP por Habilidad - 3 skill cards */}
            <Card className={componentStyles.components.cardBase}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">XP por Habilidad</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {sourceFilter === 'experiencia' && "Solo XP de práctica"}
                        {sourceFilter === 'evaluaciones' && "Solo XP de evaluaciones"}
                        {sourceFilter === 'ambos' && "Práctica + Evaluaciones"}
                    </p>
                </CardHeader>
                <CardContent>
                    <TotalXPDisplay
                        studentIds={effectiveIds}
                        filter={xpFilter}
                    />
                </CardContent>
            </Card>

            {/* Qualitative & Radar Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Qualitative Cards */}
                <div className="space-y-6">
                    {/* Sonido Card */}
                    <Card className={componentStyles.components.cardBase}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Sonido
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold">
                                    {getDisplayedSonido().toFixed(1)}
                                </span>
                                <span className="text-sm text-muted-foreground mb-1">/ 10</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {sourceFilter === 'experiencia'
                                    ? "No disponible (solo evaluaciones)"
                                    : (isMultiple ? "Promedio del grupo" : "Valoración actual")}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cognición Card */}
                    <Card className={componentStyles.components.cardBase}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Target className="w-4 h-4 text-purple-500" />
                                Cognición
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold">
                                    {getDisplayedCognicion().toFixed(1)}
                                </span>
                                <span className="text-sm text-muted-foreground mb-1">/ 10</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {sourceFilter === 'experiencia'
                                    ? "No disponible (solo evaluaciones)"
                                    : (isMultiple ? "Promedio del grupo" : "Valoración actual")}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Radar Chart - Perfil Técnico */}
                <Card className={componentStyles.components.cardBase}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Perfil Técnico</CardTitle>
                        <p className="text-sm text-muted-foreground">Comparativa de habilidades (0-10)</p>
                    </CardHeader>
                    <CardContent>
                        <HabilidadesRadarChart
                            data={radarDataForChart}
                            isLoading={isLoadingStats}
                            // Pass keys based on filter:
                            // - experiencia: only show Experiencia series
                            // - evaluaciones: only show Evaluaciones series
                            // - ambos: show all 3 series (Experiencia, Evaluaciones, Total)
                            dataKey1={sourceFilter === 'evaluaciones' ? "Evaluaciones" : (sourceFilter === 'experiencia' ? undefined : "Evaluaciones")}
                            dataKey2={sourceFilter === 'evaluaciones' ? undefined : "Experiencia"}
                            dataKey3={sourceFilter === 'ambos' ? "Total" : undefined}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* KPIs from ResumenTab */}
            <ResumenTab
                kpis={kpis}
                datosLinea={datosLinea}
                granularidad={granularidad}
                onGranularidadChange={onGranularidadChange}
            />
        </div>
    );
}

// ============================================================================
// Tab Estadísticas Content - EMBEDDED (Bloque 3) - Collapsible Vertical Sections
// ============================================================================

function TabEstadisticasContent({
    kpis, datosLinea, granularidad, onGranularidadChange, tiempoRealVsObjetivo,
    registrosFiltrados, periodoInicio, periodoFin,
    // Props for sections
    tiposBloques, topEjercicios, bloquesFiltrados, usuarios, userIdActual,
    effectiveUser, isEstu, isProf, isAdmin, estudiantesComparacion
}) {
    // Track which section is open (only one at a time, all start closed)
    const [openSectionId, setOpenSectionId] = useState(null);

    const toggleSection = (sectionKey) => {
        setOpenSectionId(prev => prev === sectionKey ? null : sectionKey);
    };

    // Collapsible section header component
    const SectionHeader = ({ sectionKey, icon: Icon, title, count }) => {
        const isExpanded = openSectionId === sectionKey;
        return (
            <button
                type="button"
                className={cn(
                    "flex items-center justify-between p-4 cursor-pointer transition-colors w-full text-left",
                    "hover:bg-[var(--color-surface-muted)]",
                    isExpanded && "border-b border-[var(--color-border-default)]"
                )}
                onClick={() => toggleSection(sectionKey)}
                aria-expanded={isExpanded}
                aria-controls={`section-content-${sectionKey}`}
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                        {title}
                    </h3>
                    {count !== undefined && (
                        <Badge variant="outline" className="ml-2">
                            {count}
                        </Badge>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[var(--color-text-secondary)] transition-transform" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)] transition-transform" />
                )}
            </button>
        );
    };

    return (
        <div className="space-y-4">
            {/* Section: General (formerly Progreso) */}
            <Card className={componentStyles.components.cardBase}>
                <SectionHeader
                    sectionKey="general"
                    icon={TrendingUp}
                    title="General"
                />
                {openSectionId === 'general' && (
                    <CardContent id="section-content-general" className="p-4 space-y-6">
                        <ProgresoTab
                            datosLinea={datosLinea}
                            granularidad={granularidad}
                            onGranularidadChange={onGranularidadChange}
                            tiempoRealVsObjetivo={tiempoRealVsObjetivo}
                            kpis={kpis}
                        />
                        <HeatmapFranjas
                            registrosFiltrados={registrosFiltrados}
                            periodoInicio={periodoInicio}
                            periodoFin={periodoFin}
                        />
                    </CardContent>
                )}
            </Card>

            {/* Section: Tipos de Bloque */}
            <Card className={componentStyles.components.cardBase}>
                <SectionHeader
                    sectionKey="tipos"
                    icon={Layers}
                    title="Tipos de Bloque"
                    count={tiposBloques?.length}
                />
                {openSectionId === 'tipos' && (
                    <CardContent id="section-content-tipos" className="p-4">
                        <TiposBloquesTab tiposBloques={tiposBloques} />
                    </CardContent>
                )}
            </Card>

            {/* Section: Top Ejercicios */}
            <Card className={componentStyles.components.cardBase}>
                <SectionHeader
                    sectionKey="top"
                    icon={Star}
                    title="Top Ejercicios"
                    count={topEjercicios?.length}
                />
                {openSectionId === 'top' && (
                    <CardContent id="section-content-top" className="p-4">
                        <TopEjerciciosTab
                            topEjercicios={topEjercicios}
                            bloquesFiltrados={bloquesFiltrados}
                            registrosFiltrados={registrosFiltrados}
                        />
                    </CardContent>
                )}
            </Card>

            {/* Sesiones section removed - now in Feedback tab */}
            {/* Comparar section removed - now an independent tab */}
        </div>
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items en Mochila</CardTitle>
                        <Backpack className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominados</CardTitle>
                        <Trophy className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.mastered}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Content Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Repertorio Activo</CardTitle>
                </CardHeader>
                <CardContent>
                    {backpackItems.length === 0 ? (
                        <EmptyState
                            icon={<Backpack className="w-12 h-12 text-muted-foreground" />}
                            title="Mochila vacía"
                            description="A medida que practiques, los ejercicios se guardarán aquí automáticamente."
                        />
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ejercicio / Item</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nivel Maestría</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Última Práctica</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backpackItems.map((item) => (
                                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">
                                                {item.backpackKey}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <Badge variant={getStatusBadgeVariant(item.status)}>
                                                    {getStatusLabel(item.status)}
                                                </Badge>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-secondary rounded-full h-2.5 max-w-[100px] overflow-hidden">
                                                        <div
                                                            className="bg-primary h-2.5 rounded-full"
                                                            style={{ width: `${Math.min(100, item.masteryScore)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{item.masteryScore} XP</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle text-muted-foreground">
                                                {item.lastPracticedAt
                                                    ? format(new Date(item.lastPracticedAt), "d MMM yyyy", { locale: es })
                                                    : '-'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
