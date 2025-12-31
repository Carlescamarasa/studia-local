// Capa base de acceso a datos en localStorage
// IMPORTANTE: este módulo es la única pieza que debe tocar directamente localStorage
// para los datos de dominio (asignaciones, planes, etc.)
//
// La idea es que en el futuro podamos reemplazar estas funciones por llamadas HTTP
// manteniendo la misma API hacia el resto de la app.

const STORAGE_KEY = 'studia_data';
const STORAGE_VERSION = 1;

export interface StorageData {
  version: number;
  asignaciones: unknown[];
  bloques: unknown[];
  feedbacksSemanal: unknown[];
  piezas: unknown[];
  planes: unknown[];
  registrosBloque: unknown[];
  registrosSesion: unknown[];
  usuarios: unknown[];
  evaluacionesTecnicas: unknown[];
  [key: string]: unknown;
}

const DEFAULT_DATA: StorageData = {
  version: STORAGE_VERSION,
  asignaciones: [],
  bloques: [],
  feedbacksSemanal: [],
  piezas: [],
  planes: [],
  registrosBloque: [],
  registrosSesion: [],
  usuarios: [],
  evaluacionesTecnicas: [],
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeData(raw: Record<string, unknown> | null): StorageData {
  const base = { ...DEFAULT_DATA };
  if (!raw || typeof raw !== 'object') return base;

  return {
    ...base,
    ...raw,
    version: STORAGE_VERSION,
    asignaciones: Array.isArray(raw.asignaciones) ? raw.asignaciones : [],
    bloques: Array.isArray(raw.bloques) ? raw.bloques : [],
    feedbacksSemanal: Array.isArray(raw.feedbacksSemanal) ? raw.feedbacksSemanal : [],
    piezas: Array.isArray(raw.piezas) ? raw.piezas : [],
    planes: Array.isArray(raw.planes) ? raw.planes : [],
    registrosBloque: Array.isArray(raw.registrosBloque) ? raw.registrosBloque : [],
    registrosSesion: Array.isArray(raw.registrosSesion) ? raw.registrosSesion : [],
    usuarios: Array.isArray(raw.usuarios) ? raw.usuarios : [],
    evaluacionesTecnicas: Array.isArray(raw.evaluacionesTecnicas) ? raw.evaluacionesTecnicas : [],
  };
}

export function loadFromStorage(): StorageData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeData(parsed);
  } catch (error) {
    console.error('[localStorageClient] Error leyendo datos de localStorage:', error);
    return null;
  }
}

export function saveToStorage(partialData: Partial<StorageData>): StorageData | null {
  if (!isBrowser()) return null;
  try {
    const existing = loadFromStorage() || DEFAULT_DATA;
    const next = normalizeData({
      ...existing,
      ...partialData,
      version: STORAGE_VERSION,
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('[localStorageClient] Error guardando datos en localStorage:', error);
    return null;
  }
}

export function getEntity(name: string): unknown[] {
  const data = loadFromStorage();
  if (!data) return [];
  const entity = data[name];
  return Array.isArray(entity) ? entity : [];
}

export function setEntity(name: string, items: unknown[]): StorageData | null {
  const current = loadFromStorage() || DEFAULT_DATA;
  const next = {
    ...current,
    [name]: Array.isArray(items) ? items : [],
  };
  return saveToStorage(next);
}

export function generateId(entityName: string): string {
  const prefix = (entityName || 'item').toString().toLowerCase();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface EntityItem {
  id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export function createItem(name: string, item: EntityItem): EntityItem {
  const current = getEntity(name) as EntityItem[];
  const newItem: EntityItem = {
    ...item,
    id: item?.id || generateId(name),
    created_at: item?.created_at || new Date().toISOString(),
  };
  const nextItems = [...current, newItem];
  saveToStorage({ [name]: nextItems });
  return newItem;
}

export function updateItem(name: string, id: string, updates: Partial<EntityItem>): EntityItem {
  const current = getEntity(name) as EntityItem[];
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`[localStorageClient] ${name} con id ${id} no encontrado`);
  }
  const updated = { ...current[index], ...updates };
  const nextItems = [...current];
  nextItems[index] = updated;
  saveToStorage({ [name]: nextItems });
  return updated;
}

export function deleteItem(name: string, id: string): { success: boolean } {
  const current = getEntity(name) as EntityItem[];
  const exists = current.some((item) => item.id === id);
  if (!exists) {
    throw new Error(`[localStorageClient] ${name} con id ${id} no encontrado`);
  }
  const nextItems = current.filter((item) => item.id !== id);
  saveToStorage({ [name]: nextItems });
  return { success: true };
}

// Helper para inicializar desde un snapshot externo (por ejemplo, rebuildLocalData)
export function bootstrapFromSnapshot(snapshot: Record<string, unknown>): StorageData | null {
  if (!isBrowser()) return null;
  const normalized = normalizeData(snapshot);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
