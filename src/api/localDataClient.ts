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
import {
    Asignacion,
    Bloque,
    FeedbackSemanal,
    Pieza,
    Plan,
    RegistroBloque,
    RegistroSesion,
    StudiaUser,
    EventoCalendario,
    EvaluacionTecnica,
    LevelConfig,
    LevelKeyCriteria,
    StudentCriteriaStatus,
    StudentLevelHistory,
    StudentXPTotal,
    MediaAsset,
    StudentBackpackItem
} from '../features/shared/types/domain';

// Types from .d.ts
// Types from .d.ts
export interface EntityAPI<T = any> {
    list: (sort?: string, options?: Record<string, unknown>) => Promise<T[]>;
    get: (id: string) => Promise<T | null>;
    filter: (filters: Record<string, unknown>, limit?: number | null) => Promise<T[]>;
    create: (data: Partial<T>) => Promise<T>;
    update: (id: string, updates: Partial<T>) => Promise<T>;
    delete: (id: string) => Promise<{ success: boolean }>;
    bulkCreate?: (items: Partial<T>[]) => Promise<T[]>;
}

export interface LocalDataClient {
    auth: {
        me: () => Promise<StudiaUser | null>;
        getCurrentUser: () => StudiaUser | null;
        login: (credentials: { email?: string; userId?: string; password?: string }) => Promise<{ user: StudiaUser; success: boolean }>;
        logout: () => Promise<{ success: boolean }>;
        updateMe: (data: Partial<StudiaUser>, effectiveUserId?: string | null) => Promise<StudiaUser>;
    };
    entities: {
        User: EntityAPI<StudiaUser>;
        Asignacion: EntityAPI<Asignacion>;
        Bloque: EntityAPI<Bloque>;
        FeedbackSemanal: EntityAPI<FeedbackSemanal>;
        Pieza: EntityAPI<Pieza>;
        Plan: EntityAPI<Plan>;
        RegistroBloque: EntityAPI<RegistroBloque>;
        RegistroSesion: EntityAPI<RegistroSesion>;
        EventoCalendario: EntityAPI<EventoCalendario>;
        EvaluacionTecnica: EntityAPI<EvaluacionTecnica>;
        LevelConfig: EntityAPI<LevelConfig>;
        LevelKeyCriteria: EntityAPI<LevelKeyCriteria>;
        StudentCriteriaStatus: EntityAPI<StudentCriteriaStatus>;
        StudentLevelHistory: EntityAPI<StudentLevelHistory>;
        StudentXPTotal: EntityAPI<StudentXPTotal>;
        StudentBackpack: EntityAPI<StudentBackpackItem>;
        MediaAsset: EntityAPI<MediaAsset>;
        [key: string]: EntityAPI<any>;
    };
    getCalendarSummary: (startDate: Date, endDate: Date, userId?: string) => Promise<{
        registrosSesion: RegistroSesion[];
        feedbacksSemanal: FeedbackSemanal[];
        asignaciones: Asignacion[];
        eventosCalendario: EventoCalendario[];
    }>;
    getProgressSummary: (studentId?: string) => Promise<{
        xpTotals: StudentXPTotal[];
        evaluacionesTecnicas: EvaluacionTecnica[];
        feedbacksSemanal: FeedbackSemanal[];
        registrosSesion: RegistroSesion[];
    }>;
    getSeedStats: () => Promise<{
        usersCount: number;
        usersAdmin: number;
        usersProf: number;
        usersEstu: number;
        piezas: number;
        planes: number;
        bloques: number;
        asignaciones: number;
        registrosSesion: number;
        registrosBloques: number;
        feedbacks: number;
    }>;
}

// Internal data reference interface
interface LocalDataRef {
    asignaciones: Asignacion[];
    bloques: Bloque[];
    feedbacksSemanal: FeedbackSemanal[];
    piezas: Pieza[];
    planes: Plan[];
    registrosBloque: RegistroBloque[];
    registrosSesion: RegistroSesion[];
    studentBackpack: StudentBackpackItem[];
    eventosCalendario: EventoCalendario[];
    mediaAssets: MediaAsset[];
    usuarios: (StudiaUser & {
        nombreCompleto?: string;
        first_name?: string;
        last_name?: string;
        rolPersonalizado?: string;
        estado?: string;
        fechaRegistro?: string;
    })[];
    levelsConfig?: LevelConfig[];
    levelKeyCriteria?: LevelKeyCriteria[];
    studentCriteriaStatus?: StudentCriteriaStatus[];
    studentLevelHistory?: StudentLevelHistory[];
    studentXpTotal?: StudentXPTotal[];
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
export function getCurrentUser(): (StudiaUser & { nombreCompleto?: string }) | null {
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
    if (user) return user as (StudiaUser & { nombreCompleto?: string });

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
function createEntityAPI<T>(
    entityName: string,
    dataKey: string,
    entityApi: () => Promise<T[]>
): EntityAPI<T> {
    const apiKey = entityToAPIKey[entityName];

    const apiMap: Record<string, {
        create?: (...args: any[]) => any;
        update?: (...args: any[]) => any;
        delete?: (...args: any[]) => any;
        bulkCreate?: (...args: any[]) => any;
    }> = {
        'Asignacion': {
            create: AsignacionesAPI.createAsignacion,
            update: AsignacionesAPI.updateAsignacion,
            delete: AsignacionesAPI.deleteAsignacion
        },
        'Bloque': {
            create: BloquesAPI.createBloque,
            update: BloquesAPI.updateBloque,
            delete: BloquesAPI.deleteBloque
        },
        'FeedbackSemanal': {
            create: FeedbacksSemanalAPI.createFeedbackSemanal,
            update: FeedbacksSemanalAPI.updateFeedbackSemanal,
            delete: FeedbacksSemanalAPI.deleteFeedbackSemanal
        },
        'Pieza': {
            create: PiezasAPI.createPieza,
            update: PiezasAPI.updatePieza,
            delete: PiezasAPI.deletePieza
        },
        'Plan': {
            create: PlanesAPI.createPlan,
            update: PlanesAPI.updatePlan,
            delete: PlanesAPI.deletePlan
        },
        'RegistroBloque': {
            create: RegistrosBloqueAPI.createRegistroBloque,
            update: RegistrosBloqueAPI.updateRegistroBloque,
            delete: RegistrosBloqueAPI.deleteRegistroBloque,
            bulkCreate: (RegistrosBloqueAPI as any).bulkCreateRegistrosBloque
        },
        'RegistroSesion': {
            create: RegistrosSesionAPI.createRegistroSesion,
            update: RegistrosSesionAPI.updateRegistroSesion,
            delete: RegistrosSesionAPI.deleteRegistroSesion
        },
        'EventoCalendario': {
            create: EventosCalendarioAPI.createEventoCalendario,
            update: EventosCalendarioAPI.updateEventoCalendario,
            delete: EventosCalendarioAPI.deleteEventoCalendario
        },
        'EvaluacionTecnica': {
            create: EvaluacionesAPI.createEvaluacionTecnica,
            update: EvaluacionesAPI.updateEvaluacionTecnica,
            delete: EvaluacionesAPI.deleteEvaluacionTecnica
        },
    };

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

            const rawData = await entityApi();
            const data = [...rawData];

            if (sort.startsWith('-')) {
                const field = sort.slice(1);
                data.sort((a, b) => {
                    const valA = (a as any)[field];
                    const valB = (b as any)[field];
                    if (valA < valB) return 1;
                    if (valA > valB) return -1;
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
            return data.find(item => {
                const typedItem = item as any;
                return (typedItem.id !== undefined ? typedItem.id === id : typedItem.level === id);
            }) || null;
        },
        filter: async (filters = {}, limit = null) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].filter(filters, limit);
            }

            const rawData = await entityApi();
            let data = [...rawData];
            Object.keys(filters).forEach(key => {
                data = data.filter(item => (item as any)[key] === (filters as any)[key]);
            });
            if (limit) data = data.slice(0, limit);
            return data;
        },
        create: async (data) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].create(data);
            }

            const apiCreate = apiMap[entityName]?.create;
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

            const apiUpdate = apiMap[entityName]?.update;
            if (!apiUpdate) {
                throw new Error(`API update no definida para entidad ${entityName}`);
            }

            const updated = await apiUpdate(id, updates);
            const list = localDataRef[dataKey];
            if (Array.isArray(list)) {
                const index = list.findIndex((item: any) => {
                    return (item.id !== undefined ? item.id === id : item.level === id);
                });
                if (index !== -1) {
                    list[index] = updated;
                }
            }
            return updated;
        },
        delete: async (id) => {
            const api = getDataAPI();
            if (api && apiKey) {
                return await api[apiKey].delete(id);
            }

            const apiDelete = apiMap[entityName]?.delete;
            if (!apiDelete) {
                throw new Error(`API delete no definida para entidad ${entityName}`);
            }

            await apiDelete(id);

            const list = localDataRef[dataKey];
            if (Array.isArray(list)) {
                localDataRef[dataKey] = list.filter((item: any) => {
                    return (item.id !== undefined ? item.id !== id : item.level !== id);
                });
            }
            return { success: true };
        },
        bulkCreate: async (items) => {
            const api = getDataAPI();
            if (api && apiKey && api[apiKey].bulkCreate) {
                return await api[apiKey].bulkCreate(items);
            }

            const apiBulkCreate = apiMap[entityName]?.bulkCreate;
            if (apiBulkCreate) {
                const newItems = await apiBulkCreate(items);
                if (!Array.isArray(localDataRef[dataKey])) {
                    localDataRef[dataKey] = [];
                }
                localDataRef[dataKey].push(...newItems);
                return newItems;
            }

            const created: T[] = [];
            // Re-using the internal create logic is better but we need to avoid recursion or ensure it's shallow.
            // For bulk, let's just use the apiCreate which we already found.
            const apiCreate = apiMap[entityName]?.create;
            if (!apiCreate) {
                throw new Error(`API create (for bulk) no definida para entidad ${entityName}`);
            }

            for (const item of items) {
                const newItem = await apiCreate(item);
                if (!Array.isArray(localDataRef[dataKey])) {
                    localDataRef[dataKey] = [];
                }
                localDataRef[dataKey].push(newItem);
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
                    await UsuariosAPI.updateUsuario(userIdToUse!, data as any);
                }
                return updated;
            } else {
                const index = localDataRef.usuarios.findIndex(u => u.id === userIdToUse);
                if (index !== -1) {
                    const existingUser = localDataRef.usuarios[index];
                    const updated = { ...existingUser, ...data };
                    localDataRef.usuarios[index] = updated;
                    await UsuariosAPI.updateUsuario(userIdToUse!, data as any);
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
                    const typedU = u as any;
                    if (typedU.nombreCompleto && typedU.nombreCompleto.trim()) {
                        return u as StudiaUser;
                    }
                    let nombreCompleto = null;
                    if (typedU.full_name && typedU.full_name.trim()) {
                        nombreCompleto = typedU.full_name.trim();
                    } else if (typedU.first_name || typedU.last_name) {
                        nombreCompleto = [typedU.first_name, typedU.last_name].filter(Boolean).join(' ').trim();
                    } else if (typedU.email) {
                        const emailStr = String(typedU.email);
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
                        nombreCompleto = `Usuario ${typedU.id || 'Nuevo'}`;
                    }
                    const finalFullName = (typedU.full_name && typedU.full_name.trim()) || (nombreCompleto && nombreCompleto.trim()) || '';
                    return {
                        ...u,
                        nombreCompleto: nombreCompleto,
                        full_name: finalFullName,
                    } as unknown as StudiaUser;
                });
            },
            get: async (id) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.get(id);
                }
                return localDataRef.usuarios.find(u => u.id === id) as StudiaUser || null;
            },
            filter: async (filters = {}) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.filter(filters);
                }
                let users = [...localDataRef.usuarios];
                Object.keys(filters).forEach(key => {
                    users = users.filter(u => (u as any)[key] === filters[key]);
                });
                return users as unknown as StudiaUser[];
            },
            create: async (data) => {
                const api = getDataAPI();
                if (api) {
                    return await api.usuarios.create(data);
                }
                const typedData = data as any;
                let nombreCompleto = typedData.nombreCompleto;
                if (!nombreCompleto || !nombreCompleto.trim()) {
                    if (typedData.full_name && typedData.full_name.trim()) {
                        nombreCompleto = typedData.full_name.trim();
                    } else if (typedData.first_name || typedData.last_name) {
                        nombreCompleto = [typedData.first_name, typedData.last_name].filter(Boolean).join(' ').trim();
                    } else if (typedData.email) {
                        const emailStr = String(typedData.email);
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
                        nombreCompleto = `Usuario ${typedData.id || 'Nuevo'}`;
                    }
                }

                const newUser = {
                    ...data,
                    id: typedData.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    nombreCompleto: nombreCompleto,
                    full_name: typedData.full_name || nombreCompleto,
                    email: typedData.email || '',
                    role: typedData.role || 'ESTU',
                    is_active: typedData.is_active !== undefined ? typedData.is_active : true,
                    created_at: typedData.created_at || new Date().toISOString(),
                    updated_at: typedData.updated_at || new Date().toISOString(),
                } as any;
                localDataRef.usuarios.push(newUser);
                await UsuariosAPI.createUsuario(newUser);
                return newUser as StudiaUser;
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
                await UsuariosAPI.updateUsuario(id, data as any);
                return updated as unknown as StudiaUser;
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
        Asignacion: createEntityAPI<Asignacion>('Asignacion', 'asignaciones', async () => AsignacionesAPI.getAllAsignaciones() as any),
        Bloque: createEntityAPI<Bloque>('Bloque', 'bloques', async () => BloquesAPI.getAllBloques() as any),
        FeedbackSemanal: createEntityAPI<FeedbackSemanal>('FeedbackSemanal', 'feedbacksSemanal', async () => FeedbacksSemanalAPI.getAllFeedbacksSemanal() as any),
        Pieza: createEntityAPI<Pieza>('Pieza', 'piezas', async () => PiezasAPI.getAllPiezas() as any),
        Plan: createEntityAPI<Plan>('Plan', 'planes', async () => PlanesAPI.getAllPlanes() as any),
        RegistroBloque: createEntityAPI<RegistroBloque>('RegistroBloque', 'registrosBloque', async () => RegistrosBloqueAPI.getAllRegistrosBloque() as any),
        RegistroSesion: {
            ...createEntityAPI<RegistroSesion>('RegistroSesion', 'registrosSesion', async () => RegistrosSesionAPI.getAllRegistrosSesion() as any),
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

                let sesiones = [...(await RegistrosSesionAPI.getAllRegistrosSesion())] as any[];
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
                return sesiones as RegistroSesion[];
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
                } as RegistroSesion;
            },
            filter: async (filters = {}, limit = null) => {
                const api = getDataAPI();
                if (api) {
                    return await api.registrosSesion.filter(filters, limit);
                }

                let sesiones = [...(await RegistrosSesionAPI.getAllRegistrosSesion())] as any[];
                Object.keys(filters).forEach(key => {
                    sesiones = sesiones.filter((s: any) => s[key] === (filters as Record<string, unknown>)[key]);
                });

                const bloques = localDataRef.registrosBloque || [];
                sesiones = sesiones.map((s: any) => ({
                    ...s,
                    registrosBloque: bloques.filter((b: any) => b.registroSesionId === s.id)
                }));

                if (limit) sesiones = sesiones.slice(0, limit);
                return sesiones as RegistroSesion[];
            }
        },
        EventoCalendario: createEntityAPI<EventoCalendario>('EventoCalendario', 'eventosCalendario', async () => EventosCalendarioAPI.getAllEventosCalendario() as any),
        EvaluacionTecnica: createEntityAPI<EvaluacionTecnica>('EvaluacionTecnica', 'evaluaciones', async () => EvaluacionesAPI.getEvaluacionesTecnicas() as any),
        LevelConfig: createEntityAPI<LevelConfig>('LevelConfig', 'levelsConfig', async () => (localDataRef.levelsConfig as any) || []),
        LevelKeyCriteria: createEntityAPI<LevelKeyCriteria>('LevelKeyCriteria', 'levelKeyCriteria', async () => (localDataRef.levelKeyCriteria as any) || []),
        StudentCriteriaStatus: createEntityAPI<StudentCriteriaStatus>('StudentCriteriaStatus', 'studentCriteriaStatus', async () => (localDataRef.studentCriteriaStatus as any) || []),
        StudentLevelHistory: createEntityAPI<StudentLevelHistory>('StudentLevelHistory', 'studentLevelHistory', async () => (localDataRef.studentLevelHistory as any) || []),
        StudentXPTotal: createEntityAPI<StudentXPTotal>('StudentXPTotal', 'studentXpTotal', async () => (localDataRef.studentXpTotal as any) || []),
        StudentBackpack: createEntityAPI<StudentBackpackItem>('StudentBackpack', 'studentBackpack', async () => (localDataRef.studentBackpack as any) || []),
        MediaAsset: createEntityAPI<MediaAsset>('MediaAsset', 'mediaAssets', async () => (localDataRef.mediaAssets as any) || []),
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
            const date = f.created_at;
            return date >= startISO && date <= endISO &&
                (!userId || f.alumnoId === userId);
        });

        const asignaciones = await localDataClient.entities.Asignacion.list();
        const asignacionesFiltradas = asignaciones.filter(a => {
            const date = a.semanaInicioISO || (a as any).fechaAsignacion;
            return date >= startISO && date <= endISO &&
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
            ? xpTotals.filter(x => x.studentId === studentId)
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
