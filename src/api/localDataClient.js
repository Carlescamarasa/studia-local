// src/api/localDataClient.js
import { localUsers } from '@/local-data/localUsers';

// Referencia global a los datos locales (se inyecta desde LocalDataProvider)
let localDataRef = {
  asignaciones: [],
  bloques: [],
  feedbacksSemanal: [],
  piezas: [],
  planes: [],
  registrosBloque: [],
  registrosSesion: [],
  usuarios: localUsers,
};

// Función para inyectar datos desde LocalDataProvider
export function setLocalDataRef(data) {
  localDataRef = data;
}

// Usuario actual (se guarda en localStorage)
const CURRENT_USER_KEY = 'localCurrentUserId';

export function getCurrentUser() {
  const userId = localStorage.getItem(CURRENT_USER_KEY) || localUsers[0]?.id;
  return localDataRef.usuarios.find(u => u.id === userId) || localUsers[0];
}

export function setCurrentUser(userId) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

// Helper para crear entidades con métodos CRUD
function createEntityAPI(entityName, dataKey) {
  return {
    list: async (sort = '') => {
      let data = [...(localDataRef[dataKey] || [])];
      // Ordenamiento simple (por ahora solo por ID)
      if (sort.startsWith('-')) {
        const field = sort.slice(1);
        data.sort((a, b) => {
          if (a[field] < b[field]) return 1;
          if (a[field] > b[field]) return -1;
          return 0;
        });
      }
      return data;
    },
    get: async (id) => {
      return localDataRef[dataKey]?.find(item => item.id === id) || null;
    },
    filter: async (filters = {}, limit = null) => {
      let data = [...(localDataRef[dataKey] || [])];
      // Filtrado simple
      Object.keys(filters).forEach(key => {
        data = data.filter(item => item[key] === filters[key]);
      });
      if (limit) data = data.slice(0, limit);
      return data;
    },
    create: async (data) => {
      const newItem = {
        ...data,
        id: data.id || `${entityName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_date: new Date().toISOString(),
      };
      localDataRef[dataKey].push(newItem);
      // Guardar en localStorage para persistencia
      try {
        const stored = JSON.parse(localStorage.getItem(`local_${dataKey}`) || "[]");
        stored.push(newItem);
        localStorage.setItem(`local_${dataKey}`, JSON.stringify(stored));
      } catch (e) {
        console.error('Error guardando en localStorage:', e);
      }
      return newItem;
    },
    update: async (id, data) => {
      const index = localDataRef[dataKey].findIndex(item => item.id === id);
      if (index === -1) throw new Error(`${entityName} no encontrado`);
      const updated = { ...localDataRef[dataKey][index], ...data };
      localDataRef[dataKey][index] = updated;
      // Actualizar localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(`local_${dataKey}`) || "[]");
        const storedIndex = stored.findIndex(item => item.id === id);
        if (storedIndex !== -1) {
          stored[storedIndex] = updated;
          localStorage.setItem(`local_${dataKey}`, JSON.stringify(stored));
        }
      } catch (e) {
        console.error('Error actualizando localStorage:', e);
      }
      return updated;
    },
    delete: async (id) => {
      const index = localDataRef[dataKey].findIndex(item => item.id === id);
      if (index === -1) throw new Error(`${entityName} no encontrado`);
      localDataRef[dataKey].splice(index, 1);
      // Actualizar localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(`local_${dataKey}`) || "[]");
        const filtered = stored.filter(item => item.id !== id);
        localStorage.setItem(`local_${dataKey}`, JSON.stringify(filtered));
      } catch (e) {
        console.error('Error eliminando de localStorage:', e);
      }
      return { success: true };
    },
    bulkCreate: async (items) => {
      const newItems = items.map(item => ({
        ...item,
        id: item.id || `${entityName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_date: new Date().toISOString(),
      }));
      localDataRef[dataKey].push(...newItems);
      return newItems;
    },
  };
}

// API de autenticación local
export const localDataClient = {
  auth: {
    me: async () => {
      return getCurrentUser();
    },
    logout: async () => {
      // No hacer nada en local, solo limpiar sessionStorage
      sessionStorage.clear();
      return { success: true };
    },
    updateMe: async (data) => {
      const currentUser = getCurrentUser();
      const updated = { ...currentUser, ...data };
      const index = localDataRef.usuarios.findIndex(u => u.id === currentUser.id);
      if (index !== -1) {
        localDataRef.usuarios[index] = updated;
      }
      return updated;
    },
  },
  entities: {
    User: {
      list: async () => localDataRef.usuarios,
      get: async (id) => localDataRef.usuarios.find(u => u.id === id),
      filter: async (filters = {}) => {
        let users = [...localDataRef.usuarios];
        Object.keys(filters).forEach(key => {
          users = users.filter(u => u[key] === filters[key]);
        });
        return users;
      },
      create: async (data) => {
        const newUser = {
          ...data,
          id: data.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        localDataRef.usuarios.push(newUser);
        return newUser;
      },
      update: async (id, data) => {
        const index = localDataRef.usuarios.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');
        const updated = { ...localDataRef.usuarios[index], ...data };
        localDataRef.usuarios[index] = updated;
        return updated;
      },
      delete: async (id) => {
        const index = localDataRef.usuarios.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');
        localDataRef.usuarios.splice(index, 1);
        return { success: true };
      },
    },
    Asignacion: createEntityAPI('Asignacion', 'asignaciones'),
    Bloque: createEntityAPI('Bloque', 'bloques'),
    FeedbackSemanal: createEntityAPI('FeedbackSemanal', 'feedbacksSemanal'),
    Pieza: createEntityAPI('Pieza', 'piezas'),
    Plan: createEntityAPI('Plan', 'planes'),
    RegistroBloque: createEntityAPI('RegistroBloque', 'registrosBloque'),
    RegistroSesion: createEntityAPI('RegistroSesion', 'registrosSesion'),
  },
};

