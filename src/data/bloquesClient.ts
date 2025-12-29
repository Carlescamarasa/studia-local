import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'bloques';

export const BloquesAPI = {
  getAllBloques() {
    return getEntity(ENTITY_KEY);
  },
  createBloque(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateBloque(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteBloque(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


