import React, { useState, useMemo } from 'react';
import HabilidadesRadarChart from './HabilidadesRadarChart';
import { useHabilidadesStats, useHabilidadesStatsMultiple } from '@/hooks/useHabilidadesStats';
import {
    useTotalXP,
    totalXPToObject,
    useLifetimePracticeXP,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals
} from '@/hooks/useXP';
import { Activity, Target, Star, Layers } from 'lucide-react';
import TotalXPDisplay from './TotalXPDisplay';
import LevelBadge from '../common/LevelBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { cn } from '@/lib/utils';

interface HabilidadesViewProps {
    alumnosSeleccionados?: string[];
    allStudentIds?: string[];
    userIdActual?: string;
}

export default function HabilidadesView({
    alumnosSeleccionados = [],
    allStudentIds = [],
    userIdActual = ''
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
        <div className="space-y-6">
            {/* Primary Toggle: Experiencia / Evaluaciones / Ambos */}
            <div className="flex justify-center">
                <div className="flex bg-[var(--color-surface-muted)] p-1 rounded-lg">
                    <button
                        onClick={() => setSourceFilter('experiencia')}
                        className={cn(
                            "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'experiencia'
                                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        <Star className="w-4 h-4 mr-2" />
                        Experiencia
                    </button>
                    <button
                        onClick={() => setSourceFilter('evaluaciones')}
                        className={cn(
                            "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'evaluaciones'
                                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        <Target className="w-4 h-4 mr-2" />
                        Evaluaciones
                    </button>
                    <button
                        onClick={() => setSourceFilter('ambos')}
                        className={cn(
                            "flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            sourceFilter === 'ambos'
                                ? "bg-[var(--color-surface-default)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        Ambos
                    </button>
                </div>
            </div>

            {/* Estado de Forma Actual Block */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-semibold">Estado de Forma Actual</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {viewMode === 'forma' ? 'Progreso acumulado en los últimos 30 días' : 'XP del rango de fechas seleccionado'}
                            </p>
                        </div>
                        {/* Secondary Toggle: Estado de forma / XP del rango */}
                        <div className="bg-muted/50 p-1 rounded-lg inline-flex">
                            <button
                                onClick={() => setViewMode('forma')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded transition-all",
                                    viewMode === 'forma'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Estado de forma
                            </button>
                            <button
                                onClick={() => setViewMode('rango')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded transition-all",
                                    viewMode === 'rango'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                XP del rango
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Level + Qualitative Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Level Badge */}
                        <Card className="bg-muted/20 border-none shadow-none flex flex-col justify-center items-center p-4">
                            <LevelBadge level={currentLevel} label={null} />
                            <div className="mt-2 text-center">
                                <h4 className="font-bold">Nivel {currentLevel}</h4>
                                <p className="text-xs text-muted-foreground">Nivel actual</p>
                            </div>
                        </Card>

                        {/* Sonido Card */}
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                                <Activity className="w-5 h-5 text-blue-500 mb-2" />
                                <div className="text-3xl font-bold">
                                    {getDisplayedSonido().toFixed(1)}
                                    <span className="text-sm text-muted-foreground font-normal">/10</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Sonido</div>
                                {sourceFilter === 'experiencia' && (
                                    <p className="text-xs text-muted-foreground opacity-60">No disponible</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cognición Card */}
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                                <Target className="w-5 h-5 text-purple-500 mb-2" />
                                <div className="text-3xl font-bold">
                                    {getDisplayedCognicion().toFixed(1)}
                                    <span className="text-sm text-muted-foreground font-normal">/10</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Cognición</div>
                                {sourceFilter === 'experiencia' && (
                                    <p className="text-xs text-muted-foreground opacity-60">No disponible</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Radar Chart */}
                    <div className="flex justify-center">
                        <div className="w-full max-w-lg">
                            <HabilidadesRadarChart
                                data={radarDataForChart}
                                isLoading={isLoadingStats}
                                dataKey1={sourceFilter === 'evaluaciones' ? "Evaluaciones" : (sourceFilter === 'experiencia' ? undefined : "Evaluaciones")}
                                dataKey2={sourceFilter === 'evaluaciones' ? undefined : "Experiencia"}
                                dataKey3={sourceFilter === 'ambos' ? "Total" : undefined}
                            />
                        </div>
                    </div>

                    {/* XP por Habilidad */}
                    <div className="p-4 border rounded-md bg-muted/20">
                        <h5 className="font-medium text-sm mb-1">XP por Habilidad</h5>
                        <p className="text-xs text-muted-foreground mb-3">
                            {sourceFilter === 'experiencia' && "Solo XP de práctica"}
                            {sourceFilter === 'evaluaciones' && "Solo XP de evaluaciones"}
                            {sourceFilter === 'ambos' && "Práctica + Evaluaciones"}
                        </p>
                        <TotalXPDisplay studentIds={effectiveIds} filter={xpFilter} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
