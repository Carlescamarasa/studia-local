import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { useAggregateLevelGoals } from '@/hooks/useXP';

export type DataSource = 'evaluaciones' | 'experiencia' | 'ambas';

interface HabilidadesStatsOptions {
    providedXPData?: any[];
    providedEvaluations?: any[];
    providedFeedbacks?: any[];
}

export function useHabilidadesStats(alumnoId: string, options?: HabilidadesStatsOptions) {
    // Fetch total XP if not provided
    const { data: fetchedXPData } = useQuery({
        queryKey: ['student-xp-total-all'],
        queryFn: () => localDataClient.entities.StudentXPTotal.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedXPData,
        refetchOnWindowFocus: false
    });

    const allXPData = options?.providedXPData || fetchedXPData;

    // Fetch Goals for Normalization
    const aggregatedGoals = useAggregateLevelGoals(alumnoId ? [alumnoId] : []);

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

    // Fetch ALL evaluations if not provided
    const { data: fetchedEvaluations } = useQuery({
        queryKey: ['evaluacionesTecnicas'], // Standardized key
        queryFn: () => localDataClient.entities.EvaluacionTecnica.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedEvaluations,
        refetchOnWindowFocus: false
    });

    const allEvaluations = options?.providedEvaluations || fetchedEvaluations;

    // Fetch ALL feedbacks if not provided
    const { data: fetchedFeedbacks } = useQuery({
        queryKey: ['feedbacksSemanal'],
        queryFn: () => localDataClient.entities.FeedbackSemanal.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedFeedbacks,
        refetchOnWindowFocus: false
    });

    const allFeedbacks = options?.providedFeedbacks || fetchedFeedbacks;

    // Compute qualitative XP from cached evaluations AND feedbacks with useMemo
    const qualitativeXP = useMemo(() => {
        if ((!allEvaluations && !allFeedbacks) || !alumnoId) return { sonido: 0, cognicion: 0 };

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        // 1. Process Evaluations
        const relevantEvaluations = (allEvaluations || [])
            .filter((e: any) => e.alumnoId === alumnoId && e.fecha && new Date(e.fecha) >= cutoffDate)
            .map((e: any) => ({
                date: new Date(e.fecha),
                sonido: e.habilidades?.sonido,
                cognicion: e.habilidades?.cognitivo
            }));

        // 2. Process Feedbacks (FeedbackSemanal)
        // NOTE: sonido/cognicion are stored INSIDE habilidades JSONB (see remoteDataAPI.ts)
        const relevantFeedbacks = (allFeedbacks || [])
            .filter((f: any) => f.alumnoId === alumnoId && (f.semanaInicioISO || f.created_at || f.createdAt))
            .filter((f: any) => {
                const d = new Date(f.semanaInicioISO || f.created_at || f.createdAt);
                return d >= cutoffDate;
            })
            .map((f: any) => ({
                date: new Date(f.semanaInicioISO || f.created_at || f.createdAt),
                // Read from habilidades JSONB where remoteDataAPI stores them
                sonido: f.habilidades?.sonido ?? f.sonido,
                cognicion: f.habilidades?.cognicion ?? f.cognicion
            }));

        // 3. Merge and Sort Descending
        const combined = [...relevantEvaluations, ...relevantFeedbacks].sort((a, b) => b.date.getTime() - a.date.getTime());

        // 4. Find latest non-null values
        // Default to 0 if nothing found
        const latestSonido = combined.find(r => r.sonido != null)?.sonido || 0;
        const latestCognicion = combined.find(r => r.cognicion != null)?.cognicion || 0;

        return {
            sonido: latestSonido,
            cognicion: latestCognicion
        };
    }, [allEvaluations, allFeedbacks, alumnoId]);

    const loadingEvalXP = !allEvaluations;

    // Combine into 5-axis radar data
    const radarStats = useMemo(() => {
        const defaultXP = { total: 0, practice: 0, evaluation: 0 };
        const motr = totalXPData?.motricidad || defaultXP;
        const art = totalXPData?.articulacion || defaultXP;
        const flex = totalXPData?.flexibilidad || defaultXP;
        const qualitative = qualitativeXP || { sonido: 0, cognicion: 0 };

        // Normalize using Real Goals (Aggregated/Single)
        const normalize = (val: number, goal: number) => {
            if (goal <= 0) return 0;
            return Math.min(10, (val / goal) * 10);
        };

        const goals = aggregatedGoals || { motricidad: 100, articulacion: 100, flexibilidad: 100 };

        const normPractice = {
            motricidad: normalize(motr.practice, goals.motricidad),
            articulacion: normalize(art.practice, goals.articulacion),
            flexibilidad: normalize(flex.practice, goals.flexibilidad),
        };

        const normEvaluation = {
            motricidad: normalize(motr.evaluation, goals.motricidad),
            articulacion: normalize(art.evaluation, goals.articulacion),
            flexibilidad: normalize(flex.evaluation, goals.flexibilidad),
        };

        const normTotal = {
            motricidad: normalize(motr.practice + motr.evaluation, goals.motricidad),
            articulacion: normalize(art.practice + art.evaluation, goals.articulacion),
            flexibilidad: normalize(flex.practice + flex.evaluation, goals.flexibilidad),
        };

        return {
            combinedData: [
                {
                    subject: 'Sonido',
                    A: qualitative.sonido,
                    B: undefined,
                    Total: qualitative.sonido,
                    original: Math.round(qualitative.sonido * 10) / 10,
                    originalTotal: Math.round(qualitative.sonido * 10) / 10,
                    fullMark: 10
                },
                {
                    subject: 'Motricidad',
                    A: normEvaluation.motricidad,
                    B: normPractice.motricidad,
                    Total: normTotal.motricidad,
                    original: Math.round(motr.evaluation),
                    originalExperiencia: Math.round(motr.practice),
                    originalTotal: Math.round(motr.practice + motr.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Articulación (T)',
                    A: normEvaluation.articulacion,
                    B: normPractice.articulacion,
                    Total: normTotal.articulacion,
                    original: Math.round(art.evaluation),
                    originalExperiencia: Math.round(art.practice),
                    originalTotal: Math.round(art.practice + art.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Flexibilidad',
                    A: normEvaluation.flexibilidad,
                    B: normPractice.flexibilidad,
                    Total: normTotal.flexibilidad,
                    original: Math.round(flex.evaluation),
                    originalExperiencia: Math.round(flex.practice),
                    originalTotal: Math.round(flex.practice + flex.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Cognición',
                    A: qualitative.cognicion,
                    B: undefined,
                    Total: qualitative.cognicion,
                    original: Math.round(qualitative.cognicion * 10) / 10,
                    originalTotal: Math.round(qualitative.cognicion * 10) / 10,
                    fullMark: 10
                },
            ]
        };
    }, [totalXPData, qualitativeXP, aggregatedGoals]);

    return {
        radarStats,
        isLoading: loadingTotalXP || loadingEvalXP
    };
}

export function useHabilidadesStatsMultiple(studentIds: string[], options?: HabilidadesStatsOptions) {
    // 1. Fetch all XP data if not provided
    const { data: fetchedXPData } = useQuery({
        queryKey: ['student-xp-total-all'],
        queryFn: () => localDataClient.entities.StudentXPTotal.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedXPData,
        refetchOnWindowFocus: false
    });

    const allXPData = options?.providedXPData || fetchedXPData;

    // Fetch Goals for Normalization (Aggregated)
    const aggregatedGoals = useAggregateLevelGoals(studentIds);

    // 2. Aggregate XP (Sum for Radar)
    const aggregatedXP = useMemo(() => {
        if (!allXPData || studentIds.length === 0) return null;

        const skillSums = {
            motricidad: { practice: 0, evaluation: 0 },
            articulacion: { practice: 0, evaluation: 0 },
            flexibilidad: { practice: 0, evaluation: 0 },
        };

        const studentIdSet = new Set(studentIds);

        allXPData.forEach((row: any) => {
            const id = row.studentId || row.student_id;
            if (!studentIdSet.has(id)) return;

            const skill = row.skill as 'motricidad' | 'articulacion' | 'flexibilidad';
            if (skillSums[skill]) {
                skillSums[skill].practice += row.practiceTotal || row.practice_xp || 0;
                skillSums[skill].evaluation += row.evaluationTotal || row.evaluation_xp || 0;
            }
        });

        // Return SUMS (not averages)
        return skillSums;
    }, [allXPData, studentIds]);


    // 3. Fetch all Evaluations & Feedbacks if not provided
    const { data: fetchedEvaluations } = useQuery({
        queryKey: ['evaluacionesTecnicas'], // Standardized key
        queryFn: () => localDataClient.entities.EvaluacionTecnica.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedEvaluations,
        refetchOnWindowFocus: false
    });

    const allEvaluations = options?.providedEvaluations || fetchedEvaluations;

    const { data: fetchedFeedbacks } = useQuery({
        queryKey: ['feedbacksSemanal'],
        queryFn: () => localDataClient.entities.FeedbackSemanal.list(),
        staleTime: 1000 * 60 * 5,
        enabled: !options?.providedFeedbacks,
        refetchOnWindowFocus: false
    });

    const allFeedbacks = options?.providedFeedbacks || fetchedFeedbacks;

    // 4. Aggregate Qualitative (Average including Missing as 0)
    const aggregatedQualitative = useMemo(() => {
        if ((!allEvaluations && !allFeedbacks) || studentIds.length === 0) return { sonido: 0, cognicion: 0 };

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        let sonidoSum = 0;
        let cognicionSum = 0;

        // Iterate students to sum their latest evaluation (if any)
        studentIds.forEach(alumnoId => {
            // 1. Process Evaluations
            const relevantEvaluations = (allEvaluations || [])
                .filter((e: any) => e.alumnoId === alumnoId && e.fecha && new Date(e.fecha) >= cutoffDate)
                .map((e: any) => ({
                    date: new Date(e.fecha),
                    sonido: e.habilidades?.sonido,
                    cognicion: e.habilidades?.cognitivo
                }));

            // 2. Process Feedbacks
            // NOTE: sonido/cognicion are stored INSIDE habilidades JSONB
            const relevantFeedbacks = (allFeedbacks || [])
                .filter((f: any) => f.alumnoId === alumnoId && (f.semanaInicioISO || f.created_at || f.createdAt))
                .filter((f: any) => {
                    const d = new Date(f.semanaInicioISO || f.created_at || f.createdAt);
                    return d >= cutoffDate;
                })
                .map((f: any) => ({
                    date: new Date(f.semanaInicioISO || f.created_at || f.createdAt),
                    // Read from habilidades JSONB where remoteDataAPI stores them
                    sonido: f.habilidades?.sonido ?? f.sonido,
                    cognicion: f.habilidades?.cognicion ?? f.cognicion
                }));

            // 3. Merge and Sort Descending
            const combined = [...relevantEvaluations, ...relevantFeedbacks].sort((a, b) => b.date.getTime() - a.date.getTime());

            // 4. Find latest non-null values for this student
            const latestSonido = combined.find(r => r.sonido != null)?.sonido || 0;
            const latestCognicion = combined.find(r => r.cognicion != null)?.cognicion || 0;

            sonidoSum += latestSonido;
            cognicionSum += latestCognicion;
        });

        // FIX: Divide by total selected students (missing data counts as 0)
        const totalStudents = studentIds.length; // Ensure this is > 0, which is handled by wrapper

        return {
            sonido: totalStudents > 0 ? sonidoSum / totalStudents : 0,
            cognicion: totalStudents > 0 ? cognicionSum / totalStudents : 0
        };
    }, [allEvaluations, allFeedbacks, studentIds]);

    // 5. Build Radar Stats
    const radarStats = useMemo(() => {
        if (!aggregatedXP) return null;

        const motr = aggregatedXP.motricidad;
        const art = aggregatedXP.articulacion;
        const flex = aggregatedXP.flexibilidad;
        const qualitative = aggregatedQualitative;

        // Normalize using Real Goals
        const normalize = (val: number, goal: number) => {
            if (goal <= 0) return 0;
            return Math.min(10, (val / goal) * 10);
        };

        const goals = aggregatedGoals || { motricidad: 100, articulacion: 100, flexibilidad: 100 };

        const normPractice = {
            motricidad: normalize(motr.practice, goals.motricidad),
            articulacion: normalize(art.practice, goals.articulacion),
            flexibilidad: normalize(flex.practice, goals.flexibilidad),
        };

        const normEvaluation = {
            motricidad: normalize(motr.evaluation, goals.motricidad),
            articulacion: normalize(art.evaluation, goals.articulacion),
            flexibilidad: normalize(flex.evaluation, goals.flexibilidad),
        };

        const normTotal = {
            motricidad: normalize(motr.practice + motr.evaluation, goals.motricidad),
            articulacion: normalize(art.practice + art.evaluation, goals.articulacion),
            flexibilidad: normalize(flex.practice + flex.evaluation, goals.flexibilidad),
        };

        return {
            combinedData: [
                {
                    subject: 'Sonido',
                    A: qualitative.sonido,
                    B: undefined,
                    Total: qualitative.sonido,
                    original: Math.round(qualitative.sonido * 10) / 10,
                    originalTotal: Math.round(qualitative.sonido * 10) / 10,
                    fullMark: 10
                },
                {
                    subject: 'Motricidad',
                    A: normEvaluation.motricidad,
                    B: normPractice.motricidad,
                    Total: normTotal.motricidad,
                    original: Math.round(motr.evaluation),
                    originalExperiencia: Math.round(motr.practice),
                    originalTotal: Math.round(motr.practice + motr.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Articulación (T)',
                    A: normEvaluation.articulacion,
                    B: normPractice.articulacion,
                    Total: normTotal.articulacion,
                    original: Math.round(art.evaluation),
                    originalExperiencia: Math.round(art.practice),
                    originalTotal: Math.round(art.practice + art.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Flexibilidad',
                    A: normEvaluation.flexibilidad,
                    B: normPractice.flexibilidad,
                    Total: normTotal.flexibilidad,
                    original: Math.round(flex.evaluation),
                    originalExperiencia: Math.round(flex.practice),
                    originalTotal: Math.round(flex.practice + flex.evaluation),
                    fullMark: 10
                },
                {
                    subject: 'Cognición',
                    A: qualitative.cognicion,
                    B: undefined,
                    Total: qualitative.cognicion,
                    original: Math.round(qualitative.cognicion * 10) / 10,
                    originalTotal: Math.round(qualitative.cognicion * 10) / 10,
                    fullMark: 10
                },
            ]
        };
    }, [aggregatedXP, aggregatedQualitative, aggregatedGoals]);

    return {
        radarStats,
        isLoading: !allXPData || !allEvaluations
    };
}
