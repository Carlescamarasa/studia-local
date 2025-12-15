import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { RegistroBloque, Bloque } from '@/types/domain';

export type DataSource = 'evaluaciones' | 'experiencia' | 'ambas';

export function useHabilidadesStats(alumnoId: string) {
    // Fetch total XP from student_xp_total table - use global list cache
    // queryKey uses table name to enable shared caching across components
    const { data: allXPData } = useQuery({
        queryKey: ['student-xp-total-all'],
        queryFn: () => localDataClient.entities.StudentXPTotal.list(),
        staleTime: 1000 * 60 * 5,
    });

    // Compute student-specific data from cached list
    const totalXPData = useMemo(() => {
        if (!allXPData || !alumnoId) return null;

        const studentRows = allXPData.filter((r: any) =>
            (r.studentId === alumnoId || r.student_id === alumnoId)
        );

        if (studentRows.length === 0) {
            return {
                motricidad: { total: 0, practice: 0, evaluation: 0 },
                articulacion: { total: 0, practice: 0, evaluation: 0 },
                flexibilidad: { total: 0, practice: 0, evaluation: 0 },
            };
        }

        const motrRow = studentRows.find((r: any) => r.skill === 'motricidad');
        const artRow = studentRows.find((r: any) => r.skill === 'articulacion');
        const flexRow = studentRows.find((r: any) => r.skill === 'flexibilidad');

        return {
            motricidad: {
                total: motrRow?.total_xp || motrRow?.totalXp || 0,
                practice: motrRow?.practice_xp || motrRow?.practiceXp || 0,
                evaluation: motrRow?.evaluation_xp || motrRow?.evaluationXp || 0,
            },
            articulacion: {
                total: artRow?.total_xp || artRow?.totalXp || 0,
                practice: artRow?.practice_xp || artRow?.practiceXp || 0,
                evaluation: artRow?.evaluation_xp || artRow?.evaluationXp || 0,
            },
            flexibilidad: {
                total: flexRow?.total_xp || flexRow?.totalXp || 0,
                practice: flexRow?.practice_xp || flexRow?.practiceXp || 0,
                evaluation: flexRow?.evaluation_xp || flexRow?.evaluationXp || 0,
            },
        };
    }, [allXPData, alumnoId]);

    const loadingTotalXP = !allXPData;

    // Fetch ALL evaluations with shared cache  
    const { data: allEvaluations } = useQuery({
        queryKey: ['evaluaciones-tecnicas-all'],
        queryFn: () => localDataClient.entities.EvaluacionTecnica.list(),
        staleTime: 1000 * 60 * 5,
    });

    // Compute qualitative XP from cached evaluations with useMemo
    const qualitativeXP = useMemo(() => {
        if (!allEvaluations || !alumnoId) return { sonido: 0, cognicion: 0 };

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const recentEvaluations = allEvaluations.filter((evaluation: any) => {
            if (evaluation.alumnoId !== alumnoId) return false;
            if (!evaluation.fecha) return false;
            const evalDate = new Date(evaluation.fecha);
            return evalDate >= cutoffDate;
        });

        if (recentEvaluations.length === 0) return { sonido: 0, cognicion: 0 };

        // Get most recent evaluation
        const latest = recentEvaluations.sort((a: any, b: any) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            return dateB - dateA;
        })[0];

        if (!latest.habilidades) return { sonido: 0, cognicion: 0 };

        return {
            sonido: (latest.habilidades.sonido || 0) * 10,
            cognicion: (latest.habilidades.cognitivo || 0) * 10
        };
    }, [allEvaluations, alumnoId]);

    const loadingEvalXP = !allEvaluations;

    // Combine into 5-axis radar data
    const radarStats = useMemo(() => {
        const defaultXP = { total: 0, practice: 0, evaluation: 0 };
        const motr = totalXPData?.motricidad || defaultXP;
        const art = totalXPData?.articulacion || defaultXP;
        const flex = totalXPData?.flexibilidad || defaultXP;
        const qualitative = qualitativeXP || { sonido: 0, cognicion: 0 };

        // Cap practice values at 100 for radar display
        const cappedPractice = {
            motricidad: Math.min(100, motr.practice),
            articulacion: Math.min(100, art.practice),
            flexibilidad: Math.min(100, flex.practice),
        };

        // Cap evaluation values at 100 for radar display
        const cappedEvaluation = {
            motricidad: Math.min(100, motr.evaluation),
            articulacion: Math.min(100, art.evaluation),
            flexibilidad: Math.min(100, flex.evaluation),
        };

        return {
            // Practice-based (from XP system - only practice)
            practiceData: [
                { subject: 'Motricidad', A: cappedPractice.motricidad / 10, original: Math.round(cappedPractice.motricidad), fullMark: 10 },
                { subject: 'Articulación (T)', A: cappedPractice.articulacion / 10, original: Math.round(cappedPractice.articulacion), fullMark: 10 },
                { subject: 'Flexibilidad', A: cappedPractice.flexibilidad / 10, original: Math.round(cappedPractice.flexibilidad), fullMark: 10 },
            ],
            // Evaluation-based (from student_xp_total.evaluation_xp)
            evaluationData: [
                { subject: 'Sonido', A: qualitative.sonido / 10, original: Math.round(qualitative.sonido), fullMark: 10 },
                { subject: 'Motricidad', A: cappedEvaluation.motricidad / 10, original: Math.round(cappedEvaluation.motricidad), fullMark: 10 },
                { subject: 'Articulación (T)', A: cappedEvaluation.articulacion / 10, original: Math.round(cappedEvaluation.articulacion), fullMark: 10 },
                { subject: 'Flexibilidad', A: cappedEvaluation.flexibilidad / 10, original: Math.round(cappedEvaluation.flexibilidad), fullMark: 10 },
                { subject: 'Cognición', A: qualitative.cognicion / 10, original: Math.round(qualitative.cognicion), fullMark: 10 },
            ],
            // Combined 5-axis data (evaluation + practice for skills with both)
            combinedData: [
                { subject: 'Sonido', A: qualitative.sonido / 10, B: undefined, original: Math.round(qualitative.sonido), fullMark: 10 },
                { subject: 'Motricidad', A: cappedEvaluation.motricidad / 10, B: cappedPractice.motricidad / 10, original: Math.round(cappedEvaluation.motricidad), originalExperiencia: Math.round(cappedPractice.motricidad), fullMark: 10 },
                { subject: 'Articulación (T)', A: cappedEvaluation.articulacion / 10, B: cappedPractice.articulacion / 10, original: Math.round(cappedEvaluation.articulacion), originalExperiencia: Math.round(cappedPractice.articulacion), fullMark: 10 },
                { subject: 'Flexibilidad', A: cappedEvaluation.flexibilidad / 10, B: cappedPractice.flexibilidad / 10, original: Math.round(cappedEvaluation.flexibilidad), originalExperiencia: Math.round(cappedPractice.flexibilidad), fullMark: 10 },
                { subject: 'Cognición', A: qualitative.cognicion / 10, B: undefined, original: Math.round(qualitative.cognicion), fullMark: 10 },
            ]
        };
    }, [totalXPData, qualitativeXP]);

    return {
        radarStats,
        isLoading: loadingTotalXP || loadingEvalXP
    };
}
