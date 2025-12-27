
import { useQuery } from '@tanstack/react-query';
import { remoteDataAPI } from '@/api/remote/api';
import { useEffectiveUser } from '@/providers/EffectiveUserProvider';
import type { StudentBackpackItem } from '@/shared/types/domain';

export const QUERY_KEY_BACKPACK = 'studentBackpack';

export function useStudentBackpack(studentId?: string) {
    const { effectiveUserId } = useEffectiveUser();
    const targetStudentId = studentId || effectiveUserId;

    return useQuery<StudentBackpackItem[]>({
        queryKey: [QUERY_KEY_BACKPACK, targetStudentId],
        queryFn: async () => {
            if (!targetStudentId) return [];
            // Use remoteDataAPI which queries Supabase directly
            // Returns data in camelCase format (snakeToCamel applied internally)
            const items = await remoteDataAPI.studentBackpack.filter({
                studentId: targetStudentId
            });
            return items as StudentBackpackItem[];
        },
        enabled: !!targetStudentId,
    });
}
