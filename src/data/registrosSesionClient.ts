import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'registrosSesion';

export const RegistrosSesionAPI = {
  getAllRegistrosSesion() {
    return getEntity(ENTITY_KEY);
  },
  createRegistroSesion(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateRegistroSesion(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteRegistroSesion(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


