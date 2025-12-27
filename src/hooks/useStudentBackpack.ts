
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudentBackpack } from '@/shared/services/backpackService';
import { useEffectiveUser } from '@/providers/EffectiveUserProvider';

export const QUERY_KEY_BACKPACK = 'studentBackpack';

export function useStudentBackpack(studentId?: string) {
    const { effectiveUserId } = useEffectiveUser();
    const targetStudentId = studentId || effectiveUserId;

    return useQuery({
        queryKey: [QUERY_KEY_BACKPACK, targetStudentId],
        queryFn: () => {
            if (!targetStudentId) return Promise.resolve([]);
            return getStudentBackpack(targetStudentId);
        },
        enabled: !!targetStudentId,
    });
}
