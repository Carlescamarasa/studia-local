import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'registrosBloque';

export const RegistrosBloqueAPI = {
  getAllRegistrosBloque() {
    return getEntity(ENTITY_KEY);
  },
  createRegistroBloque(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateRegistroBloque(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteRegistroBloque(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


