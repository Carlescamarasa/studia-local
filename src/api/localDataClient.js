// src/api/localDataClient.js
import { localUsers } from '@/local-data/localUsers';
import { AsignacionesAPI } from '@/data/asignacionesClient';
import { BloquesAPI } from '@/data/bloquesClient';
import { FeedbacksSemanalAPI } from '@/data/feedbacksSemanalClient';
import { PiezasAPI } from '@/data/piezasClient';
import { PlanesAPI } from '@/data/planesClient';
import { RegistrosBloqueAPI } from '@/data/registrosBloqueClient';
import { RegistrosSesionAPI } from '@/data/registrosSesionClient';
import { UsuariosAPI } from '@/data/usuariosClient';
import { getStoredUserId, setStoredUserId, clearStoredUserId } from '@/data/authClient';

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
  _loading: true,
};

// Función para inyectar datos desde LocalDataProvider
export function setLocalDataRef(data) {
  localDataRef = { ...data, _loading: false };
}

// API legada: helpers de usuario actual usados directamente desde varias vistas
export function getCurrentUser() {
  const fallbackId = localUsers[0]?.id;
  const userId = getStoredUserId(fallbackId);
  return localDataRef.usuarios.find(u => u.id === userId) || localUsers[0];
}

export function setCurrentUser(userId) {
  setStoredUserId(userId);
}

function resolveCurrentUser() {
  return getCurrentUser();
}

// Helper para crear entidades con métodos CRUD apoyadas en la capa de datos
function createEntityAPI(entityName, dataKey, entityApi) {
  return {
    list: async (sort = '') => {
      // Esperar a que LocalDataProvider haya inyectado datos (máx ~2s)
      let attempts = 0;
      const maxAttempts = 40;
      while (localDataRef._loading && attempts < maxAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      let data = [...(await entityApi())];
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
      const data = await entityApi();
      return data.find(item => item.id === id) || null;
    },
    filter: async (filters = {}, limit = null) => {
      let data = [...(await entityApi())];
      Object.keys(filters).forEach(key => {
        data = data.filter(item => item[key] === filters[key]);
      });
      if (limit) data = data.slice(0, limit);
      return data;
    },
    create: async (data) => {
      const apiCreate =
        entityName === 'Asignacion' ? AsignacionesAPI.createAsignacion :
        entityName === 'Bloque' ? BloquesAPI.createBloque :
        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.createFeedbackSemanal :
        entityName === 'Pieza' ? PiezasAPI.createPieza :
        entityName === 'Plan' ? PlanesAPI.createPlan :
        entityName === 'RegistroBloque' ? RegistrosBloqueAPI.createRegistroBloque :
        entityName === 'RegistroSesion' ? RegistrosSesionAPI.createRegistroSesion :
        null;

      if (!apiCreate) {
        throw new Error(`API create no definida para entidad ${entityName}`);
      }

      const newItem = await apiCreate(data);

      if (!Array.isArray(localDataRef[dataKey])) {
        localDataRef[dataKey] = [];
      }
      localDataRef[dataKey].push(newItem);
      return newItem;
    },
    update: async (id, updates) => {
      const apiUpdate =
        entityName === 'Asignacion' ? AsignacionesAPI.updateAsignacion :
        entityName === 'Bloque' ? BloquesAPI.updateBloque :
        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.updateFeedbackSemanal :
        entityName === 'Pieza' ? PiezasAPI.updatePieza :
        entityName === 'Plan' ? PlanesAPI.updatePlan :
        entityName === 'RegistroBloque' ? RegistrosBloqueAPI.updateRegistroBloque :
        entityName === 'RegistroSesion' ? RegistrosSesionAPI.updateRegistroSesion :
        null;

      if (!apiUpdate) {
        throw new Error(`API update no definida para entidad ${entityName}`);
      }

      const updated = await apiUpdate(id, updates);
      const index = Array.isArray(localDataRef[dataKey])
        ? localDataRef[dataKey].findIndex(item => item.id === id)
        : -1;
      if (index !== -1) {
        localDataRef[dataKey][index] = updated;
      }
      return updated;
    },
    delete: async (id) => {
      const apiDelete =
        entityName === 'Asignacion' ? AsignacionesAPI.deleteAsignacion :
        entityName === 'Bloque' ? BloquesAPI.deleteBloque :
        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.deleteFeedbackSemanal :
        entityName === 'Pieza' ? PiezasAPI.deletePieza :
        entityName === 'Plan' ? PlanesAPI.deletePlan :
        entityName === 'RegistroBloque' ? RegistrosBloqueAPI.deleteRegistroBloque :
        entityName === 'RegistroSesion' ? RegistrosSesionAPI.deleteRegistroSesion :
        null;

      if (!apiDelete) {
        throw new Error(`API delete no definida para entidad ${entityName}`);
      }

      await apiDelete(id);

      if (Array.isArray(localDataRef[dataKey])) {
        localDataRef[dataKey] = localDataRef[dataKey].filter(item => item.id !== id);
      }
      return { success: true };
    },
    bulkCreate: async (items) => {
      const created = [];
      // Crear de forma secuencial para mantener la lógica simple
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const newItem = await this.create(item);
        created.push(newItem);
      }
      return created;
    },
  };
}

// API de autenticación local
export const localDataClient = {
  auth: {
    me: async () => {
      return resolveCurrentUser();
    },
    getCurrentUser: () => {
      return resolveCurrentUser();
    },
    login: async (credentials) => {
      // En modo local, simplemente establecer el usuario si existe
      const user = localDataRef.usuarios.find(u => 
        u.email === credentials?.email || 
        u.id === credentials?.userId
      );
      if (user) {
        setStoredUserId(user.id);
        return { user, success: true };
      }
      throw new Error('Usuario no encontrado');
    },
    logout: async () => {
      // Limpiar sesión local
      clearStoredUserId();
      sessionStorage.clear();
      return { success: true };
    },
    updateMe: async (data) => {
      const currentUser = resolveCurrentUser();
      const updated = { ...currentUser, ...data };
      const index = localDataRef.usuarios.findIndex(u => u.id === currentUser.id);
      if (index !== -1) {
        localDataRef.usuarios[index] = updated;
        // Persistir también en la capa de datos
        await UsuariosAPI.updateUsuario(currentUser.id, data);
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
        await UsuariosAPI.createUsuario(newUser);
        return newUser;
      },
      update: async (id, data) => {
        const index = localDataRef.usuarios.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');
        const updated = { ...localDataRef.usuarios[index], ...data };
        localDataRef.usuarios[index] = updated;
        await UsuariosAPI.updateUsuario(id, data);
        return updated;
      },
      delete: async (id) => {
        const index = localDataRef.usuarios.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');
        localDataRef.usuarios.splice(index, 1);
        await UsuariosAPI.deleteUsuario(id);
        return { success: true };
      },
    },
    Asignacion: createEntityAPI('Asignacion', 'asignaciones', () => AsignacionesAPI.getAllAsignaciones()),
    Bloque: createEntityAPI('Bloque', 'bloques', () => BloquesAPI.getAllBloques()),
    FeedbackSemanal: createEntityAPI('FeedbackSemanal', 'feedbacksSemanal', () => FeedbacksSemanalAPI.getAllFeedbacksSemanal()),
    Pieza: createEntityAPI('Pieza', 'piezas', () => PiezasAPI.getAllPiezas()),
    Plan: createEntityAPI('Plan', 'planes', () => PlanesAPI.getAllPlanes()),
    RegistroBloque: createEntityAPI('RegistroBloque', 'registrosBloque', () => RegistrosBloqueAPI.getAllRegistrosBloque()),
    RegistroSesion: createEntityAPI('RegistroSesion', 'registrosSesion', () => RegistrosSesionAPI.getAllRegistrosSesion()),
  },
};

