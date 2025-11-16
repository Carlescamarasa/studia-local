import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'piezas';

export const PiezasAPI = {
  getAllPiezas() {
    return getEntity(ENTITY_KEY);
  },
  createPieza(data) {
    return createItem(ENTITY_KEY, data);
  },
  updatePieza(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deletePieza(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


