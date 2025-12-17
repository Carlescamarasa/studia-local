import React, { useMemo } from 'react';
import { useTotalXP, totalXPToObject, useLifetimePracticeXP, useTotalXPMultiple, useLifetimePracticeXPMultiple, useAggregateLevelGoals } from '@/hooks/useXP';
import { Loader2, TrendingUp, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { Badge } from '@/components/ds';

interface TotalXPDisplayProps {
    studentId?: string;
    studentIds?: string[]; // For multi-student aggregation
    filter?: string[];
    compact?: boolean; // Compact mode with reduced padding/fonts
}

export default function TotalXPDisplay({ studentId, studentIds, filter = ['evaluaciones', 'experiencia'], compact = false }: TotalXPDisplayProps) {
    // Normalize to array
    const ids = useMemo(() => {
        if (studentIds && studentIds.length > 0) return studentIds;
        if (studentId) return [studentId];
        return [];
    }, [studentId, studentIds]);

    const isMultiple = ids.length > 1;
    const singleId = ids.length === 1 ? ids[0] : '';
    const hasData = ids.length > 0;

    // Single student hooks (used when 1 student)
    const { data: totalXPSingle, isLoading: isLoadingTotalSingle } = useTotalXP(singleId);
    const { data: practiceXPSingle, isLoading: isLoadingPracticeSingle } = useLifetimePracticeXP(singleId);

    // Multi-student hooks (used when 2+ students)
    const { data: totalXPMultiple, isLoading: isLoadingTotalMultiple } = useTotalXPMultiple(isMultiple ? ids : []);
    const { data: practiceXPMultiple, isLoading: isLoadingPracticeMultiple } = useLifetimePracticeXPMultiple(isMultiple ? ids : []);

    // Aggregated Goals Hook
    const aggregatedGoals = useAggregateLevelGoals(isMultiple ? ids : []);

    // Use appropriate data based on count
    const totalXP = isMultiple ? totalXPMultiple : totalXPSingle;
    const practiceXP = isMultiple ? practiceXPMultiple : practiceXPSingle;
    const isLoadingTotal = isMultiple ? isLoadingTotalMultiple : isLoadingTotalSingle;
    const isLoadingPractice = isMultiple ? isLoadingPracticeMultiple : isLoadingPracticeSingle;

    // Fetch student profile to get current level (only for single student)
    const { data: studentProfile } = useQuery({
        queryKey: ['student-profile', singleId],
        queryFn: () => localDataClient.entities.User.get(singleId),
        enabled: !!singleId && !isMultiple
    });

    const currentLevel = studentProfile?.nivelTecnico || 1;

    // Fetch current level config to get required XP (single student only)
    const { data: currentLevelConfig } = useQuery({
        queryKey: ['level-config', currentLevel],
        queryFn: async () => {
            const configs = await localDataClient.entities.LevelConfig.list();
            const config = configs.find((c: any) => c.level === currentLevel);
            return config || null;
        },
        enabled: !isMultiple && !!currentLevel
    });

    if (!hasData) {
        return (
            <div className="text-center p-4 text-muted-foreground text-sm">
                Selecciona un alumno para ver su XP
            </div>
        );
    }

    if (isLoadingTotal || isLoadingPractice) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
            </div>
        );
    }

    const total = totalXPToObject(totalXP);
    const practice = practiceXP || { motricidad: 0, articulacion: 0, flexibilidad: 0 };

    // Helper to calculate displayed value based on filter
    const getDisplayedValue = (skill: 'motricidad' | 'articulacion' | 'flexibilidad') => {
        const totalVal = total[skill] || 0;
        const practiceVal = practice[skill] || 0;
        const evaluationVal = Math.max(0, totalVal - practiceVal);

        let result = 0;
        if (filter.includes('experiencia')) result += practiceVal;
        if (filter.includes('evaluaciones')) result += evaluationVal;

        return result;
    };

    // Helper to get required XP for a skill
    const getRequiredXP = (skill: 'motricidad' | 'articulacion' | 'flexibilidad') => {
        // Case Global: Use aggregated goals
        if (isMultiple) {
            return aggregatedGoals[skill] || 100;
        }

        // Case Single: Use current level config
        if (!currentLevelConfig) return 100; // Fallback
        switch (skill) {
            case 'motricidad': return currentLevelConfig.minXpMotr || 0;
            case 'articulacion': return currentLevelConfig.minXpArt || 0;
            case 'flexibilidad': return currentLevelConfig.minXpFlex || 0;
            default: return 0;
        }
    };

    // Level Display Logic
    let levelDisplay = null;
    if (isMultiple) {
        levelDisplay = (
            <Badge variant="outline" className="mb-2 w-fit gap-1.5 px-3 py-1 bg-background">
                <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Varios niveles</span>
            </Badge>
        );
    } else if (studentProfile) {
        // Determine label (e.g. Principiante) based on level if available in config or implicit
        // For now, standard format: "Nivel X"
        levelDisplay = (
            <Badge variant="outline" className="mb-2 w-fit gap-1.5 px-3 py-1 bg-background border-primary/20">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">
                    Nivel {currentLevel}
                    <span className="mx-1 opacity-50">·</span>
                    <span className="text-muted-foreground font-normal">
                        {studentProfile.etiquetaNivel || (currentLevel < 3 ? 'Principiante' : currentLevel < 6 ? 'Intermedio' : 'Avanzado')}
                    </span>
                </span>
            </Badge>
        );
    }

    const renderCard = (skill: 'motricidad' | 'articulacion' | 'flexibilidad', label: string, colorClass: string) => {
        const value = getDisplayedValue(skill);
        const required = getRequiredXP(skill);

        const showPractice = filter.includes('experiencia');
        const showEvaluation = filter.includes('evaluaciones');

        let labelText = '';
        if (showPractice && showEvaluation) labelText = 'Práctica + Evaluaciones';
        else if (showPractice) labelText = 'Solo Práctica';
        else if (showEvaluation) labelText = 'Solo Evaluaciones';
        else labelText = 'Ninguno seleccionado';

        return (
            <div className={compact ? "p-2 border rounded bg-card" : "p-3 border rounded bg-card"}>
                <div className={compact ? "flex items-center gap-1.5 mb-0.5" : "flex items-center gap-2 mb-1"}>
                    <TrendingUp className={compact ? `h-3 w-3 ${colorClass}` : `h-4 w-4 ${colorClass}`} />
                    <span className={compact ? "text-[10px] font-medium text-muted-foreground" : "text-xs font-medium text-muted-foreground"}>{label}</span>
                </div>
                <p className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>
                    {Math.round(value)}
                    <span className={compact ? "text-xs text-muted-foreground font-normal" : "text-sm text-muted-foreground font-normal"}> / {required}</span>
                </p>
                <p className={compact ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>XP Total</p>
                {!compact && (
                    <p className="text-xs text-muted-foreground opacity-60 mt-1">
                        {labelText}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            {!compact && levelDisplay}
            <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
                {renderCard('motricidad', 'Motricidad', 'text-blue-500')}
                {renderCard('articulacion', 'Articulación', 'text-green-500')}
                {renderCard('flexibilidad', 'Flexibilidad', 'text-purple-500')}
            </div>
        </div>
    );
}
