import { useQuery } from '@tanstack/react-query';
import { useAllStudentXPTotals, useAggregateLevelGoals } from '@/hooks/useXP';
import { useEvaluacionesTecnicas } from '@/hooks/entities/useEvaluacionesTecnicas';
import { useFeedbacksSemanal } from '@/hooks/entities/useFeedbacksSemanal';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { StudentXPTotal } from '@/services/xpService';

/**
 * Interface for the processed skills data
 */
export interface ProcessedSkillsData {
    goals: {
        motricidad: number;
        articulacion: number;
        flexibilidad: number;
    };
    currentProgress: {
        motricidad: number;
        articulacion: number;
        flexibilidad: number;
    };
    totalXP: {
        motricidad: number;
        articulacion: number;
        flexibilidad: number;
    };
    evaluationsCount: number;
    feedbacksCount: number;
    // Add more processed fields as needed
}

/**
 * Hook to get processed student skills data.
 * Aggregates data from XP, evaluations, and feedback to provide a unified view.
 * 
 * @param studentId - The ID of the student
 */
export function useStudentSkillsData(studentId: string) {
    // 1. Fetch all raw data using existing hooks
    // These hooks handle their own caching and invalidation
    const { data: xpTotals, isLoading: isLoadingXP } = useAllStudentXPTotals();
    const { data: evaluations, isLoading: isLoadingEvals } = useEvaluacionesTecnicas();
    const { data: feedbacks, isLoading: isLoadingFeedbacks } = useFeedbacksSemanal();

    // Derived data for goals (synchronous use of hook that uses cached data)
    const levelGoals = useAggregateLevelGoals([studentId]);

    // 2. Use React Query to cache the EXPENSIVE processing step
    // The query key makes it unique per student
    // Dependencies are implicitly strictly controlled by the 'enabled' check and invalidation flows
    return useQuery<ProcessedSkillsData>({
        queryKey: QUERY_KEYS.STUDENT_SKILLS_PROCESSED(studentId),

        // The processing logic happens here
        queryFn: async () => {
            // Note: In a real heavy async scenario, we might offload this to a worker
            // or fetch additional specific data. Here strict sync processing is wrapped.

            return processSkillsData({
                studentId,
                xpTotals: xpTotals || [],
                evaluations: evaluations || [],
                feedbacks: feedbacks || [],
                levelGoals
            });
        },

        // Only run processing when all source data is available
        enabled: Boolean(xpTotals && evaluations && feedbacks && studentId),

        // Cache the processed result for 2 minutes as requested
        staleTime: 1000 * 60 * 2,
    });
}

/**
 * Utility function to process and aggregate skills data.
 * This can be moved to a separate utility file in `src/lib/` or `src/utils/` later.
 */
function processSkillsData({
    studentId,
    xpTotals,
    evaluations,
    feedbacks,
    levelGoals
}: {
    studentId: string;
    xpTotals: StudentXPTotal[];
    evaluations: any[]; // Replace with specific type if available
    feedbacks: any[];   // Replace with specific type
    levelGoals: { motricidad: number; articulacion: number; flexibilidad: number; };
}): ProcessedSkillsData {

    // Filter XP for this specific student
    const studentXP = xpTotals.filter(t =>
        t.studentId === studentId || (t as any).student_id === studentId
    );

    // Calculate aggregated totals per skill
    const totals = { motricidad: 0, articulacion: 0, flexibilidad: 0 };

    studentXP.forEach(t => {
        const skill = t.skill as keyof typeof totals;
        if (skill in totals) {
            totals[skill] += t.totalXp || 0;
        }
    });

    // Filter evaluations for this student
    const studentEvals = evaluations.filter(e => e.student_id === studentId);

    // Filter feedbacks for this student
    const studentFeedbacks = feedbacks.filter(f => f.student_id === studentId);

    return {
        goals: levelGoals,
        totalXP: totals,
        currentProgress: {
            motricidad: levelGoals.motricidad > 0 ? (totals.motricidad / levelGoals.motricidad) * 100 : 0,
            articulacion: levelGoals.articulacion > 0 ? (totals.articulacion / levelGoals.articulacion) * 100 : 0,
            flexibilidad: levelGoals.flexibilidad > 0 ? (totals.flexibilidad / levelGoals.flexibilidad) * 100 : 0,
        },
        evaluationsCount: studentEvals.length,
        feedbacksCount: studentFeedbacks.length,
    };
}
