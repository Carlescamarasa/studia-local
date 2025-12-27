import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDataClient } from '../api/localDataClient';
import { EvaluacionTecnica, CreateEvaluacionTecnicaInput, UpdateEvaluacionTecnicaInput } from '@/shared/types/domain';
import { toast } from 'sonner';
import { QUERY_KEYS } from '../lib/queryKeys';

/**
 * Hook para gestionar las evaluaciones técnicas de los estudiantes.
 * 
 * @param alumnoId - ID del alumno para filtrar las evaluaciones (opcional)
 */
export function useEvaluaciones(alumnoId?: string) {
    const queryClient = useQueryClient();

    // Query: Obtener evaluaciones del alumno (usando el queryKey estandarizado)
    const evaluacionesQuery = useQuery({
        queryKey: QUERY_KEYS.EVALUACIONES_TECNICAS_STUDENT(alumnoId || ''),
        queryFn: async () => {
            if (!alumnoId) return [];
            return localDataClient.entities.EvaluacionTecnica.filter({ alumnoId });
        },
        enabled: !!alumnoId,
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
        gcTime: 1000 * 60 * 10,   // 10 minutos
        refetchOnWindowFocus: false,
    });

    // Mutation: Crear evaluación
    const createMutation = useMutation({
        mutationFn: async (data: CreateEvaluacionTecnicaInput) => {
            return localDataClient.entities.EvaluacionTecnica.create(data);
        },
        onSuccess: (newEvaluacion) => {
            // Invalidar query global y del alumno específico usando helper centralizado
            QUERY_KEYS.invalidateStudentSkills(queryClient, newEvaluacion.alumnoId);
            toast.success('Evaluación creada correctamente');
        },
        onError: (error: any) => {
            console.error('Error al crear evaluación:', error);
            toast.error('Error al crear la evaluación');
        },
    });

    // Mutation: Actualizar evaluación
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateEvaluacionTecnicaInput }) => {
            return localDataClient.entities.EvaluacionTecnica.update(id, data);
        },
        onSuccess: (updatedEvaluacion) => {
            QUERY_KEYS.invalidateStudentSkills(queryClient, updatedEvaluacion.alumnoId);
            toast.success('Evaluación actualizada correctamente');
        },
        onError: (error: any) => {
            console.error('Error al actualizar evaluación:', error);
            toast.error('Error al actualizar la evaluación');
        },
    });

    // Mutation: Eliminar evaluación
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return localDataClient.entities.EvaluacionTecnica.delete(id);
        },
        onSuccess: () => {
            // Invalidar cache de evaluaciones técnicas
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVALUACIONES_TECNICAS });
            if (alumnoId) {
                QUERY_KEYS.invalidateStudentSkills(queryClient, alumnoId);
            }
            toast.success('Evaluación eliminada correctamente');
        },
        onError: (error: any) => {
            console.error('Error al eliminar evaluación:', error);
            toast.error('Error al eliminar la evaluación');
        },
    });

    return {
        // Data
        evaluaciones: evaluacionesQuery.data || [],
        isLoading: evaluacionesQuery.isLoading,
        isError: evaluacionesQuery.isError,
        error: evaluacionesQuery.error,

        // Actions
        createEvaluacion: createMutation.mutateAsync,
        updateEvaluacion: updateMutation.mutateAsync,
        deleteEvaluacion: deleteMutation.mutateAsync,

        // States
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

