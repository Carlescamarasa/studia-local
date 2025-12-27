import { useMemo } from 'react';
import { useAllStudentXPTotals, useAggregateLevelGoals } from './useXP';
import { useFeedbacksSemanal } from '@/hooks/entities/useFeedbacksSemanal';
import { useEvaluacionesTecnicas } from '@/hooks/entities/useEvaluacionesTecnicas';

export type DataSource = 'evaluaciones' | 'experiencia' | 'ambas';

interface HabilidadesStatsOptions {
    providedXPData?: any[];
    providedEvaluations?: any[];
    providedFeedbacks?: any[];
}

import { useStudentSkillsRadar } from './useStudentSkillsRadar';



/**
 * Hook to get normalized skills radar stats.
 * Uses get_student_skills_radar RPC via useStudentSkillsRadar hook.
 *
 * @param alumnoId - Student ID
 * @param options - @deprecated Legacy options for manual data injection (ignored for single student)
 */
export function useHabilidadesStats(alumnoId: string, options?: HabilidadesStatsOptions) {
    // 1. RPC Data Fetching (Always use RPC for single student)
    const { data: rpcData, isLoading: loadingRPC } = useStudentSkillsRadar(alumnoId);

    // Combine into 5-axis radar data using RPC response
    const radarStats = useMemo(() => {
        if (!rpcData) return null;

        return {
            combinedData: [
                {
                    subject: 'Sonido',
                    A: undefined,
                    B: undefined,
                    Total: rpcData.sonido,
                    original: rpcData.sonido,
                    originalTotal: rpcData.sonido,
                    fullMark: 10
                },
                {
                    subject: 'Motricidad',
                    A: undefined,
                    B: undefined,
                    Total: rpcData.motricidad,
                    original: Math.round(rpcData.meta?.xp_motr || 0),
                    maxXP: rpcData.meta?.req_motr || 100,
                    originalTotal: Math.round(rpcData.meta?.xp_motr || 0),
                    fullMark: 10
                },
                {
                    subject: 'Articulación (T)',
                    A: undefined,
                    B: undefined,
                    Total: rpcData.articulacion,
                    original: Math.round(rpcData.meta?.xp_art || 0),
                    maxXP: rpcData.meta?.req_art || 100,
                    originalTotal: Math.round(rpcData.meta?.xp_art || 0),
                    fullMark: 10
                },
                {
                    subject: 'Flexibilidad',
                    A: undefined,
                    B: undefined,
                    Total: rpcData.flexibilidad,
                    original: Math.round(rpcData.meta?.xp_flex || 0),
                    maxXP: rpcData.meta?.req_flex || 100,
                    originalTotal: Math.round(rpcData.meta?.xp_flex || 0),
                    fullMark: 10
                },
                {
                    subject: 'Cognición',
                    A: undefined,
                    B: undefined,
                    Total: rpcData.cognicion,
                    original: rpcData.cognicion,
                    originalTotal: rpcData.cognicion,
                    fullMark: 10
                },
            ]
        };
    }, [rpcData]);

    return {
        radarStats,
        isLoading: loadingRPC
    };
}

export function useHabilidadesStatsMultiple(studentIds: string[], options?: HabilidadesStatsOptions) {
    // 1. Fetch all XP data using centralized hook (shared cache)
    const { data: fetchedXPData, isLoading: isLoadingXP } = useAllStudentXPTotals();

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
    const { data: fetchedEvaluations } = useEvaluacionesTecnicas();

    const allEvaluations = options?.providedEvaluations || fetchedEvaluations;

    const { data: fetchedFeedbacks } = useFeedbacksSemanal();

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
        isLoading: isLoadingXP || !allXPData || !allEvaluations
    };
}
