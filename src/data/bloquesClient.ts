import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { Bloque } from '@/features/shared/types/domain';

const ENTITY_KEY = 'bloques';

export const BloquesAPI = {
  getAllBloques(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createBloque(data: Partial<Bloque>) {
    return createItem(ENTITY_KEY, data);
  },
  updateBloque(id: string, updates: Partial<Bloque>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteBloque(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
