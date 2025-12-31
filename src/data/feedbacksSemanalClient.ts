import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { FeedbackSemanal } from '@/types/data.types';

const ENTITY_KEY = 'feedbacksSemanal';

interface FeedbackEntity {
  id?: string;
  alumnoId?: string;
  semanaInicioISO?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export const FeedbacksSemanalAPI = {
  getAllFeedbacksSemanal(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createFeedbackSemanal(data: Partial<FeedbackSemanal>) {
    return createItem(ENTITY_KEY, data);
  },
  updateFeedbackSemanal(id: string, updates: Partial<FeedbackSemanal>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteFeedbackSemanal(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
  /**
   * Upsert feedback semanal: crea si no existe, actualiza si existe.
   * Usa alumnoId + semanaInicioISO como clave única.
   */
  upsertFeedbackSemanal(data: Partial<FeedbackSemanal>) {
    const all = getEntity(ENTITY_KEY) as FeedbackEntity[];
    const existing = all.find(f =>
      f.alumnoId === data.alumnoId &&
      f.semanaInicioISO === data.semanaInicioISO
    );
    if (existing && existing.id) {
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
