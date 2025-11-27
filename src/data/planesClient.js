import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'planes';

export const PlanesAPI = {
  getAllPlanes() {
    return getEntity(ENTITY_KEY);
  },
  createPlan(data) {
    return createItem(ENTITY_KEY, data);
  },
  updatePlan(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deletePlan(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


