import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { computePracticeXP, computeEvaluationXP, computeManualXP, capXPForDisplay } from '@/features/shared/services/xpService';
import { localDataClient } from '@/api/localDataClient';
import { useUsers, type UserEntity } from '@/features/admin/hooks/useUsers';
import { useLevelsConfig } from '@/features/admin/hooks/useLevelsConfig';
import type { RecentXPResult, StudentXPTotal } from '@/features/shared/types/domain';

/**
 * Hook to fetch recent XP (last N days) for radar display
 * 
 * @param studentId - Student ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns Recent XP data, capped at 100 for visualization
 */
export function useRecentXP(studentId: string, windowDays: number = 30) {
    return useQuery<RecentXPResult>({
        queryKey: ['recent-xp', studentId, windowDays],
        queryFn: async () => {
            const xp = await computePracticeXP(studentId, windowDays);
            return capXPForDisplay(xp, 100); // Cap at 100 for radar
        },
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
    });
}

// Import the new function (make sure to update imports at top too if not auto-imported)
import { computePracticeXPDetails } from '@/features/shared/services/xpService';

export function useRecentXPMultiple(studentIds: string[], windowDays: number = 30) {
    return useQuery<RecentXPResult>({
        queryKey: ['recent-xp-multiple', studentIds, windowDays],
        queryFn: async () => {
            if (studentIds.length === 0) return { motricidad: 0, articulacion: 0, flexibilidad: 0 };

            // Fetch individual scores (percentages) for each student
            const promises = studentIds.map(id => computePracticeXP(id, windowDays));
            const results = await Promise.all(promises);

            // SUM the individual percentages (not weighted average)
            // e.g., Ana G: 82/100, Ana M: 84/100 → Combined: 166/200
            return results.reduce((acc, curr) => ({
                motricidad: acc.motricidad + curr.motricidad,
                articulacion: acc.articulacion + curr.articulacion,
                flexibilidad: acc.flexibilidad + curr.flexibilidad
            }), { motricidad: 0, articulacion: 0, flexibilidad: 0 });
        },
        enabled: studentIds.length > 0,
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook to fetch recent Evaluation XP (Sonido/Cognición)
 */
export function useRecentEvaluationXP(studentId: string, windowDays: number = 30) {
    return useQuery<{ sonido: number; cognicion: number }>({
        queryKey: ['recent-eval-xp', studentId, windowDays],
        queryFn: async () => {
            return await computeEvaluationXP(studentId, windowDays);
        },
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to fetch recent Manual XP (Professor adjustments)
 */
export function useRecentManualXP(studentId: string, windowDays: number = 30) {
    return useQuery<{ motricidad: number; articulacion: number; flexibilidad: number }>({
        queryKey: ['recent-manual-xp', studentId, windowDays],
        queryFn: async () => {
            return await computeManualXP(studentId, windowDays);
        },
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to fetch recent Manual XP for multiple students (Average)
 */
export function useRecentManualXPMultiple(studentIds: string[], windowDays: number = 30) {
    return useQuery<{ motricidad: number; articulacion: number; flexibilidad: number }>({
        queryKey: ['recent-manual-xp-multiple', studentIds, windowDays],
        queryFn: async () => {
            if (studentIds.length === 0) return { motricidad: 0, articulacion: 0, flexibilidad: 0 };

            const promises = studentIds.map(id => computeManualXP(id, windowDays));
            const results = await Promise.all(promises);

            const sum = results.reduce((acc, curr) => ({
                motricidad: acc.motricidad + curr.motricidad,
                articulacion: acc.articulacion + curr.articulacion,
                flexibilidad: acc.flexibilidad + curr.flexibilidad
            }), { motricidad: 0, articulacion: 0, flexibilidad: 0 });

            return {
                motricidad: sum.motricidad / studentIds.length,
                articulacion: sum.articulacion / studentIds.length,
                flexibilidad: sum.flexibilidad / studentIds.length
            };
        },
        enabled: studentIds.length > 0,
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Shared hook to fetch ALL student XP totals (cached globally)
 * This is the single source of truth for student_xp_total data
 */
export function useAllStudentXPTotals() {
    return useQuery<StudentXPTotal[]>({
        queryKey: ['student-xp-total-all'],
        queryFn: () => localDataClient.entities.StudentXPTotal.list() as Promise<StudentXPTotal[]>,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to fetch lifetime practice XP for separation of data
 * Uses shared cache from useAllStudentXPTotals
 * 
 * @param studentId - Student ID
 * @param providedData - Optional pre-fetched data
 * @returns Lifetime practice XP data
 */
export function useLifetimePracticeXP(studentId: string, providedData?: StudentXPTotal[]) {
    const { data: fetchedData, isLoading: isLoadingFetch } = useAllStudentXPTotals();

    // Use provided data if available, otherwise use fetched data (or empty array if loading)
    const allTotals = providedData || fetchedData;
    const isLoading = providedData ? false : isLoadingFetch;

    const practiceXP = useMemo<RecentXPResult>(() => {
        if (!allTotals || !studentId) {
            return { motricidad: 0, articulacion: 0, flexibilidad: 0 };
        }

        const studentTotals = allTotals.filter(t =>
            t.studentId === studentId || (t as any).student_id === studentId
        );

        const result: RecentXPResult = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0
        };

        studentTotals.forEach((t: any) => {
            const skill = t.skill as keyof RecentXPResult;
            if (skill in result) {
                result[skill] = t.practiceXp || t.practice_xp || 0;
            }
        });

        return result;
    }, [allTotals, studentId]);

    return { data: practiceXP, isLoading };
}

/**
 * Hook to fetch total accumulated XP for all skills
 * Uses shared cache from useAllStudentXPTotals
 * 
 * @param studentId - Student ID
 * @param providedData - Optional pre-fetched data
 * @returns Total XP data (unlimited)
 */
export function useTotalXP(studentId: string, providedData?: StudentXPTotal[]) {
    const { data: fetchedData, isLoading: isLoadingFetch } = useAllStudentXPTotals();

    const allTotals = providedData || fetchedData;
    const isLoading = providedData ? false : isLoadingFetch;

    const studentTotals = useMemo<StudentXPTotal[]>(() => {
        if (!allTotals || !studentId) return [];
        return allTotals.filter(t =>
            t.studentId === studentId || (t as any).student_id === studentId
        );
    }, [allTotals, studentId]);

    return { data: studentTotals, isLoading };
}

/**
 * Convert total XP array to object for easier access
 */
export function totalXPToObject(totals: StudentXPTotal[] | undefined): Record<string, number> {
    if (!totals) return { motricidad: 0, articulacion: 0, flexibilidad: 0 };

    const result: Record<string, number> = {
        motricidad: 0,
        articulacion: 0,
        flexibilidad: 0
    };

    totals.forEach(t => {
        result[t.skill] = (result[t.skill] || 0) + t.totalXp;
    });

    return result;
}

/**
 * Hook to fetch total accumulated XP for multiple students (aggregated)
 * Uses shared cache from useAllStudentXPTotals
 * 
 * @param studentIds - Array of Student IDs
 * @param providedData - Optional pre-fetched data
 * @returns Aggregated total XP data (sum across students)
 */
export function useTotalXPMultiple(studentIds: string[], providedData?: StudentXPTotal[]) {
    const { data: fetchedData, isLoading: isLoadingFetch } = useAllStudentXPTotals();

    const allTotals = providedData || fetchedData;
    const isLoading = providedData ? false : isLoadingFetch;

    const aggregatedTotals = useMemo<StudentXPTotal[]>(() => {
        if (!allTotals || studentIds.length === 0) return [];

        // If single student, just filter for that student
        if (studentIds.length === 1) {
            return allTotals.filter(t =>
                t.studentId === studentIds[0] || (t as any).student_id === studentIds[0]
            );
        }

        // Multiple students: aggregate by skill
        const studentIdSet = new Set(studentIds);
        const skillTotals: Record<string, { totalXp: number; practiceXp: number; evaluationXp: number }> = {};

        allTotals.forEach(t => {
            const id = t.studentId || (t as any).student_id;
            if (!studentIdSet.has(id)) return;

            if (!skillTotals[t.skill]) {
                skillTotals[t.skill] = { totalXp: 0, practiceXp: 0, evaluationXp: 0 };
            }
            skillTotals[t.skill].totalXp += t.totalXp || 0;
            skillTotals[t.skill].practiceXp += t.practiceXp || 0;
            skillTotals[t.skill].evaluationXp += t.evaluationXp || 0;
        });

        // Convert back to array format
        return Object.entries(skillTotals).map(([skill, data]) => ({
            studentId: 'aggregated', // Indicator that this is aggregated
            skill: skill as any,
            totalXp: data.totalXp,
            practiceXp: data.practiceXp,
            evaluationXp: data.evaluationXp,
        } as StudentXPTotal));
    }, [allTotals, studentIds]);

    return { data: aggregatedTotals, isLoading };
}

/**
 * Hook to fetch lifetime practice XP for multiple students (aggregated)
 * Uses shared cache from useAllStudentXPTotals
 * 
 * @param studentIds - Array of Student IDs
 * @param providedData - Optional pre-fetched data
 * @returns Aggregated lifetime practice XP data
 */
export function useLifetimePracticeXPMultiple(studentIds: string[], providedData?: StudentXPTotal[]) {
    const { data: fetchedData, isLoading: isLoadingFetch } = useAllStudentXPTotals();

    const allTotals = providedData || fetchedData;
    const isLoading = providedData ? false : isLoadingFetch;

    const practiceXP = useMemo<RecentXPResult>(() => {
        if (!allTotals || studentIds.length === 0) {
            return { motricidad: 0, articulacion: 0, flexibilidad: 0 };
        }

        const studentIdSet = new Set(studentIds);
        const result: RecentXPResult = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0
        };

        allTotals.forEach((t: any) => {
            const id = t.studentId || t.student_id;
            if (!studentIdSet.has(id)) return;

            const skill = t.skill as keyof RecentXPResult;
            if (skill in result) {
                result[skill] += t.practiceXp || t.practice_xp || 0;
            }
        });

        return result;
    }, [allTotals, studentIds]);

    return { data: practiceXP, isLoading };
}


export interface AggregateLevelGoalsResult {
    motricidad: number;
    articulacion: number;
    flexibilidad: number;
    currentLevel: number | null;
    nextLevel: number | null;
}

/**
 * Hook to fetch and aggregate level goals for multiple students
 * Returns { motricidad, articulacion, flexibilidad, currentLevel, nextLevel } 
 * where goals are the SUM but levels are the AVERAGE (rounded)
 */
export function useAggregateLevelGoals(studentIds: string[]): AggregateLevelGoalsResult {
    // 1. Usar hook centralizado para usuarios
    const { data: users = [] } = useUsers();

    // 2. Fetch all level configs
    const { data: levelConfigs = [] } = useLevelsConfig();

    return useMemo(() => {
        const result: AggregateLevelGoalsResult = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0,
            currentLevel: null,
            nextLevel: null
        };

        if (users.length === 0 || levelConfigs.length === 0 || studentIds.length === 0) {
            return result;
        }

        const studentIdSet = new Set(studentIds);
        const activeProfiles = users.filter((u: UserEntity) => studentIdSet.has(u.id));

        if (activeProfiles.length === 0) return result;

        let totalLevels = 0;

        // For each selected student
        activeProfiles.forEach((user: UserEntity) => {
            const level = user.nivelTecnico || 1;
            totalLevels += level;

            // Find config for current level (not next level)
            const config = levelConfigs.find((c: any) => c.level === level);

            if (config) {
                result.motricidad += config.minXpMotr || 0;
                result.articulacion += config.minXpArt || 0;
                result.flexibilidad += config.minXpFlex || 0;
            } else {
                // Fallback: if user has no level config, use 100 as safe default
                result.motricidad += 100;
                result.articulacion += 100;
                result.flexibilidad += 100;
            }
        });

        // Calculate average levels
        const avgLevel = Math.round(totalLevels / activeProfiles.length);
        result.currentLevel = avgLevel;
        result.nextLevel = avgLevel + 1;

        return result;

    }, [users, levelConfigs, studentIds]);
}
