import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'feedbacksSemanal';

export const FeedbacksSemanalAPI = {
  getAllFeedbacksSemanal() {
    return getEntity(ENTITY_KEY);
  },
  createFeedbackSemanal(data) {
    return createItem(ENTITY_KEY, data);
  },
  updateFeedbackSemanal(id, updates) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteFeedbackSemanal(id) {
    return deleteItem(ENTITY_KEY, id);
  },
  /**
   * Upsert feedback semanal: crea si no existe, actualiza si existe.
   * Usa alumnoId + semanaInicioISO como clave única.
   */
  upsertFeedbackSemanal(data) {
    const all = getEntity(ENTITY_KEY);
    const existing = all.find(f =>
      f.alumnoId === data.alumnoId &&
      f.semanaInicioISO === data.semanaInicioISO
    );
    if (existing) {
      return updateItem(ENTITY_KEY, existing.id, {
        ...data,
        updated_at: new Date().toISOString()
      });
    }
    return createItem(ENTITY_KEY, {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  },
};



