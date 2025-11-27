import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'eventosCalendario';

export const EventosCalendarioAPI = {
  getAllEventosCalendario() {
    return getEntity(ENTITY_KEY);
  },
  createEventoCalendario(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateEventoCalendario(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteEventoCalendario(id) {
    return deleteItem(ENTITY_KEY, id);
  },
};

