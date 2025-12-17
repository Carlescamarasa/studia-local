import React, { useState, useMemo } from 'react';
import HabilidadesRadarChart from './HabilidadesRadarChart';
import { useHabilidadesStats, useHabilidadesStatsMultiple } from '@/hooks/useHabilidadesStats';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from './utils';
import {
    useTotalXP,
    totalXPToObject,
    useLifetimePracticeXP,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals
} from '@/hooks/useXP';
import { Activity, Target, Star, Layers, Info, TrendingUp, BookOpen, PieChart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TotalXPDisplay from './TotalXPDisplay';
import LevelBadge from '../common/LevelBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import CompactCard from './CompactCard';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { cn } from '@/lib/utils';

interface HabilidadesViewProps {
    alumnosSeleccionados?: string[];
    allStudentIds?: string[];
    userIdActual?: string;
    fechaInicio?: string;
    fechaFin?: string;
}

export default function HabilidadesView({
    alumnosSeleccionados = [],
    allStudentIds = [],
    userIdActual = '',
    fechaInicio,
    fechaFin
}: HabilidadesViewProps) {
    // =========================================================================
    // TOGGLE STATE
    // =========================================================================
    // Primary toggle: Experiencia | Evaluaciones | Ambos
    const [sourceFilter, setSourceFilter] = useState<'experiencia' | 'evaluaciones' | 'ambos'>('ambos');
    // Secondary toggle: Estado de forma | XP del rango
    const [viewMode, setViewMode] = useState<'forma' | 'rango'>('forma');

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
    const { data: totalXPSingle, isLoading: isLoadingTotalSingle } = useTotalXP(singleId);
    const { data: practiceXPSingle, isLoading: isLoadingPracticeSingle } = useLifetimePracticeXP(singleId);

    // Multi-student hooks
    const { data: totalXPMultiple, isLoading: isLoadingTotalMultiple } = useTotalXPMultiple(isMultiple ? effectiveIds : []);
    const { data: practiceXPMultiple, isLoading: isLoadingPracticeMultiple } = useLifetimePracticeXPMultiple(isMultiple ? effectiveIds : []);

    // Aggregated Goals (maxXP denominator)
    const aggregatedGoals = useAggregateLevelGoals(effectiveIds);

    // Level config for single student
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
            return configs.find((c: any) => c.level === nextLevel) || null;
        },
        enabled: !isMultiple && !!nextLevel
    });

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
    const { radarStats: singleStats, isLoading: loadingQualSingle } = useHabilidadesStats(isMultiple ? '' : singleId);
    const { radarStats: multipleStats, isLoading: loadingQualMultiple } = useHabilidadesStatsMultiple(isMultiple ? effectiveIds : []);

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
        if (!nextLevelConfig) return 100;
        switch (skill) {
            case 'motricidad': return nextLevelConfig.minXpMotr || 100;
            case 'articulacion': return nextLevelConfig.minXpArt || 100;
            case 'flexibilidad': return nextLevelConfig.minXpFlex || 100;
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
    }, [total, practice, aggregatedGoals, nextLevelConfig, isMultiple, radarStatsRaw]);

    // Displayed qualitative values (respect toggle)
    const getDisplayedSonido = () => sourceFilter === 'experiencia' ? 0 : getSonidoValue();
    const getDisplayedCognicion = () => sourceFilter === 'experiencia' ? 0 : getCognicionValue();

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <div className="space-y-4">
            {/* Habilidades Tile - 2 Column Layout */}
            <CompactCard title="Habilidades">
                {/* 
                    GRID LAYOUT:
                    Desktop: 2 Columns (Left: content, Right: toggles+radar)
                    Mobile: Stack (content first, then radar)
                */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

                    {/* LEFT COLUMN: Subheader + Summary Bar + Cards */}
                    <div className="flex flex-col gap-3">

                        {/* Subheader: "Estado de forma actual" + (i) */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--color-text-secondary)]">
                                {viewMode === 'forma' ? 'Estado de forma actual' : 'XP del rango seleccionado'}
                            </span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-0.5 rounded-full hover:bg-[var(--color-surface-muted)] transition-colors">
                                            <Info className="w-3.5 h-3.5 text-[var(--color-text-secondary)] opacity-70" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[200px]">
                                        <p className="text-xs">
                                            {viewMode === 'forma'
                                                ? 'Muestra tu nivel basado en los últimos 30 días.'
                                                : 'Muestra el XP acumulado en las fechas seleccionadas.'}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Summary Bar: Nivel | Cognición | Sonido | Leyenda */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 px-4 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/30">

                            {/* Nivel */}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    Nivel {currentLevel}
                                </span>
                                <span className="text-base font-bold text-[var(--color-text-primary)]">
                                    {studentProfile?.etiquetaNivel || (currentLevel >= 10 ? "Profesional" : currentLevel >= 7 ? "Avanzado" : currentLevel >= 4 ? "Intermedio" : "Principiante")}
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block w-px h-8 bg-[var(--color-border)]/50" />

                            {/* Cognición */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/10">
                                    <Target className="w-3.5 h-3.5 text-purple-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase">Cognición</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-lg font-bold text-[var(--color-text-primary)]">{getDisplayedCognicion().toFixed(1)}</span>
                                        <span className="text-[10px] text-[var(--color-text-secondary)]">/10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sonido */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10">
                                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase">Sonido</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-lg font-bold text-[var(--color-text-primary)]">{getDisplayedSonido().toFixed(1)}</span>
                                        <span className="text-[10px] text-[var(--color-text-secondary)]">/10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Leyenda (when ambos) */}
                            {sourceFilter === 'ambos' && (
                                <>
                                    <div className="hidden sm:block w-px h-8 bg-[var(--color-border)]/50" />
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#374151]" />
                                            <span className="text-[10px] text-[var(--color-text-secondary)]">Total</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                                            <span className="text-[10px] text-[var(--color-text-secondary)]">Exp</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                                            <span className="text-[10px] text-[var(--color-text-secondary)]">Eval</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Cards: Flexibilidad | Articulación | Motricidad */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { key: 'flexibilidad', label: 'Flexibilidad', color: 'text-purple-500' },
                                { key: 'articulacion', label: 'Articulación', color: 'text-green-500' },
                                { key: 'motricidad', label: 'Motricidad', color: 'text-blue-500' }
                            ].map((item) => {
                                const vals = getXPValues(item.key as any);
                                const val = sourceFilter === 'experiencia' ? vals.practiceVal :
                                    sourceFilter === 'evaluaciones' ? vals.evaluationVal : vals.totalVal;

                                return (
                                    <div key={item.key} className="flex flex-col p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-all shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <TrendingUp className={cn("w-3.5 h-3.5", item.color)} />
                                            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] truncate">
                                                {item.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-col mt-auto">
                                            <span className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] leading-none mb-0.5">
                                                {Math.round(val)}
                                            </span>
                                            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                                                / {vals.maxXP} XP
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Toggles (stacked) + Radar */}
                    <div className="flex flex-col items-end gap-3 overflow-hidden">

                        {/* Toggles: Row 1 (Exp/Eval/Ambos), Row 2 (Forma/Rango) */}
                        <div className="flex flex-col items-end gap-1.5">
                            {/* Row 1: Exp | Eval | Ambos */}
                            <div className="flex bg-[var(--color-surface-muted)] rounded-md p-0.5">
                                <button
                                    onClick={() => setSourceFilter('experiencia')}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded transition-all",
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
                                        "px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded transition-all",
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
                                        "px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded transition-all",
                                        sourceFilter === 'ambos'
                                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    Ambos
                                </button>
                            </div>

                            {/* Row 2: Forma | Rango */}
                            <div className="flex bg-[var(--color-surface-muted)] rounded-md p-0.5">
                                <button
                                    onClick={() => setViewMode('forma')}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded transition-all",
                                        viewMode === 'forma'
                                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    Forma
                                </button>
                                <button
                                    onClick={() => setViewMode('rango')}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded transition-all",
                                        viewMode === 'rango'
                                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                    )}
                                >
                                    Rango
                                </button>
                            </div>
                        </div>

                        {/* Radar Chart (constrained size, no overflow) */}
                        <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                            <div className="w-full max-w-[280px] max-h-[280px] aspect-square">
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
                    </div>

                </div>
            </CompactCard>
        </div>
    );
}
