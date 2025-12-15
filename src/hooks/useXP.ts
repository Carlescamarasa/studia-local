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
        result[t.skill] = t.totalXp;
    });

    return result;
}

