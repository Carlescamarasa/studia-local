import { getEntity, setEntity, createItem, updateItem, deleteItem } from './localStorageClient';
import { Usuario } from '@/types/data.types';

const ENTITY_KEY = 'usuarios';

export const UsuariosAPI = {
  getAllUsuarios(): unknown[] {
    return getEntity(ENTITY_KEY);
  },
  setAllUsuarios(items: Usuario[]) {
    return setEntity(ENTITY_KEY, items);
  },
  createUsuario(data: Partial<Usuario>) {
    return createItem(ENTITY_KEY, data);
  },
  updateUsuario(id: string, updates: Partial<Usuario>) {
    return updateItem(ENTITY_KEY, id, updates);
  },
  deleteUsuario(id: string) {
    return deleteItem(ENTITY_KEY, id);
  },
};
