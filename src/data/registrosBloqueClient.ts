import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { RegistroBloque } from '@/types/data.types';

const ENTITY_KEY = 'registrosBloque';

export const RegistrosBloqueAPI = {
  getAllRegistrosBloque(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createRegistroBloque(data: Partial<RegistroBloque>) {
    return createItem(ENTITY_KEY, data);
  },
  bulkCreateRegistrosBloque(items: Partial<RegistroBloque>[]) {
    return Promise.all(items.map(item => createItem(ENTITY_KEY, item)));
  },
  updateRegistroBloque(id: string, updates: Partial<RegistroBloque>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteRegistroBloque(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
