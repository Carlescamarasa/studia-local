import React from 'react';
import { useTotalXP, totalXPToObject, useLifetimePracticeXP } from '@/hooks/useXP';
import { Loader2, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';

interface TotalXPDisplayProps {
    studentId: string;
    filter?: string[];
}

export default function TotalXPDisplay({ studentId, filter = ['evaluaciones', 'experiencia'] }: TotalXPDisplayProps) {
    const { data: totalXP, isLoading: isLoadingTotal } = useTotalXP(studentId);
    const { data: practiceXP, isLoading: isLoadingPractice } = useLifetimePracticeXP(studentId);

    // Fetch student profile to get current level
    const { data: studentProfile } = useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: () => localDataClient.entities.User.get(studentId),
        enabled: !!studentId
    });

    const currentLevel = studentProfile?.nivelTecnico || 0;
    const nextLevel = currentLevel + 1;

    // Fetch next level config to get required XP
    const { data: nextLevelConfig } = useQuery({
        queryKey: ['level-config', nextLevel],
        queryFn: async () => {
            const configs = await localDataClient.entities.LevelConfig.list();
            const config = configs.find((c: any) => c.level === nextLevel);
            return config || null; // Return null instead of undefined
        },
        enabled: !!nextLevel
    });

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
        if (!nextLevelConfig) return 100; // Fallback

        switch (skill) {
            case 'motricidad': return nextLevelConfig.minXpMotr || 0;
            case 'articulacion': return nextLevelConfig.minXpArt || 0;
            case 'flexibilidad': return nextLevelConfig.minXpFlex || 0;
            default: return 0;
        }
    };

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
            <div className="p-3 border rounded bg-card">
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={`h-4 w-4 ${colorClass}`} />
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <p className="text-2xl font-bold">
                    {Math.round(value)}
                    <span className="text-sm text-muted-foreground font-normal"> / {required}</span>
                </p>
                <p className="text-xs text-muted-foreground">XP Total</p>
                <p className="text-xs text-muted-foreground opacity-60 mt-1">
                    {labelText}
                </p>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderCard('motricidad', 'Motricidad', 'text-blue-500')}
            {renderCard('articulacion', 'Articulación', 'text-green-500')}
            {renderCard('flexibilidad', 'Flexibilidad', 'text-purple-500')}
        </div>
    );
}
