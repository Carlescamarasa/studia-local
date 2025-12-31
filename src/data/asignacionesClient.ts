import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { Asignacion } from '@/types/data.types';

const ENTITY_KEY = 'asignaciones';

export const AsignacionesAPI = {
  getAllAsignaciones(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createAsignacion(data: Partial<Asignacion>) {
    return createItem(ENTITY_KEY, data);
  },
  updateAsignacion(id: string, updates: Partial<Asignacion>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteAsignacion(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
