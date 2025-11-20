// Capa base de acceso a datos en localStorage
// IMPORTANTE: este módulo es la única pieza que debe tocar directamente localStorage
// para los datos de dominio (asignaciones, planes, etc.)
//
// La idea es que en el futuro podamos reemplazar estas funciones por llamadas HTTP
// manteniendo la misma API hacia el resto de la app.

const STORAGE_KEY = 'studia_data';
const STORAGE_VERSION = 1;

const DEFAULT_DATA = {
  version: STORAGE_VERSION,
  asignaciones: [],
  bloques: [],
  feedbacksSemanal: [],
  piezas: [],
  planes: [],
  registrosBloque: [],
  registrosSesion: [],
  usuarios: [],
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeData(raw) {
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
  };
}

export function loadFromStorage() {
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

export function saveToStorage(partialData) {
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

export function getEntity(name) {
  const data = loadFromStorage();
  if (!data) return [];
  return Array.isArray(data[name]) ? data[name] : [];
}

export function setEntity(name, items) {
  const current = loadFromStorage() || DEFAULT_DATA;
  const next = {
    ...current,
    [name]: Array.isArray(items) ? items : [],
  };
  return saveToStorage(next);
}

export function generateId(entityName) {
  const prefix = (entityName || 'item').toString().toLowerCase();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createItem(name, item) {
  const current = getEntity(name);
  const newItem = {
    ...item,
    id: item?.id || generateId(name),
    created_date: item?.created_date || new Date().toISOString(),
  };
  const nextItems = [...current, newItem];
  saveToStorage({ [name]: nextItems });
  return newItem;
}

export function updateItem(name, id, updates) {
  const current = getEntity(name);
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

export function deleteItem(name, id) {
  const current = getEntity(name);
  const exists = current.some((item) => item.id === id);
  if (!exists) {
    throw new Error(`[localStorageClient] ${name} con id ${id} no encontrado`);
  }
  const nextItems = current.filter((item) => item.id !== id);
  saveToStorage({ [name]: nextItems });
  return { success: true };
}

// Helper para inicializar desde un snapshot externo (por ejemplo, rebuildLocalData)
export function bootstrapFromSnapshot(snapshot) {
  if (!isBrowser()) return null;
  const normalized = normalizeData(snapshot);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}


