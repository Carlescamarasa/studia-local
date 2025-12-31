import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { Pieza } from '@/features/shared/types/domain';

const ENTITY_KEY = 'piezas';

export const PiezasAPI = {
  getAllPiezas(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  createPieza(data: Partial<Pieza>) {
    return createItem(ENTITY_KEY, data);
  },
  updatePieza(id: string, updates: Partial<Pieza>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deletePieza(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
