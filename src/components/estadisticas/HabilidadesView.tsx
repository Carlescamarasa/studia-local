import React, { useState, useMemo, useEffect } from 'react';
import HabilidadesRadarChart from './HabilidadesRadarChart';
import { useHabilidadesStats } from '@/hooks/useHabilidadesStats';
import { useRecentXP, useTotalXP, totalXPToObject, useLifetimePracticeXP } from '@/hooks/useXP';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Activity, ClipboardList, Layers, User } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
// @ts-ignore
import { displayName } from '../utils/helpers';
import TotalXPDisplay from './TotalXPDisplay';
import LevelBadge from '../common/LevelBadge';
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';

interface HabilidadesViewProps {
    alumnoId?: string;
    students?: any[];
    enableSelection?: boolean;
    showTitle?: boolean;
}

export default function HabilidadesView({
    alumnoId,
    students = [],
    enableSelection = false,
    showTitle = true
}: HabilidadesViewProps) {
    const [filter, setFilter] = useState<string[]>(['evaluaciones', 'experiencia']);
    const [internalSelectedId, setInternalSelectedId] = useState<string>(alumnoId || '');

    // Update internal selection if prop changes
    useEffect(() => {
        if (alumnoId && !enableSelection) {
            setInternalSelectedId(alumnoId);
        }
    }, [alumnoId, enableSelection]);

    const targetId = enableSelection ? internalSelectedId : alumnoId;

    // Fetch data
    const { radarStats, isLoading: isLoadingStats } = useHabilidadesStats(targetId);
    const { data: totalXP } = useTotalXP(targetId);
    const { data: practiceXP } = useLifetimePracticeXP(targetId);
    // Fetch recent XP for "Form" radar (90 days)
    const { data: recentXP, isLoading: isLoadingRecent } = useRecentXP(targetId, 90);

    // Fetch student profile and next level config
    const { data: studentProfile } = useQuery({
        queryKey: ['student-profile', targetId],
        queryFn: () => localDataClient.entities.User.get(targetId),
        enabled: !!targetId,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const currentLevel = studentProfile?.nivelTecnico || 0;
    const nextLevel = currentLevel + 1;

    // Fetch ALL level configs with shared cache
    const { data: allLevelConfigs } = useQuery({
        queryKey: ['levels-config-all'],
        queryFn: () => localDataClient.entities.LevelConfig.list(),
        staleTime: 10 * 60 * 1000, // 10 minutos - configuración cambia poco
    });

    // Filter to get specific level config with useMemo
    const nextLevelConfig = useMemo(() => {
        if (!allLevelConfigs || !nextLevel) return null;
        return allLevelConfigs.find((c: any) => c.level === nextLevel) || null;
    }, [allLevelConfigs, nextLevel]);

    // --- Radar 1: Total Progress (Normalized to Next Level) ---
    const totalRadarData = useMemo(() => {
        if (!totalXP || !nextLevelConfig) return [];

        const total = totalXPToObject(totalXP);
        const practice = practiceXP || { motricidad: 0, articulacion: 0, flexibilidad: 0 };

        // Helper to get normalized value (0-100% of requirement)
        const getNormalized = (skill: string, val: number, req: number) => {
            if (!req) return 100; // If no requirement, assume 100%
            return Math.min(100, (val / req) * 100);
        };

        // Helper to get value based on filter
        const getValue = (skill: 'motricidad' | 'articulacion' | 'flexibilidad', req: number) => {
            const tot = total[skill];
            const prac = practice[skill];
            const evalVal = Math.max(0, tot - prac);

            // Scale to 0-10 for chart (0-100% -> 0-10)
            const normPrac = getNormalized(skill, prac, req) / 10;
            const normEval = getNormalized(skill, evalVal, req) / 10;
            const normTot = getNormalized(skill, tot, req) / 10;

            const showEval = filter.includes('evaluaciones');
            const showPrac = filter.includes('experiencia');
            const showTotal = showEval && showPrac;

            return {
                A: showEval ? normEval : 0,
                B: showPrac ? normPrac : 0,
                C: showTotal ? normTot : 0,
                original: evalVal,
                originalExperiencia: prac,
                originalTotal: tot
            };
        };

        const motr = getValue('motricidad', nextLevelConfig.minXpMotr || 0);
        const art = getValue('articulacion', nextLevelConfig.minXpArt || 0);
        const flex = getValue('flexibilidad', nextLevelConfig.minXpFlex || 0);

        // Qualitative stats (0-10 -> 0-100)
        // These are snapshots from latest evaluation
        // 'original' from radarStats is already scaled 0-100 by computeEvaluationXP -> useHabilidadesStats
        const sonidoRaw = (radarStats?.evaluationData?.find(d => d.subject === 'Sonido')?.original || 0);
        const cogRaw = (radarStats?.evaluationData?.find(d => d.subject === 'Cognición')?.original || 0);

        const sonidoVal = sonidoRaw;
        const cogVal = cogRaw;

        // For qualitative, "Evaluation" filter shows them. "Experience" hides them?
        // User said: "En modo Experiencia, Sonido/Cognición no deben aparecer en verde ni mostrar 0 XP"
        // So if filter is 'experiencia', these should be 0 or hidden.

        const showQualitative = filter.includes('evaluaciones');

        // Scale qualitative to 0-10 for chart
        const qualChartVal = showQualitative ? (sonidoVal / 10) : 0;
        const cogChartVal = showQualitative ? (cogVal / 10) : 0;

        return [
            { subject: 'Sonido', A: qualChartVal, B: 0, C: qualChartVal, fullMark: 100, original: sonidoVal, originalTotal: sonidoVal },
            { subject: 'Cognición', A: cogChartVal, B: 0, C: cogChartVal, fullMark: 100, original: showQualitative ? cogVal : 0, originalTotal: showQualitative ? cogVal : 0 },
            { subject: 'Articulación', ...art, fullMark: 100 },
            { subject: 'Motricidad', ...motr, fullMark: 100 },
            { subject: 'Flexibilidad', ...flex, fullMark: 100 },
        ];
    }, [totalXP, practiceXP, nextLevelConfig, filter, radarStats]);

    // --- Radar 2: Current Form (Last 90 Days, Normalized to 100) ---
    const formRadarData = useMemo(() => {
        // Use practice data from radarStats (already reads from student_xp_total)
        if (!radarStats?.practiceData || !radarStats?.evaluationData) return [];

        // Extract practice values from radarStats
        const motrPractice = radarStats.practiceData.find(d => d.subject === 'Motricidad');
        const artPractice = radarStats.practiceData.find(d => d.subject === 'Articulación (T)');
        const flexPractice = radarStats.practiceData.find(d => d.subject === 'Flexibilidad');

        // Extract evaluation values from radarStats
        const motrEvaluation = radarStats.evaluationData.find(d => d.subject === 'Motricidad');
        const artEvaluation = radarStats.evaluationData.find(d => d.subject === 'Articulación (T)');
        const flexEvaluation = radarStats.evaluationData.find(d => d.subject === 'Flexibilidad');

        const getVal = (practiceItem: any, evaluationItem: any) => {
            const pracVal = practiceItem?.original || 0;
            const evalVal = evaluationItem?.original || 0;
            const totalVal = pracVal + evalVal;

            // Scale to 0-10 for the chart (assuming max 100 XP = 10 on chart)
            const pracScaled = Math.min(10, pracVal / 10);
            const evalScaled = Math.min(10, evalVal / 10);
            const totalScaled = Math.min(10, totalVal / 10);

            const showEval = filter.includes('evaluaciones');
            const showPrac = filter.includes('experiencia');
            const showTotal = showEval && showPrac;

            return {
                A: showEval ? evalScaled : 0,
                B: showPrac ? pracScaled : 0,
                C: showTotal ? totalScaled : 0,
                original: evalVal,
                originalExperiencia: pracVal,
                originalTotal: totalVal
            };
        };

        const motr = getVal(motrPractice, motrEvaluation);
        const art = getVal(artPractice, artEvaluation);
        const flex = getVal(flexPractice, flexEvaluation);

        const showQualitative = filter.includes('evaluaciones'); // Only show qualitative if evaluations are selected? Or always?
        // User said: "Evaluaciones: mantiene su función". Previously 'evaluaciones' showed qualitative.
        // 'experiencia' did NOT show qualitative.
        // So if 'evaluaciones' is in filter, show qualitative.

        // Use raw values (already 0-100)
        const sonidoRaw = (radarStats?.evaluationData?.find(d => d.subject === 'Sonido')?.original || 0);
        const cogRaw = (radarStats?.evaluationData?.find(d => d.subject === 'Cognición')?.original || 0);

        // Scale Sonido/Cognicion to 0-10 for chart
        const sonidoScaled = Math.min(10, sonidoRaw / 10);
        const cogScaled = Math.min(10, cogRaw / 10);

        return [
            { subject: 'Sonido', A: showQualitative ? sonidoScaled : 0, B: 0, C: showQualitative ? sonidoScaled : 0, fullMark: 100, original: sonidoRaw, originalTotal: sonidoRaw },
            { subject: 'Cognición', A: showQualitative ? cogScaled : 0, B: 0, C: showQualitative ? cogScaled : 0, fullMark: 100, original: cogRaw, originalTotal: cogRaw },
            { subject: 'Articulación', ...art, fullMark: 100 },
            { subject: 'Motricidad', ...motr, fullMark: 100 },
            { subject: 'Flexibilidad', ...flex, fullMark: 100 },
        ];
    }, [radarStats, filter]);

    const selectedStudent = students.find(s => s.id === internalSelectedId);
    const selectedStudentName = selectedStudent ? displayName(selectedStudent) : 'Alumno seleccionado';

    return (
        <div className="space-y-6">
            {/* Header & Selection */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Habilidades Maestras</h3>
                    {enableSelection && (
                        <div className="w-[300px]">
                            <Select value={internalSelectedId} onValueChange={setInternalSelectedId}>
                                <SelectTrigger className="h-9">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{selectedStudentName}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.email ? `${displayName(student)} (${student.email})` : displayName(student)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Panel 2: Filters */}
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                    <ToggleGroup type="multiple" value={filter} onValueChange={(v) => setFilter(v)}>
                        <ToggleGroupItem value="evaluaciones" className="gap-2 px-3 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700">
                            <ClipboardList className="h-4 w-4" />
                            <span className="text-sm font-medium">Evaluaciones</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="experiencia" className="gap-2 px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-700">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm font-medium">Experiencia</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-8">

                {/* Panel 4: Level & Qualitative Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/20 border-none shadow-none flex flex-col justify-center items-center p-4">
                        <LevelBadge level={currentLevel} size="lg" />
                        <div className="mt-2 text-center">
                            <h4 className="font-bold">Nivel {currentLevel + 1}</h4>
                            <p className="text-xs text-muted-foreground">Siguiente Nivel</p>
                        </div>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-3xl font-bold text-orange-500">
                                {(radarStats?.evaluationData?.find(d => d.subject === 'Sonido')?.original || 0) / 10}<span className="text-sm text-muted-foreground font-normal">/10</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 font-medium">Sonido (Cualitativo)</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                            <div className="text-3xl font-bold text-orange-500">
                                {(radarStats?.evaluationData?.find(d => d.subject === 'Cognición')?.original || 0) / 10}<span className="text-sm text-muted-foreground font-normal">/10</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 font-medium">Cognición (Cualitativo)</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel 1: XP Total Acumulado */}
                <div className="p-4 border rounded-md bg-muted/20">
                    <h5 className="font-medium text-sm mb-1">XP Total Acumulado</h5>
                    <p className="text-xs text-muted-foreground mb-3">Progreso total desde el inicio.</p>
                    <TotalXPDisplay studentId={targetId} filter={filter} />
                </div>

                {/* Panel 3: Dual Radars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Radar 1: Total Progress */}
                    <div>
                        <div className="mb-4 text-center">
                            <h4 className="font-semibold text-sm">Perfil Técnico - Total</h4>
                            <p className="text-xs text-muted-foreground">Progreso vs Requisitos Nivel {currentLevel + 1}</p>
                        </div>
                        <HabilidadesRadarChart
                            data={totalRadarData}
                            isLoading={isLoadingStats}
                            dataKey1={filter.includes('evaluaciones') ? "A" : undefined} // Evaluation (Orange)
                            dataKey2={filter.includes('experiencia') ? "B" : undefined} // Practice (Green)
                            dataKey3={(filter.includes('evaluaciones') && filter.includes('experiencia')) ? "C" : undefined} // Total (Grey)
                        />
                    </div>

                    {/* Radar 2: Current Form */}
                    <div>
                        <div className="mb-4 text-center">
                            <h4 className="font-semibold text-sm">Estado de Forma Actual</h4>
                            <p className="text-xs text-muted-foreground">Últimos 90 Días (Normalizado a 100 XP)</p>
                        </div>
                        <HabilidadesRadarChart
                            data={formRadarData}
                            isLoading={isLoadingRecent}
                            dataKey1={filter.includes('evaluaciones') ? "A" : undefined} // Evaluation (Orange)
                            dataKey2={filter.includes('experiencia') ? "B" : undefined} // Practice (Green)
                            dataKey3={(filter.includes('evaluaciones') && filter.includes('experiencia')) ? "C" : undefined} // Total (Grey) - Only if both
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
