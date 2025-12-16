import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { computePracticeXP, capXPForDisplay } from '@/services/xpService';
import { localDataClient } from '@/api/localDataClient';
import type { RecentXPResult, StudentXPTotal } from '@/services/xpService';

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
    });
}

/**
 * Hook to fetch lifetime practice XP for separation of data
 * Uses shared cache from useAllStudentXPTotals
 * 
 * @param studentId - Student ID
 * @returns Lifetime practice XP data
 */
export function useLifetimePracticeXP(studentId: string) {
    const { data: allTotals, isLoading } = useAllStudentXPTotals();

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
 * @returns Total XP data (unlimited)
 */
export function useTotalXP(studentId: string) {
    const { data: allTotals, isLoading } = useAllStudentXPTotals();

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
 * @returns Aggregated total XP data (sum across students)
 */
export function useTotalXPMultiple(studentIds: string[]) {
    const { data: allTotals, isLoading } = useAllStudentXPTotals();

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
 * @returns Aggregated lifetime practice XP data
 */
export function useLifetimePracticeXPMultiple(studentIds: string[]) {
    const { data: allTotals, isLoading } = useAllStudentXPTotals();

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


/**
 * Hook to fetch and aggregate level goals for multiple students
 * Returns { motricidad, articulacion, flexibilidad } where each is the SUM of goals for selected students
 */
export function useAggregateLevelGoals(studentIds: string[]) {
    // 1. Fetch all users to get their current levels
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => localDataClient.entities.User.list(),
        staleTime: 1000 * 60 * 5,
    });

    // 2. Fetch all level configs
    const { data: levelConfigs = [] } = useQuery({
        queryKey: ['level-configs-all'],
        queryFn: () => localDataClient.entities.LevelConfig.list(),
        staleTime: 1000 * 60 * 60, // 1 hour cache, these rarely change
    });

    return useMemo(() => {
        const result = { motricidad: 0, articulacion: 0, flexibilidad: 0 };

        if (users.length === 0 || levelConfigs.length === 0 || studentIds.length === 0) {
            return result;
        }

        const studentIdSet = new Set(studentIds);

        // For each selected student
        users.forEach(user => {
            if (!studentIdSet.has(user.id)) return;

            const currentLevel = user.nivelTecnico || 0;
            const nextLevel = currentLevel + 1;

            // Find config for next level
            const config = levelConfigs.find((c: any) => c.level === nextLevel);

            // If found, add to total goals. If not (max level?), maybe fall back or add 0?
            // Assuming if no next level, goal is 0 or stay at max. 
            // For now, if no config found (e.g. level 10 -> 11), we assume 0 goal increment.
            // Or fallback to a default if level 1?
            if (config) {
                result.motricidad += config.minXpMotr || 0;
                result.articulacion += config.minXpArt || 0;
                result.flexibilidad += config.minXpFlex || 0;
            } else {
                // Fallback: if user has no next level config, maybe use 100? 
                // Or 0? Let's use 100 as safe default to avoid 0 denominator if data missing
                result.motricidad += 100;
                result.articulacion += 100;
                result.flexibilidad += 100;
            }
        });

        return result;

    }, [users, levelConfigs, studentIds]);
}
