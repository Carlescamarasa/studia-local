import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { RegistroSesion } from '@/types/data.types';

const ENTITY_KEY = 'registrosSesion';

export const RegistrosSesionAPI = {
  getAllRegistrosSesion(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createRegistroSesion(data: Partial<RegistroSesion>) {
    return createItem(ENTITY_KEY, data);
  },
  updateRegistroSesion(id: string, updates: Partial<RegistroSesion>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteRegistroSesion(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
