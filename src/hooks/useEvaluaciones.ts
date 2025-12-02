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

    // Query: Obtener evaluaciones del alumno
    const evaluacionesQuery = useQuery({
        queryKey: ['evaluaciones', alumnoId],
        queryFn: async () => {
            if (!alumnoId) return [];
            return localDataClient.entities.EvaluacionTecnica.filter({ alumnoId });
        },
        enabled: !!alumnoId,
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    // Mutation: Crear evaluación
    const createMutation = useMutation({
        mutationFn: async (data: CreateEvaluacionTecnicaInput) => {
            return localDataClient.entities.EvaluacionTecnica.create(data);
        },
        onSuccess: (newEvaluacion) => {
            // Invalidar query del alumno específico
            queryClient.invalidateQueries({ queryKey: ['evaluaciones', newEvaluacion.alumnoId] });
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
            queryClient.invalidateQueries({ queryKey: ['evaluaciones', updatedEvaluacion.alumnoId] });
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
            // Necesitamos el alumnoId para invalidar la caché, así que primero obtenemos la evaluación o asumimos que el componente lo sabe
            // Como deleteItem solo devuelve success, invalidaremos usando el alumnoId del contexto si está disponible
            return localDataClient.entities.EvaluacionTecnica.delete(id);
        },
        onSuccess: () => {
            if (alumnoId) {
                queryClient.invalidateQueries({ queryKey: ['evaluaciones', alumnoId] });
            } else {
                // Si no tenemos alumnoId en el contexto, invalidamos todas las evaluaciones (menos eficiente pero seguro)
                queryClient.invalidateQueries({ queryKey: ['evaluaciones'] });
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
