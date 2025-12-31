// src/api/localDataClient.ts
import { localUsers } from '../local-data/localUsers';
import { AsignacionesAPI } from '../data/asignacionesClient';
import { BloquesAPI } from '../data/bloquesClient';
import { FeedbacksSemanalAPI } from '../data/feedbacksSemanalClient';
import { PiezasAPI } from '../data/piezasClient';
import { PlanesAPI } from '../data/planesClient';
import { RegistrosBloqueAPI } from '../data/registrosBloqueClient';
import { RegistrosSesionAPI } from '../data/registrosSesionClient';
import { UsuariosAPI } from '../data/usuariosClient';
import { EventosCalendarioAPI } from '../data/eventosCalendarioClient';
import { EvaluacionesAPI } from '../data/evaluacionesClient';
import { getStoredUserId, setStoredUserId, clearStoredUserId } from '../data/authClient';
import { createRemoteDataAPI } from './remoteDataAPI';
import { supabase } from '../lib/supabaseClient';

// Types from .d.ts
export interface EntityAPI {
    list: (sort?: string, options?: any) => Promise<any[]>;
    get: (id: string) => Promise<any>;
    filter: (filters: any, limit?: number | null) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<{ success: boolean }>;
    bulkCreate?: (items: any[]) => Promise<any[]>;
}

export interface LocalDataClient {
    auth: {
        me: () => Promise<any>;
        getCurrentUser: () => any;
        login: (credentials: any) => Promise<{ user: any; success: boolean }>;
        logout: () => Promise<{ success: boolean }>;
        updateMe: (data: any, effectiveUserId?: string | null) => Promise<any>;
    };
    entities: {
        User: EntityAPI;
        Asignacion: EntityAPI;
        Bloque: EntityAPI;
        FeedbackSemanal: EntityAPI;
        Pieza: EntityAPI;
        Plan: EntityAPI;
        RegistroBloque: EntityAPI;
        RegistroSesion: EntityAPI;
        EventoCalendario: EntityAPI;
        EvaluacionTecnica: EntityAPI;
        LevelConfig: EntityAPI;
        LevelKeyCriteria: EntityAPI;
        StudentCriteriaStatus: EntityAPI;
        StudentLevelHistory: EntityAPI;
        StudentXPTotal: EntityAPI;
        StudentBackpack: EntityAPI;
        MediaAsset: EntityAPI;
        [key: string]: EntityAPI;
    };
    getCalendarSummary: (startDate: Date, endDate: Date, userId?: string) => Promise<any>;
    getProgressSummary: (studentId?: string) => Promise<any>;
    getSeedStats: () => Promise<any>;
}

// Internal data reference interface
interface LocalDataRef {
    asignaciones: any[];
    bloques: any[];
    feedbacksSemanal: any[];
    piezas: any[];
    planes: any[];
    registrosBloque: any[];
    registrosSesion: any[];
    studentBackpack: any[];
    eventosCalendario: any[];
    mediaAssets: any[];
    usuarios: any[];
    levelsConfig?: any[];
    levelKeyCriteria?: any[];
    studentCriteriaStatus?: any[];
    studentLevelHistory?: any[];
    studentXpTotal?: any[];
    _loading: boolean;
    [key: string]: any;
}

// Referencia global a los datos locales (se inyecta desde LocalDataProvider)
let localDataRef: LocalDataRef = {
    asignaciones: [],
    bloques: [],
    feedbacksSemanal: [],
    piezas: [],
    planes: [],
    registrosBloque: [],
    registrosSesion: [],
    studentBackpack: [],
    eventosCalendario: [],
    mediaAssets: [],
    usuarios: localUsers as any[],
    _loading: true,
};

// Función para inyectar datos desde LocalDataProvider
export function setLocalDataRef(data: Partial<LocalDataRef>) {
    localDataRef = { ...localDataRef, ...data, _loading: false };
}

// API legada: helpers de usuario actual usados directamente desde varias vistas
export function getCurrentUser() {
    // Si hay una sesión de Supabase activa, devolver null
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const hasSupabaseSession = Object.keys(window.localStorage).some(key =>
                key.startsWith('sb-') && (key.includes('auth-token') || key.includes('auth.refresh'))
            );

            if (hasSupabaseSession) {
                return null;
            }
        } catch (e) {
            // ignore
        }
    }

    const storedUserId = getStoredUserId(null);
    if (!storedUserId) {
        return null;
    }

    const user = localDataRef.usuarios.find(u => u.id === storedUserId);
    if (user) return user;

    return null;
}

export function setCurrentUser(userId: string) {
    setStoredUserId(userId);
}

function resolveCurrentUser() {
    return getCurrentUser();
}

// Helper para obtener la API correcta según el modo (con caché)
let cachedRemoteAPI: any = null;
let cachedMode: string | null = null;

function getDataAPI() {
    // @ts-ignore - import.meta.env
    if (import.meta.env.VITE_DISABLE_LOCAL_DATA === 'true') {
        if (!cachedRemoteAPI) {
            cachedRemoteAPI = createRemoteDataAPI();
        }
        return cachedRemoteAPI;
    }

    // @ts-ignore
    let dataSource = import.meta.env.VITE_DATA_SOURCE;

    if (!dataSource) {
        if (typeof window !== 'undefined' && window.localStorage) {
            const hasSupabaseSession = Object.keys(window.localStorage).some(key =>
                key.startsWith('sb-') && key.includes('auth-token')
            );

            if (hasSupabaseSession) {
                dataSource = 'remote';
            } else {
                dataSource = 'local';
            }
        } else {
            dataSource = 'local';
        }
    }

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

    return null;
}

// Mapeo de nombres de entidades a claves de API
const entityToAPIKey: Record<string, string> = {
    'Asignacion': 'asignaciones',
    'Bloque': 'bloques',
    'FeedbackSemanal': 'feedbacksSemanal',
    'Pieza': 'piezas',
    'Plan': 'planes',
    'RegistroBloque': 'registrosBloque',
    'RegistroSesion': 'registrosSesion',
    'EventoCalendario': 'eventosCalendario',
    'EvaluacionTecnica': 'evaluaciones',
    'LevelConfig': 'levelsConfig',
    'LevelKeyCriteria': 'levelKeyCriteria',
    'StudentCriteriaStatus': 'studentCriteriaStatus',
    'StudentLevelHistory': 'studentLevelHistory',
    'StudentXPTotal': 'studentXpTotal',
    'StudentBackpack': 'studentBackpack',
    'MediaAsset': 'mediaAssets',
};

// Helper para crear entidades con métodos CRUD apoyadas en la capa de datos
function createEntityAPI(entityName: string, dataKey: string, entityApi: () => Promise<any[]>): EntityAPI {
    const apiKey = entityToAPIKey[entityName];

    return {
        list: async (sort = '', options = {}) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].list(sort, options);
            }

            let attempts = 0;
            const maxAttempts = 40;
            while (localDataRef._loading && attempts < maxAttempts) {
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
                return await api[apiKey].get(id);
            }

            const data = await entityApi();
            return data.find(item => item.id === id) || null;
        },
        filter: async (filters = {}, limit = null) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].filter(filters, limit);
            }

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
                return await api[apiKey].create(data);
            }

            const apiCreate =
                entityName === 'Asignacion' ? AsignacionesAPI.createAsignacion :
                    entityName === 'Bloque' ? BloquesAPI.createBloque :
                        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.createFeedbackSemanal :
                            entityName === 'Pieza' ? PiezasAPI.createPieza :
                                entityName === 'Plan' ? PlanesAPI.createPlan :
                                    entityName === 'RegistroBloque' ? RegistrosBloqueAPI.createRegistroBloque :
                                        entityName === 'RegistroSesion' ? RegistrosSesionAPI.createRegistroSesion :
                                            entityName === 'EventoCalendario' ? EventosCalendarioAPI.createEventoCalendario :
                                                entityName === 'EvaluacionTecnica' ? EvaluacionesAPI.createEvaluacionTecnica :
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
                return await api[apiKey].update(id, updates);
            }

            const apiUpdate =
                entityName === 'Asignacion' ? AsignacionesAPI.updateAsignacion :
                    entityName === 'Bloque' ? BloquesAPI.updateBloque :
                        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.updateFeedbackSemanal :
                            entityName === 'Pieza' ? PiezasAPI.updatePieza :
                                entityName === 'Plan' ? PlanesAPI.updatePlan :
                                    entityName === 'RegistroBloque' ? RegistrosBloqueAPI.updateRegistroBloque :
                                        entityName === 'RegistroSesion' ? RegistrosSesionAPI.updateRegistroSesion :
                                            entityName === 'EventoCalendario' ? EventosCalendarioAPI.updateEventoCalendario :
                                                entityName === 'EvaluacionTecnica' ? EvaluacionesAPI.updateEvaluacionTecnica :
                                                    null;

            if (!apiUpdate) {
                throw new Error(`API update no definida para entidad ${entityName}`);
            }

            const updated = await apiUpdate(id, updates);
            const index = Array.isArray(localDataRef[dataKey])
                ? localDataRef[dataKey].findIndex((item: any) => item.id === id)
                : -1;
            if (index !== -1) {
                localDataRef[dataKey][index] = updated;
            }
            return updated;
        },
        delete: async (id) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].delete(id);
            }

            const apiDelete =
                entityName === 'Asignacion' ? AsignacionesAPI.deleteAsignacion :
                    entityName === 'Bloque' ? BloquesAPI.deleteBloque :
                        entityName === 'FeedbackSemanal' ? FeedbacksSemanalAPI.deleteFeedbackSemanal :
                            entityName === 'Pieza' ? PiezasAPI.deletePieza :
                                entityName === 'Plan' ? PlanesAPI.deletePlan :
                                    entityName === 'RegistroBloque' ? RegistrosBloqueAPI.deleteRegistroBloque :
                                        entityName === 'RegistroSesion' ? RegistrosSesionAPI.deleteRegistroSesion :
                                            entityName === 'EventoCalendario' ? EventosCalendarioAPI.deleteEventoCalendario :
                                                entityName === 'EvaluacionTecnica' ? EvaluacionesAPI.createEvaluacionTecnica : // Wait, wait... delete? Check!
                                                    null;

            // Let's re-verify the delete function mapping from original JS.
            // JS Line 293: entityName === 'EvaluacionTecnica' ? EvaluacionesAPI.deleteEvaluacionTecnica : null;
            // Wait, I messed up in my mental draft.

            if (!apiDelete && entityName !== 'EvaluacionTecnica') {
                throw new Error(`API delete no definida para entidad ${entityName}`);
            }

            const finalDelete = entityName === 'EvaluacionTecnica' ? (EvaluacionesAPI as any).deleteEvaluacionTecnica : apiDelete;

            if (!finalDelete) {
                throw new Error(`API delete no definida para entidad ${entityName}`);
            }

            await finalDelete(id);

            if (Array.isArray(localDataRef[dataKey])) {
                localDataRef[dataKey] = localDataRef[dataKey].filter((item: any) => item.id !== id);
            }
            return { success: true };
        },
        bulkCreate: async (items) => {
            const api = getDataAPI();
            if (api && apiKey && api[apiKey].bulkCreate) {
                return await api[apiKey].bulkCreate(items);
            }

            const apiBulkCreate =
                entityName === 'RegistroBloque' ? (RegistrosBloqueAPI as any).bulkCreateRegistrosBloque :
                    null;

            if (apiBulkCreate) {
                const newItems = await apiBulkCreate(items);
                if (!Array.isArray(localDataRef[dataKey])) {
                    localDataRef[dataKey] = [];
                }
                localDataRef[dataKey].push(...newItems);
                return newItems;
            }

            const created = [];
            const currentAPI = createEntityAPI(entityName, dataKey, entityApi);
            for (const item of items) {
                const newItem = await currentAPI.create(item);
                created.push(newItem);
            }
            return created;
        },
    };
}

// API de autenticación local
export const localDataClient: LocalDataClient = {
    auth: {
        me: async () => {
            return resolveCurrentUser();
        },
        getCurrentUser: () => {
            return resolveCurrentUser();
        },
        login: async (credentials) => {
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
            clearStoredUserId();
            sessionStorage.clear();
            return { success: true };
        },
        updateMe: async (data, effectiveUserId = null) => {
            let currentUser = resolveCurrentUser();
            let userIdToUse = currentUser?.id;

            if (effectiveUserId && !userIdToUse) {
                userIdToUse = effectiveUserId;
                if (!localDataRef._loading) {
                    const foundUser = localDataRef.usuarios.find(u => u.id === effectiveUserId);
                    if (foundUser) {
                        currentUser = foundUser;
                    }
                }
            }

            if (!currentUser || !userIdToUse) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        const normalizedEmail = session.user.email?.toLowerCase().trim();
                        if (normalizedEmail && !localDataRef._loading) {
                            const foundUser = localDataRef.usuarios.find(u => {
                                if (!u.email) return false;
                                return u.email.toLowerCase().trim() === normalizedEmail;
                            });
                            if (foundUser) {
                                currentUser = foundUser;
                                userIdToUse = foundUser.id;
                            } else {
                                userIdToUse = session.user.id;
                            }
                        } else if (session.user.id) {
                            userIdToUse = session.user.id;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            if (!userIdToUse) {
                throw new Error('No hay usuario autenticado');
            }

            const api = getDataAPI();
            if (api && api.usuarios) {
                return await api.usuarios.update(userIdToUse, data);
            }

            if (currentUser) {
                const updated = { ...currentUser, ...data };
                const index = localDataRef.usuarios.findIndex(u => u.id === userIdToUse);
                if (index !== -1) {
                    localDataRef.usuarios[index] = updated;
                    await UsuariosAPI.updateUsuario(userIdToUse!, data);
                }
                return updated;
            } else {
                const index = localDataRef.usuarios.findIndex(u => u.id === userIdToUse);
                if (index !== -1) {
                    const existingUser = localDataRef.usuarios[index];
                    const updated = { ...existingUser, ...data };
                    localDataRef.usuarios[index] = updated;
                    await UsuariosAPI.updateUsuario(userIdToUse!, data);
                    return updated;
                }
                throw new Error('No hay usuario autenticado');
            }
        },
    },
    entities: {
        User: {
            list: async () => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.list();
                }
                const usuarios = localDataRef.usuarios || [];
                return usuarios.map(u => {
                    if (u.nombreCompleto && u.nombreCompleto.trim()) {
                        return u;
                    }
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
                    const finalFullName = (u.full_name && u.full_name.trim()) || (nombreCompleto && nombreCompleto.trim()) || '';
                    return {
                        ...u,
                        nombreCompleto: nombreCompleto,
                        full_name: finalFullName,
                    };
                });
            },
            get: async (id) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.get(id);
                }
                return localDataRef.usuarios.find(u => u.id === id);
            },
            filter: async (filters = {}) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.filter(filters);
                }
                let users = [...localDataRef.usuarios];
                Object.keys(filters).forEach(key => {
                    users = users.filter(u => u[key] === filters[key]);
                });
                return users;
            },
            create: async (data) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.create(data);
                }
                let nombreCompleto = data.nombreCompleto;
                if (!nombreCompleto || !nombreCompleto.trim()) {
                    if (data.full_name && data.full_name.trim()) {
                        nombreCompleto = data.full_name.trim();
                    } else if (data.first_name || data.last_name) {
                        nombreCompleto = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
                    } else if (data.email) {
                        const emailStr = String(data.email);
                        if (emailStr.includes('@')) {
                            const parteLocal = emailStr.split('@')[0];
                            nombreCompleto = parteLocal
                                .replace(/[._+-]/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase())
                                .trim() || emailStr;
                        } else {
                            nombreCompleto = emailStr;
                        }
                    } else {
                        nombreCompleto = `Usuario ${data.id || 'Nuevo'}`;
                    }
                }

                const newUser = {
                    ...data,
                    id: data.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    nombreCompleto: nombreCompleto,
                    full_name: data.full_name || nombreCompleto,
                };
                localDataRef.usuarios.push(newUser);
                await UsuariosAPI.createUsuario(newUser);
                return newUser;
            },
            update: async (id, data) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.update(id, data);
                }
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
                    return await api.usuarios.delete(id);
                }
                const index = localDataRef.usuarios.findIndex(u => u.id === id);
                if (index === -1) throw new Error('Usuario no encontrado');
                localDataRef.usuarios.splice(index, 1);
                await UsuariosAPI.deleteUsuario(id);
                return { success: true };
            },
        },
        Asignacion: createEntityAPI('Asignacion', 'asignaciones', async () => AsignacionesAPI.getAllAsignaciones()),
        Bloque: createEntityAPI('Bloque', 'bloques', async () => BloquesAPI.getAllBloques()),
        FeedbackSemanal: createEntityAPI('FeedbackSemanal', 'feedbacksSemanal', async () => FeedbacksSemanalAPI.getAllFeedbacksSemanal()),
        Pieza: createEntityAPI('Pieza', 'piezas', async () => PiezasAPI.getAllPiezas()),
        Plan: createEntityAPI('Plan', 'planes', async () => PlanesAPI.getAllPlanes()),
        RegistroBloque: createEntityAPI('RegistroBloque', 'registrosBloque', async () => RegistrosBloqueAPI.getAllRegistrosBloque()),
        RegistroSesion: {
            ...createEntityAPI('RegistroSesion', 'registrosSesion', async () => RegistrosSesionAPI.getAllRegistrosSesion()),
            list: async (sort = '') => {
                const api = getDataAPI();
                if (api) {
                    return await api.registrosSesion.list(sort);
                }

                let attempts = 0;
                while (localDataRef._loading && attempts < 40) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    attempts++;
                }

                let sesiones = [...(await RegistrosSesionAPI.getAllRegistrosSesion())];
                const bloques = localDataRef.registrosBloque || [];

                sesiones = sesiones.map((s: any) => ({
                    ...s,
                    registrosBloque: bloques.filter((b: any) => b.registroSesionId === s.id)
                }));

                if (sort.startsWith('-')) {
                    const field = sort.slice(1);
                    sesiones.sort((a: any, b: any) => {
                        if (a[field] < b[field]) return 1;
                        if (a[field] > b[field]) return -1;
                        return 0;
                    });
                }
                return sesiones;
            },
            get: async (id) => {
                const api = getDataAPI();
                if (api) {
                    return await api.registrosSesion.get(id);
                }

                const sesiones = await RegistrosSesionAPI.getAllRegistrosSesion();
                const sesion = sesiones.find((s: any) => s.id === id);
                if (!sesion) return null;

                const bloques = localDataRef.registrosBloque || [];
                const sesionWithId = sesion as any;
                return {
                    ...sesionWithId,
                    registrosBloque: bloques.filter((b: any) => b.registroSesionId === sesionWithId.id)
                };
            },
            filter: async (filters = {}, limit = null) => {
                const api = getDataAPI();
                if (api) {
                    return await api.registrosSesion.filter(filters, limit);
                }

                let sesiones = [...(await RegistrosSesionAPI.getAllRegistrosSesion())];
                Object.keys(filters).forEach(key => {
                    sesiones = sesiones.filter((s: any) => s[key] === (filters as Record<string, unknown>)[key]);
                });

                const bloques = localDataRef.registrosBloque || [];
                sesiones = sesiones.map((s: any) => ({
                    ...s,
                    registrosBloque: bloques.filter((b: any) => b.registroSesionId === s.id)
                }));

                if (limit) sesiones = sesiones.slice(0, limit);
                return sesiones;
            }
        },
        EventoCalendario: createEntityAPI('EventoCalendario', 'eventosCalendario', async () => EventosCalendarioAPI.getAllEventosCalendario()),
        EvaluacionTecnica: createEntityAPI('EvaluacionTecnica', 'evaluaciones', async () => EvaluacionesAPI.getEvaluacionesTecnicas()),
        LevelConfig: createEntityAPI('LevelConfig', 'levelsConfig', async () => localDataRef.levelsConfig || []),
        LevelKeyCriteria: createEntityAPI('LevelKeyCriteria', 'levelKeyCriteria', async () => localDataRef.levelKeyCriteria || []),
        StudentCriteriaStatus: createEntityAPI('StudentCriteriaStatus', 'studentCriteriaStatus', async () => localDataRef.studentCriteriaStatus || []),
        StudentLevelHistory: createEntityAPI('StudentLevelHistory', 'studentLevelHistory', async () => localDataRef.studentLevelHistory || []),
        StudentXPTotal: createEntityAPI('StudentXPTotal', 'studentXpTotal', async () => localDataRef.studentXpTotal || []),
        StudentBackpack: createEntityAPI('StudentBackpack', 'studentBackpack', async () => localDataRef.studentBackpack || []),
        MediaAsset: createEntityAPI('MediaAsset', 'mediaAssets', async () => localDataRef.mediaAssets || []),
    },

    getCalendarSummary: async (startDate, endDate, userId) => {
        const api = getDataAPI();
        if (api && api.getCalendarSummary) {
            return await api.getCalendarSummary(startDate, endDate, userId);
        }

        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        const sesiones = await localDataClient.entities.RegistroSesion.list();
        const sesionesFiltradas = sesiones.filter(s => {
            return s.inicioISO >= startISO && s.inicioISO <= endISO &&
                (!userId || s.alumnoId === userId);
        });

        const feedbacks = await localDataClient.entities.FeedbackSemanal.list();
        const feedbacksFiltrados = feedbacks.filter(f => {
            const date = f.created_at || f.createdAt;
            return date >= startISO && date <= endISO &&
                (!userId || f.alumnoId === userId);
        });

        const asignaciones = await localDataClient.entities.Asignacion.list();
        const asignacionesFiltradas = asignaciones.filter(a => {
            return a.fechaAsignacion >= startISO && a.fechaAsignacion <= endISO &&
                (!userId || a.alumnoId === userId);
        });

        const eventos = await localDataClient.entities.EventoCalendario.list();
        const eventosFiltrados = eventos.filter(e => {
            return e.fechaInicio >= startISO && e.fechaInicio <= endISO;
        });

        return {
            registrosSesion: sesionesFiltradas,
            feedbacksSemanal: feedbacksFiltrados,
            asignaciones: asignacionesFiltradas,
            eventosCalendario: eventosFiltrados
        };
    },

    getProgressSummary: async (studentId) => {
        const api = getDataAPI();
        if (api && api.getProgressSummary) {
            return await api.getProgressSummary(studentId);
        }

        const xpTotals = await localDataClient.entities.StudentXPTotal.list();
        const xpFiltrados = studentId
            ? xpTotals.filter(x => x.studentId === studentId || x.student_id === studentId)
            : xpTotals;

        const evaluaciones = await localDataClient.entities.EvaluacionTecnica.list();
        const evalFiltradas = studentId
            ? evaluaciones.filter(e => e.alumnoId === studentId)
            : evaluaciones;

        const feedbacks = await localDataClient.entities.FeedbackSemanal.list();
        const feedbacksFiltrados = studentId
            ? feedbacks.filter(f => f.alumnoId === studentId)
            : feedbacks;

        const sesiones = await localDataClient.entities.RegistroSesion.list();
        const sesionesFiltrados = studentId
            ? sesiones.filter(s => s.alumnoId === studentId)
            : sesiones;

        return {
            xpTotals: xpFiltrados,
            evaluacionesTecnicas: evalFiltradas,
            feedbacksSemanal: feedbacksFiltrados,
            registrosSesion: sesionesFiltrados
        };
    },

    getSeedStats: async () => {
        const api = getDataAPI();
        if (api && api.getSeedStats) {
            return await api.getSeedStats();
        }

        const usuarios = localDataRef.usuarios || [];
        return {
            usersCount: usuarios.length,
            usersAdmin: usuarios.filter(u => u.rolPersonalizado === 'ADMIN').length,
            usersProf: usuarios.filter(u => u.rolPersonalizado === 'PROF').length,
            usersEstu: usuarios.filter(u => u.rolPersonalizado === 'ESTU').length,
            piezas: (localDataRef.piezas || []).length,
            planes: (localDataRef.planes || []).length,
            bloques: (localDataRef.bloques || []).length,
            asignaciones: (localDataRef.asignaciones || []).length,
            registrosSesion: (localDataRef.registrosSesion || []).length,
            registrosBloques: (localDataRef.registrosBloque || []).length,
            feedbacks: (localDataRef.feedbacksSemanal || []).length,
        };
    }
};
