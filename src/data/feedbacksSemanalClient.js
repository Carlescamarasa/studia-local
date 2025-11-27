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
};


