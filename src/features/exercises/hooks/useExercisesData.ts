import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchBloquesListado,
    fetchPlanesPreviewEjercicios,
    fetchRecentRegistrosSesion,
    createBloque,
    updateBloque,
    deleteBloque
} from "@/api/remoteDataAPI";

export function useExercisesList() {
    return useQuery({
        queryKey: ['exercises-list'],
        queryFn: fetchBloquesListado,
        staleTime: 60 * 1000, // 1 minute
    });
}

export function usePlanesPreview() {
    return useQuery({
        queryKey: ['planes-preview'],
        queryFn: fetchPlanesPreviewEjercicios,
        staleTime: 60 * 1000,
    });
}

export function useRecentSessions() {
    return useQuery({
        queryKey: ['recent-sessions'],
        queryFn: fetchRecentRegistrosSesion,
        staleTime: 60 * 1000,
    });
}

export function useExerciseMutations() {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createBloque,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises-list'] });
            queryClient.invalidateQueries({ queryKey: ['bloques-with-variations'] }); // Also invalidate the global hook
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateBloque(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises-list'] });
            queryClient.invalidateQueries({ queryKey: ['bloques-with-variations'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteBloque,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises-list'] });
            queryClient.invalidateQueries({ queryKey: ['bloques-with-variations'] });
        },
    });

    return {
        createExercise: createMutation,
        updateExercise: updateMutation,
        deleteExercise: deleteMutation,
    };
}
