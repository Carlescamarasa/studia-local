import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/remote/client';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface StudentSkillsRadarData {
    motricidad: number;
    articulacion: number;
    flexibilidad: number;
    sonido: number;
    cognicion: number;
    meta?: {
        level: number;
        xp_motr: number;
        req_motr: number;
        xp_art: number;
        req_art: number;
        xp_flex: number;
        req_flex: number;
    };
}

/**
 * Hook to fetch student skills radar data using Supabase RPC.
 * This replaces client-side calculation/normalization logic.
 * 
 * @param studentId - Structure matches Supabase UUID
 */
export function useStudentSkillsRadar(studentId: string) {
    return useQuery<StudentSkillsRadarData>({
        queryKey: QUERY_KEYS.STUDENT_SKILLS_RADAR(studentId),
        queryFn: async () => {
            if (!studentId) throw new Error('Student ID is required');

            const { data, error } = await supabase.rpc('get_student_skills_radar', {
                p_student_id: studentId,
                p_window_days: 30 // Default window
            });

            if (error) {
                console.error('Error fetching student skills radar:', error);
                throw error;
            }

            return data as StudentSkillsRadarData;
        },
        enabled: !!studentId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}
