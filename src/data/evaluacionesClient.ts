import { EvaluacionTecnica, CreateEvaluacionTecnicaInput, UpdateEvaluacionTecnicaInput } from '@/shared/types/domain';
// @ts-ignore
import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'evaluacionesTecnicas';

export const EvaluacionesAPI = {
    /**
     * Obtener todas las evaluaciones técnicas
     */
    getEvaluacionesTecnicas(): EvaluacionTecnica[] {
        return getEntity(ENTITY_KEY);
    },

    /**
     * Obtener evaluaciones de un alumno específico
     */
    getEvaluacionesByAlumno(alumnoId: string): EvaluacionTecnica[] {
        const all = getEntity(ENTITY_KEY) as EvaluacionTecnica[];
        return all.filter(e => e.alumnoId === alumnoId);
    },

    /**
     * Crear una nueva evaluación técnica
     */
    createEvaluacionTecnica(data: CreateEvaluacionTecnicaInput): EvaluacionTecnica {
        return createItem(ENTITY_KEY, data);
    },

    /**
     * Actualizar una evaluación existente
     */
    updateEvaluacionTecnica(id: string, updates: UpdateEvaluacionTecnicaInput): EvaluacionTecnica {
        return updateItem(ENTITY_KEY, id, updates);
    },

    /**
     * Eliminar una evaluación
     */
    deleteEvaluacionTecnica(id: string): { success: boolean } {
        return deleteItem(ENTITY_KEY, id);
    }
};
