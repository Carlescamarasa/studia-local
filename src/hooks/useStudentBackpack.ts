
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudentBackpack } from '@/services/backpackService';
// @ts-ignore
import { useAuth } from '@/auth/AuthProvider'; // Assuming this exists or similar

export const QUERY_KEY_BACKPACK = 'studentBackpack';

export function useStudentBackpack(studentId?: string) {
    const { user } = useAuth();
    const targetStudentId = studentId || user?.id;

    return useQuery({
        queryKey: [QUERY_KEY_BACKPACK, targetStudentId],
        queryFn: () => {
            if (!targetStudentId) return Promise.resolve([]);
            return getStudentBackpack(targetStudentId);
        },
        enabled: !!targetStudentId,
    });
}
