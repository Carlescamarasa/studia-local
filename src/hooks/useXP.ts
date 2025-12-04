import { useQuery } from '@tanstack/react-query';
import { computePracticeXP, computeTotalXP, capXPForDisplay, computeLifetimePracticeXP } from '@/services/xpService';
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
 * Hook to fetch lifetime practice XP for separation of data
 * 
 * @param studentId - Student ID
 * @returns Lifetime practice XP data
 */
export function useLifetimePracticeXP(studentId: string) {
    return useQuery<RecentXPResult>({
        queryKey: ['lifetime-practice-xp', studentId],
        queryFn: () => computeLifetimePracticeXP(studentId),
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}

/**
 * Hook to fetch total accumulated XP for all skills
 * 
 * @param studentId - Student ID
 * @returns Total XP data (unlimited)
 */
export function useTotalXP(studentId: string) {
    return useQuery<StudentXPTotal[]>({
        queryKey: ['total-xp', studentId],
        queryFn: () => computeTotalXP(studentId),
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
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
