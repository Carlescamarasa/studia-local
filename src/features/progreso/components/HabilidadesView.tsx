import React, { useState, useMemo, useEffect } from 'react';
import HabilidadesRadarChart from './HabilidadesRadarChart';
import { useHabilidadesStats, useHabilidadesStatsMultiple } from '../hooks/useHabilidadesStats';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '../utils/progresoUtils';
import {
    useTotalXP,
    totalXPToObject,
    useLifetimePracticeXP,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals
} from '../hooks/useXP';
import { Activity, Target, Star, Layers, Info, TrendingUp, BookOpen, PieChart, CheckCircle2, Circle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TotalXPDisplay from './TotalXPDisplay';
import LevelBadge from '@/components/common/LevelBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import CompactCard from './CompactCard';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { useUsers } from '@/hooks/entities/useUsers';
import { useLevelConfig } from '@/hooks/entities/useLevelsConfig';
import { cn } from '@/lib/utils';
import { computeKeyCriteriaStatus, CriteriaStatusResult } from '@/utils/levelLogic';
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { Checkbox } from '@/components/ui/checkbox';

interface HabilidadesViewProps {
    alumnosSeleccionados?: string[];
    allStudentIds?: string[];
    userIdActual?: string;
    fechaInicio?: string;
    fechaFin?: string;
    /** Hide the Forma/Rango toggle (for Resumen tab) */
    hideViewModeToggle?: boolean;
    /** Force a specific view mode when toggle is hidden */
    forceViewMode?: 'forma' | 'rango';
    /** Optional custom title override */
    customTitle?: string;

    // Data props for deduplication
    xpData?: any[];
    evaluations?: any[];
    feedbacks?: any[];
    users?: any[]; // Full user objects
}

export default function HabilidadesView({
    alumnosSeleccionados = [],
    allStudentIds = [],
    userIdActual = '',
    fechaInicio,
    fechaFin,
    hideViewModeToggle = false,
    forceViewMode,
    customTitle,
    xpData,
    evaluations,
    feedbacks,
    users = []
}: HabilidadesViewProps) {
    // =========================================================================
    // TOGGLE STATE
    // =========================================================================
    // Primary toggle: Experiencia | Evaluaciones | Ambos
    const [sourceFilter, setSourceFilter] = useState<'experiencia' | 'evaluaciones' | 'ambos'>('ambos');
    // Secondary toggle: Estado de forma | XP del rango (controlled by forceViewMode if hideViewModeToggle)
    const [viewMode, setViewMode] = useState<'forma' | 'rango'>(forceViewMode || 'forma');

    // Use forced mode when toggle is hidden
    const effectiveViewMode = hideViewModeToggle && forceViewMode ? forceViewMode : viewMode;

    // =========================================================================
    // EFFECTIVE IDs LOGIC (same as Resumen)
    // =========================================================================
    const isGlobalDefault = alumnosSeleccionados.length === 0 && allStudentIds.length > 0;
    const effectiveIds = isGlobalDefault
        ? allStudentIds
        : (alumnosSeleccionados.length > 0 ? alumnosSeleccionados : [userIdActual].filter(Boolean));

    const isMultiple = effectiveIds.length > 1;
    const singleId = effectiveIds.length === 1 ? effectiveIds[0] : '';

    // =========================================================================
    // XP DATA HOOKS (same as Resumen / TotalXPDisplay)
    // =========================================================================

    // Single student hooks
    const { data: totalXPSingle, isLoading: isLoadingTotalSingle } = useTotalXP(singleId, xpData);
    const { data: practiceXPSingle, isLoading: isLoadingPracticeSingle } = useLifetimePracticeXP(singleId, xpData);

    // Multi-student hooks
    const { data: totalXPMultiple, isLoading: isLoadingTotalMultiple } = useTotalXPMultiple(isMultiple ? effectiveIds : [], xpData);
    const { data: practiceXPMultiple, isLoading: isLoadingPracticeMultiple } = useLifetimePracticeXPMultiple(isMultiple ? effectiveIds : [], xpData);

    // Aggregated Goals (maxXP denominator)
    const aggregatedGoals = useAggregateLevelGoals(effectiveIds);

    // OPTIMIZED: Use useUsers() for all user data (both single and multiple students)
    const { data: usersFromHook = [], isLoading: isLoadingUsers } = useUsers();

    // Single student profile - lookup from cache instead of individual query
    const studentProfile = useMemo(() => {
        if (isMultiple || !singleId) return null;
        // First check provided users prop, then fallback to hook data
        if (users && users.length > 0) {
            return users.find(u => u.id === singleId) || null;
        }
        return usersFromHook.find((u: any) => u.id === singleId) || null;
    }, [isMultiple, singleId, users, usersFromHook]);

    // Profiles for multiple students (for level grouping)
    // DEDUPLICATION: Use provided users prop if available
    const multipleStudentProfiles = useMemo(() => {
        if (users && users.length > 0) {
            return users.filter(u => effectiveIds.includes(u.id));
        }
        return [];
    }, [users, effectiveIds]);

    const fetchedMultipleProfiles = useMemo(() => {
        if (users && users.length > 0) return [];
        if (!isMultiple || effectiveIds.length === 0) return [];
        return usersFromHook.filter((u: any) => effectiveIds.includes(u.id));
    }, [isMultiple, effectiveIds, usersFromHook, users]);

    const activeMultipleProfiles = (users && users.length > 0) ? multipleStudentProfiles : fetchedMultipleProfiles;

    // Group students by level for multi-student display
    const levelGroups = useMemo(() => {
        if (!isMultiple || activeMultipleProfiles.length === 0) return [];

        const groups: Record<number, { level: number; label: string; students: { id: string; name: string }[] }> = {};

        activeMultipleProfiles.forEach((profile: any) => {
            const level = profile.nivelTecnico || 1;
            if (!groups[level]) {
                const label = level >= 10 ? "Profesional" : level >= 7 ? "Avanzado" : level >= 4 ? "Intermedio" : "Principiante";
                groups[level] = { level, label, students: [] };
            }
            const name = profile.fullName || profile.email?.split('@')[0] || 'Sin nombre';
            groups[level].students.push({ id: profile.id, name });
        });

        // Sort by level ascending
        return Object.values(groups).sort((a, b) => a.level - b.level);
    }, [isMultiple, activeMultipleProfiles]);

    const currentLevel = studentProfile?.nivelTecnico || 1;
    // Note: We show criteria for currentLevel (what student achieved/needs at this level)

    const currentLevelConfig = useLevelConfig(currentLevel || 0);

    // =========================================================================
    // LEVEL CRITERIA STATE (for single student)
    // =========================================================================
    const effectiveUser = useEffectiveUser();
    const [currentLevelCriteria, setCurrentLevelCriteria] = useState<CriteriaStatusResult[]>([]);
    const [loadingCriteria, setLoadingCriteria] = useState(false);

    // Load level criteria when single student is selected
    useEffect(() => {
        const loadCriteria = async () => {
            if (!singleId || isMultiple) {
                setCurrentLevelCriteria([]);
                return;
            }
            setLoadingCriteria(true);
            try {
                const criteria = await computeKeyCriteriaStatus(singleId, currentLevel);
                setCurrentLevelCriteria(criteria);
            } catch (error) {
                console.error('Error loading criteria:', error);
                setCurrentLevelCriteria([]);
            } finally {
                setLoadingCriteria(false);
            }
        };
        loadCriteria();
    }, [singleId, isMultiple, currentLevel]);

    // Handle criteria toggle (for PROF/ADMIN only)
    const handleCriteriaToggle = async (criterionId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PASSED' ? 'FAILED' : 'PASSED';

        // Optimistic update
        setCurrentLevelCriteria(prev => prev.map(c =>
            c.criterion.id === criterionId ? { ...c, status: newStatus as any } : c
        ));

        try {
            const allStatus = await localDataClient.entities.StudentCriteriaStatus.list();
            const existing = allStatus.find((s: any) => s.studentId === singleId && s.criterionId === criterionId);

            if (existing && existing.id && existing.id.length === 36) {
                await localDataClient.entities.StudentCriteriaStatus.update(existing.id, { status: newStatus });
            } else {
                await localDataClient.entities.StudentCriteriaStatus.create({
                    studentId: singleId,
                    criterionId: criterionId,
                    status: newStatus,
                    assessedAt: new Date().toISOString(),
                    assessedBy: effectiveUser?.effectiveUserId
                });
            }
        } catch (error) {
            console.error('Error updating criteria:', error);
            // Reload on error
            const criteria = await computeKeyCriteriaStatus(singleId, currentLevel);
            setCurrentLevelCriteria(criteria);
        }
    };

    const canEdit = effectiveUser?.effectiveRole === 'PROF' || effectiveUser?.effectiveRole === 'ADMIN';

    // Use appropriate data
    const totalXP = isMultiple ? totalXPMultiple : totalXPSingle;
    const practiceXP = isMultiple ? practiceXPMultiple : practiceXPSingle;
    const isLoadingXP = isMultiple
        ? (isLoadingTotalMultiple || isLoadingPracticeMultiple)
        : (isLoadingTotalSingle || isLoadingPracticeSingle);

    const total = totalXPToObject(totalXP);
    const practice = practiceXP || { motricidad: 0, articulacion: 0, flexibilidad: 0 };

    // =========================================================================
    // QUALITATIVE DATA HOOKS (for Sonido/Cognición)
    // =========================================================================
    // Pass provided data for deduplication
    const hookOptions = {
        providedXPData: xpData,
        providedEvaluations: evaluations,
        providedFeedbacks: feedbacks
    };

    const { radarStats: singleStats, isLoading: loadingQualSingle } = useHabilidadesStats(isMultiple ? '' : singleId, hookOptions);
    const { radarStats: multipleStats, isLoading: loadingQualMultiple } = useHabilidadesStatsMultiple(isMultiple ? effectiveIds : [], hookOptions);

    const radarStatsRaw = isMultiple ? multipleStats : singleStats;
    const isLoadingQual = isMultiple ? loadingQualMultiple : loadingQualSingle;
    const isLoadingStats = isLoadingXP || isLoadingQual;

    // =========================================================================
    // HELPER FUNCTIONS (same as Resumen)
    // =========================================================================

    const getRequiredXP = (skill: 'motricidad' | 'articulacion' | 'flexibilidad') => {
        if (isMultiple) {
            return aggregatedGoals[skill] || 100;
        }
        if (!currentLevelConfig) return 100;
        switch (skill) {
            case 'motricidad': return currentLevelConfig.minXpMotr || 100;
            case 'articulacion': return currentLevelConfig.minXpArt || 100;
            case 'flexibilidad': return currentLevelConfig.minXpFlex || 100;
            default: return 100;
        }
    };

    const getXPValues = (skill: 'motricidad' | 'articulacion' | 'flexibilidad') => {
        const totalVal = total[skill] || 0;
        const practiceVal = practice[skill] || 0;
        const evaluationVal = Math.max(0, totalVal - practiceVal);
        const maxXP = getRequiredXP(skill);
        return { practiceVal, evaluationVal, totalVal, maxXP };
    };

    const getSonidoValue = () => {
        return radarStatsRaw?.combinedData?.find((d: any) => d.subject === 'Sonido')?.original ?? 0;
    };

    const getCognicionValue = () => {
        return radarStatsRaw?.combinedData?.find((d: any) => d.subject === 'Cognición')?.original ?? 0;
    };

    // =========================================================================
    // RADAR DATA (same logic as Resumen)
    // =========================================================================
    const xpFilter = useMemo(() => {
        if (sourceFilter === 'experiencia') return ['experiencia'];
        if (sourceFilter === 'evaluaciones') return ['evaluaciones'];
        return ['experiencia', 'evaluaciones'];
    }, [sourceFilter]);

    const radarDataForChart = useMemo(() => {
        const normalize10 = (xp: number, maxXp: number) => {
            if (maxXp <= 0 || !Number.isFinite(xp) || !Number.isFinite(maxXp)) return 0;
            return Math.min(10, Math.max(0, (xp / maxXp) * 10));
        };

        const motrData = getXPValues('motricidad');
        const artData = getXPValues('articulacion');
        const flexData = getXPValues('flexibilidad');

        const sonidoVal = getSonidoValue();
        const cognicionVal = getCognicionValue();

        return [
            {
                subject: 'Sonido',
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
                Experiencia: 0,
                Evaluaciones: cognicionVal,
                Total: cognicionVal,
                original: cognicionVal,
                fullMark: 10
            },
        ];
    }, [total, practice, aggregatedGoals, currentLevelConfig, isMultiple, radarStatsRaw]);

    // Displayed qualitative values (respect toggle)
    const getDisplayedSonido = () => sourceFilter === 'experiencia' ? 0 : getSonidoValue();
    const getDisplayedCognicion = () => sourceFilter === 'experiencia' ? 0 : getCognicionValue();

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <div className="space-y-4">
            {/* Habilidades Tile - 2 Column Layout */}
            <CompactCard>
                {/* GRID: 2 Columns (Left: header+summary+cards, Right: radar from top) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* LEFT COLUMN: Header + Summary Bar + Cards */}
                    <div className="flex flex-col gap-3 self-start">

                        {/* Row 1: Title */}
                        <span className="text-base font-semibold">
                            {customTitle
                                ? customTitle
                                : (effectiveViewMode === 'forma'
                                    ? 'Estado de forma actual'
                                    : `XP del rango seleccionado${fechaInicio && fechaFin ? ` · ${format(parseLocalDate(fechaInicio), 'd MMM', { locale: es })} - ${format(parseLocalDate(fechaFin), 'd MMM yyyy', { locale: es })}` : ''}`
                                )
                            }
                        </span>

                        {/* Row 2: Toggles */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]/30">
                            {/* Forma/Rango - only show if not hidden */}
                            {!hideViewModeToggle && (
                                <div className="flex bg-[var(--color-surface-muted)] rounded-md p-0.5">
                                    <button
                                        onClick={() => setViewMode('forma')}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-all",
                                            effectiveViewMode === 'forma'
                                                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        Forma
                                    </button>
                                    <button
                                        onClick={() => setViewMode('rango')}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-all",
                                            effectiveViewMode === 'rango'
                                                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        Rango
                                    </button>
                                </div>
                            )}

                            {/* Exp/Eval/Ambos + info */}
                            <div className="flex items-center gap-2">
                                <div className="flex bg-[var(--color-surface-muted)] rounded-md p-0.5">
                                    <button
                                        onClick={() => setSourceFilter('experiencia')}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-all",
                                            sourceFilter === 'experiencia'
                                                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        Exp
                                    </button>
                                    <button
                                        onClick={() => setSourceFilter('evaluaciones')}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-all",
                                            sourceFilter === 'evaluaciones'
                                                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        Eval
                                    </button>
                                    <button
                                        onClick={() => setSourceFilter('ambos')}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-all",
                                            sourceFilter === 'ambos'
                                                ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        Ambos
                                    </button>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button className="p-0.5 rounded-full hover:bg-[var(--color-surface-muted)] transition-colors">
                                                <Info className="w-3.5 h-3.5 text-[var(--color-text-secondary)] opacity-70" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[250px]">
                                            <div className="text-xs space-y-1">
                                                <p><strong>Exp:</strong> Datos de sesiones de práctica.</p>
                                                <p><strong>Eval:</strong> Datos de evaluaciones del profesor.</p>
                                                <p><strong>Ambos:</strong> Total combinando ambas fuentes.</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        {/* Summary Bar: Grid 4 columns responsive */}
                        {/* Mobile: row1=[Nivel, Leyenda] row2=[Cognición, Sonido] | Desktop: inline */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 px-3 bg-[var(--color-surface-muted)]/20 rounded-lg">

                            {/* Nivel - order-1 (first on mobile and desktop) */}
                            <div className="flex flex-col order-1 sm:order-1">
                                {!isMultiple ? (
                                    // Single student: show level and name
                                    <>
                                        <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                            Nivel {currentLevel}
                                        </span>
                                        <span className="text-sm font-bold text-[var(--color-text-primary)]">
                                            {studentProfile?.fullName || studentProfile?.email?.split('@')[0] || 'Estudiante'}
                                        </span>
                                    </>
                                ) : (
                                    // Multiple students: show grouped levels with tooltips
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                            Niveles
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {levelGroups.map((group) => (
                                                <TooltipProvider key={group.level}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--color-surface-muted)] text-[10px] font-medium text-[var(--color-text-primary)] rounded cursor-help">
                                                                <span>{group.students.length}</span>
                                                                <span className="text-[var(--color-text-secondary)]">Nv{group.level}</span>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="max-w-[200px]">
                                                            <div className="text-xs">
                                                                <p className="font-semibold mb-1">Nivel {group.level} · {group.label}</p>
                                                                <ul className="space-y-0.5">
                                                                    {group.students.map((s) => (
                                                                        <li key={s.id} className="text-[var(--color-text-secondary)]">• {s.name}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Leyenda - order-2 on mobile (next to Nivel), order-4 on desktop (last) */}
                            {sourceFilter === 'ambos' && (
                                <div className="flex flex-col gap-0.5 order-2 sm:order-4">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#374151]" />
                                        <span className="text-[9px] text-[var(--color-text-secondary)]">Total</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                                        <span className="text-[9px] text-[var(--color-text-secondary)]">Exp</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                                        <span className="text-[9px] text-[var(--color-text-secondary)]">Eval</span>
                                    </div>
                                </div>
                            )}

                            {/* Cognición - order-3 on mobile (row 2 left), order-2 on desktop */}
                            <div className="flex items-center gap-1.5 order-3 sm:order-2">
                                <Target className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase leading-tight">Cognición</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className={cn(
                                            "text-base font-bold",
                                            sourceFilter === 'experiencia' ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
                                        )}>
                                            {getDisplayedCognicion().toFixed(1)}
                                        </span>
                                        <span className="text-[9px] text-[var(--color-text-secondary)]">/10</span>
                                    </div>
                                    {sourceFilter === 'experiencia' && (
                                        <span className="text-[8px] text-[var(--color-text-secondary)] italic">Solo Eval</span>
                                    )}
                                </div>
                            </div>

                            {/* Sonido - order-4 on mobile (row 2 right), order-3 on desktop */}
                            <div className="flex items-center gap-1.5 order-4 sm:order-3">
                                <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase leading-tight">Sonido</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className={cn(
                                            "text-base font-bold",
                                            sourceFilter === 'experiencia' ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
                                        )}>
                                            {getDisplayedSonido().toFixed(1)}
                                        </span>
                                        <span className="text-[9px] text-[var(--color-text-secondary)]">/10</span>
                                    </div>
                                    {sourceFilter === 'experiencia' && (
                                        <span className="text-[8px] text-[var(--color-text-secondary)] italic">Solo Eval</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Cards: Flexibilidad | Articulación | Motricidad */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { key: 'flexibilidad', label: 'Flexibilidad', color: 'text-purple-500' },
                                { key: 'articulacion', label: 'Articulación', color: 'text-green-500' },
                                { key: 'motricidad', label: 'Motricidad', color: 'text-blue-500' }
                            ].map((item) => {
                                const vals = getXPValues(item.key as any);
                                const val = sourceFilter === 'experiencia' ? vals.practiceVal :
                                    sourceFilter === 'evaluaciones' ? vals.evaluationVal : vals.totalVal;

                                return (
                                    <div key={item.key} className="flex flex-col p-2.5 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-all">
                                        <div className="flex items-center gap-1 mb-1">
                                            <TrendingUp className={cn("w-3 h-3", item.color)} />
                                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] truncate">
                                                {item.label}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] leading-none">
                                                {Math.round(val)}
                                            </span>
                                            <span className="text-[9px] text-[var(--color-text-secondary)]">
                                                /{vals.maxXP}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Level Requirements - only show in single student mode with criteria */}
                        {!isMultiple && currentLevelCriteria.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)]/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] font-semibold">
                                        Criterios Nivel {currentLevel}
                                    </span>
                                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                                        {currentLevelCriteria.filter(c => c.status === 'PASSED').length}/{currentLevelCriteria.length}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {currentLevelCriteria.map((item) => {
                                        const isPassed = item.status === 'PASSED';
                                        const isEditable = canEdit && item.criterion.source === 'PROF';

                                        return (
                                            <div
                                                key={item.criterion.id}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-all",
                                                    isPassed
                                                        ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]"
                                                        : "bg-[var(--color-surface-muted)] border-[var(--color-border)]/30 text-[var(--color-text-secondary)]",
                                                    isEditable && "cursor-pointer hover:border-[var(--color-primary)]/50"
                                                )}
                                                onClick={() => isEditable && handleCriteriaToggle(item.criterion.id, item.status)}
                                            >
                                                {isPassed ? (
                                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                                ) : (
                                                    <Circle className="w-3 h-3 shrink-0" />
                                                )}
                                                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                                                    {item.criterion.description}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Radar only (fills space) */}
                    <div className="flex items-center justify-center">
                        <HabilidadesRadarChart
                            data={radarDataForChart}
                            isLoading={isLoadingStats}
                            dataKey1={sourceFilter === 'evaluaciones' ? "Evaluaciones" : (sourceFilter === 'experiencia' ? undefined : "Evaluaciones")}
                            dataKey2={sourceFilter === 'evaluaciones' ? undefined : "Experiencia"}
                            dataKey3={sourceFilter === 'ambos' ? "Total" : undefined}
                            compact
                            hideLegend
                        />
                    </div>

                </div>
            </CompactCard>
        </div>
    );
}
