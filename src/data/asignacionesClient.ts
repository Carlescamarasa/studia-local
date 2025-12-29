import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'asignaciones';

export const AsignacionesAPI = {
  getAllAsignaciones() {
    return getEntity(ENTITY_KEY);
  },
  createAsignacion(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateAsignacion(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteAsignacion(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};


