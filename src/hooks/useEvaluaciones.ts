import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
import { EvaluacionTecnica, CreateEvaluacionTecnicaInput, UpdateEvaluacionTecnicaInput } from '@/types/domain';
import { toast } from 'sonner';

/**
 * Hook para gestionar las evaluaciones técnicas de los estudiantes.
 * 
 * @param alumnoId - ID del alumno para filtrar las evaluaciones (opcional)
 */
export function useEvaluaciones(alumnoId?: string) {
    const queryClient = useQueryClient();

    // Query: Obtener evaluaciones del alumno (usando el queryKey estandarizado)
    const evaluacionesQuery = useQuery({
        queryKey: ['evaluacionesTecnicas', alumnoId],
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
            // Invalidar query global y del alumno específico
            queryClient.invalidateQueries({ queryKey: ['evaluacionesTecnicas'] });
            queryClient.invalidateQueries({ queryKey: ['qualitative-xp', newEvaluacion.alumnoId] });
            queryClient.invalidateQueries({ queryKey: ['total-xp-v2', newEvaluacion.alumnoId] });
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
            queryClient.invalidateQueries({ queryKey: ['evaluacionesTecnicas'] });
            queryClient.invalidateQueries({ queryKey: ['qualitative-xp', updatedEvaluacion.alumnoId] });
            queryClient.invalidateQueries({ queryKey: ['total-xp-v2', updatedEvaluacion.alumnoId] });
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
            // Invalidar todo el cache de evaluaciones técnicas ya que no tenemos el alumnoId aquí fácilmente
            // pero el hook useEvaluacionesTecnicas se mantendrá actualizado
            queryClient.invalidateQueries({ queryKey: ['evaluacionesTecnicas'] });
            if (alumnoId) {
                queryClient.invalidateQueries({ queryKey: ['qualitative-xp', alumnoId] });
                queryClient.invalidateQueries({ queryKey: ['total-xp-v2', alumnoId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['qualitative-xp'] });
                queryClient.invalidateQueries({ queryKey: ['total-xp-v2'] });
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

