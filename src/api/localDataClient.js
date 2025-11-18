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
import { createRemoteDataAPI } from './remoteDataAPI';

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
  // Si hay una sesión de Supabase activa, devolver null
  // Verificar de forma síncrona si hay una sesión (Supabase guarda en localStorage)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Verificar si hay claves de Supabase en localStorage
      const hasSupabaseSession = Object.keys(window.localStorage).some(key => 
        key.startsWith('sb-') && (key.includes('auth-token') || key.includes('auth.refresh'))
      );
      
      if (hasSupabaseSession) {
        // En modo Supabase, no usar localCurrentUserId
        return null;
      }
    } catch (e) {
      // Si hay error, continuar con la lógica normal
    }
  }
  
  // Solo devolver usuario si hay un userId explícitamente almacenado en localStorage
  // En modo local puro, usar localCurrentUserId
  const storedUserId = getStoredUserId(null);
  if (!storedUserId) {
    return null;
  }
  
  // Buscar el usuario en los datos locales
  const user = localDataRef.usuarios.find(u => u.id === storedUserId);
  if (user) return user;
  
  // Si no se encuentra, devolver null
  return null;
}

export function setCurrentUser(userId) {
  setStoredUserId(userId);
}

function resolveCurrentUser() {
  return getCurrentUser();
}

// Helper para obtener la API correcta según el modo (con caché)
let cachedRemoteAPI = null;
let cachedMode = null;
function getDataAPI() {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';
  
  // Si el modo cambió, limpiar el caché
  if (cachedMode !== dataSource) {
    cachedRemoteAPI = null;
    cachedMode = dataSource;
  }
  
  if (dataSource === 'remote') {
    if (!cachedRemoteAPI) {
      cachedRemoteAPI = createRemoteDataAPI();
    }
    return cachedRemoteAPI;
  }
  
  return null; // null significa usar localDataRef directamente
}

// Mapeo de nombres de entidades a claves de API
const entityToAPIKey = {
  'Asignacion': 'asignaciones',
  'Bloque': 'bloques',
  'FeedbackSemanal': 'feedbacksSemanal',
  'Pieza': 'piezas',
  'Plan': 'planes',
  'RegistroBloque': 'registrosBloque',
  'RegistroSesion': 'registrosSesion',
};

// Helper para crear entidades con métodos CRUD apoyadas en la capa de datos
function createEntityAPI(entityName, dataKey, entityApi) {
  const apiKey = entityToAPIKey[entityName];
  
  return {
    list: async (sort = '') => {
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].list(sort);
      }
      
      // Modo local: usar código existente
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
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].get(id);
      }
      
      // Modo local: usar código existente
      const data = await entityApi();
      return data.find(item => item.id === id) || null;
    },
    filter: async (filters = {}, limit = null) => {
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].filter(filters, limit);
      }
      
      // Modo local: usar código existente
      let data = [...(await entityApi())];
      Object.keys(filters).forEach(key => {
        data = data.filter(item => item[key] === filters[key]);
      });
      if (limit) data = data.slice(0, limit);
      return data;
    },
    create: async (data) => {
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].create(data);
      }
      
      // Modo local: usar código existente
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
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].update(id, updates);
      }
      
      // Modo local: usar código existente
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
      const api = getDataAPI();
      if (api && apiKey) {
        // Modo remote: usar API remota
        return await api[apiKey].delete(id);
      }
      
      // Modo local: usar código existente
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
      const api = getDataAPI();
      if (api && apiKey && api[apiKey].bulkCreate) {
        // Modo remote: usar API remota si tiene bulkCreate
        return await api[apiKey].bulkCreate(items);
      }
      
      // Modo local o si no hay bulkCreate: crear de forma secuencial
      const created = [];
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
      list: async () => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.list();
        }
        // Modo local: usar código existente
        // Normalizar usuarios para asegurar que todos tengan nombreCompleto
        const usuarios = localDataRef.usuarios || [];
        return usuarios.map(u => {
          // Si ya tiene nombreCompleto, retornar tal cual
          if (u.nombreCompleto && u.nombreCompleto.trim()) {
            return u;
          }
          // Generar nombreCompleto desde otros campos
          let nombreCompleto = null;
          if (u.full_name && u.full_name.trim()) {
            nombreCompleto = u.full_name.trim();
          } else if (u.first_name || u.last_name) {
            nombreCompleto = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
          } else if (u.email) {
            const emailStr = String(u.email);
            if (emailStr.includes('@')) {
              const parteLocal = emailStr.split('@')[0];
              const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
              if (parteLocal && !isLikelyId) {
                nombreCompleto = parteLocal
                  .replace(/[._+-]/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase())
                  .trim() || emailStr;
              } else {
                nombreCompleto = emailStr;
              }
            } else {
              nombreCompleto = emailStr;
            }
          } else {
            nombreCompleto = `Usuario ${u.id || 'Nuevo'}`;
          }
          return {
            ...u,
            nombreCompleto: nombreCompleto,
            full_name: u.full_name || nombreCompleto,
          };
        });
      },
      get: async (id) => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.get(id);
        }
        // Modo local: usar código existente
        return localDataRef.usuarios.find(u => u.id === id);
      },
      filter: async (filters = {}) => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.filter(filters);
        }
        // Modo local: usar código existente
        let users = [...localDataRef.usuarios];
        Object.keys(filters).forEach(key => {
          users = users.filter(u => u[key] === filters[key]);
        });
        return users;
      },
      create: async (data) => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.create(data);
        }
        // Modo local: usar código existente
        // Asegurar que el usuario tenga nombreCompleto si no lo tiene
        let nombreCompleto = data.nombreCompleto;
        if (!nombreCompleto || !nombreCompleto.trim()) {
          // Intentar generar nombreCompleto desde otros campos
          if (data.full_name && data.full_name.trim()) {
            nombreCompleto = data.full_name.trim();
          } else if (data.first_name || data.last_name) {
            nombreCompleto = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
          } else if (data.email) {
            // Extraer nombre del email
            const emailStr = String(data.email);
            if (emailStr.includes('@')) {
              const parteLocal = emailStr.split('@')[0];
              // Formatear email: "nombre.apellido" o "nombre" de forma más legible
              nombreCompleto = parteLocal
                .replace(/[._+-]/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .trim() || emailStr;
            } else {
              nombreCompleto = emailStr;
            }
          } else {
            // Último recurso: generar nombre genérico
            nombreCompleto = `Usuario ${data.id || 'Nuevo'}`;
          }
        }
        
        const newUser = {
          ...data,
          id: data.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nombreCompleto: nombreCompleto,
          // Si no tiene full_name, usar nombreCompleto
          full_name: data.full_name || nombreCompleto,
        };
        localDataRef.usuarios.push(newUser);
        await UsuariosAPI.createUsuario(newUser);
        return newUser;
      },
      update: async (id, data) => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.update(id, data);
        }
        // Modo local: usar código existente
        const index = localDataRef.usuarios.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');
        const updated = { ...localDataRef.usuarios[index], ...data };
        localDataRef.usuarios[index] = updated;
        await UsuariosAPI.updateUsuario(id, data);
        return updated;
      },
      delete: async (id) => {
        const api = getDataAPI();
        if (api) {
          // Modo remote: usar API remota
          return await api.usuarios.delete(id);
        }
        // Modo local: usar código existente
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

