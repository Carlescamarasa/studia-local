import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { Plan } from '@/features/shared/types/domain';

const ENTITY_KEY = 'planes';

export const PlanesAPI = {
  getAllPlanes(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createPlan(data: Partial<Plan>) {
    return createItem(ENTITY_KEY, data);
  },
  updatePlan(id: string, updates: Partial<Plan>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deletePlan(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
