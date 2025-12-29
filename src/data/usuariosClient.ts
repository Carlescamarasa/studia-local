import { getEntity, setEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'usuarios';

export const UsuariosAPI = {
  getAllUsuarios() {
    return getEntity(ENTITY_KEY);
  },
  setAllUsuarios(items) {
    return setEntity(ENTITY_KEY, items);
  },
  createUsuario(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateUsuario(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteUsuario(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


