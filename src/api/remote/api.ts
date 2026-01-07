/// <reference types="../../vite-env" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AppDataAPI } from '../appDataAPI';

import { supabase, withAuthErrorHandling, wrapSupabaseCall } from './client';
import {
  toSnakeCase,
  normalizeISOFields,
  normalizeAsignacionISO,
  snakeToCamel,
  camelToSnake,

  normalizeSupabaseUser
} from './utils';
import { generateId } from './id';

/**
 * Helper seguro para preservar propiedades críticas (como 'role')
 * que podrían perderse en la conversión snakeToCamel si no están
 * explícitamente manejadas o si hay conflictos.
 */
interface DbProfile {
  id: string;
  full_name?: string | null;
  role?: string | null;
  profesor_asignado_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  nivel?: string | null;
  nivel_tecnico?: number | null;
  telefono?: string | null;
  [key: string]: unknown;
}

interface DbBloque {
  id: string;
  nombre: string;
  code: string;
  tipo: string;
  duracion_seg: number;
  instrucciones?: string;
  indicador_logro?: string;
  materiales_requeridos?: string[];
  media_links?: string[];
  elementos_ordenados?: any[];
  pieza_ref_id?: string;
  profesor_id: string;
  skill_tags?: string[];
  target_ppms?: number[];
  content?: any;
  [key: string]: unknown;
}

/**
 * Helper seguro para preservar propiedades críticas (como 'role')
 * que podrían perderse en la conversión snakeToCamel si no están
 * explícitamente manejadas o si hay conflictos.
 */
function safeSnakeToCamel<T>(data: unknown): T {
  // Use a safer checks for object properties
  const record = data as Record<string, unknown>;
  const originalRole = record?.role;
  const camel = snakeToCamel<T>(data);
  // Preservar role si se perdió
  if (originalRole && !(camel as any).role) {
    (camel as any).role = originalRole;
  }
  return camel;
}

export * from './bloques';
export * from './piezas';
export * from './planes';
export * from './sesiones';
export * from './asignaciones';
import { getCachedAuthUser, clearAuthUserCache } from '../../auth/authUserCache';



// Importar funciones de piezas para uso interno en createRemoteDataAPI
import {
  fetchPiezasList,
  fetchPieza,
  fetchPiezasByFilter,
  createPieza,
  updatePieza,
  deletePieza,
} from './piezas';
import {
  fetchBloquesListado,
  fetchBloque,
  fetchBloquesByFilter,
  createBloque,
  updateBloque,
  deleteBloque,
} from './bloques';
import {
  fetchPlanesList,
  fetchPlan,
  fetchPlanesByFilter,
  fetchPlanesPreview,
  fetchPlanesPreviewEjercicios,
  createPlan,
  updatePlan,
  deletePlan,
  resolvePlanForAsignacion,
} from './planes';
import {
  fetchAsignaciones,
  fetchAsignacion,
  fetchAsignacionesByFilter,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion,
} from './asignaciones';
// Importar funciones de sesiones para uso interno en createRemoteDataAPI
import {
  fetchRegistrosSesionPreview,
  fetchRegistrosSesionList,
  fetchRegistroSesion,
  fetchRegistrosSesionByFilter,
  createRegistroSesion,
  updateRegistroSesion,
  deleteRegistroSesion
} from './sesiones';

// Importar funciones de feedbacks para uso interno en createRemoteDataAPI
import {
  fetchFeedbacksSemanalList,
  fetchFeedbackSemanal,
  fetchFeedbacksSemanalByFilter,
  createFeedbackSemanal,
  updateFeedbackSemanal,
  deleteFeedbackSemanal
} from './feedbacksSemanal';


import type {
  UserRole,
  StudiaUser,
  CreateStudiaUserInput,
  UpdateStudiaUserInput,
  Pieza,
  Bloque,
  Plan,
  Asignacion,
  RegistroSesion,
  RegistroBloque,
  FeedbackSemanal,
  EventoCalendario,
  EvaluacionTecnica,
  SupportTicket,
  SupportMensaje,
  LevelConfig,
  LevelKeyCriteria,
  StudentCriteriaStatus,
  StudentLevelHistory,
  StudentXPTotal,
  StudentBackpackItem,
  MediaAsset,
  CreateMediaAssetInput,
  UpdateMediaAssetInput,
} from '@/features/shared/types/domain';








/**
 * Obtiene emails de usuarios desde auth.users usando Edge Function get-user-emails
 * Solo funciona para usuarios ADMIN
 * OPTIMIZADO: Usa getCachedAuthUser() para evitar múltiples llamadas a getUser()
 */
async function getEmailsForUsers(userIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();

  if (!userIds || userIds.length === 0) return emailMap;

  // OPTIMIZACIÓN: Obtener usuario autenticado UNA SOLA VEZ al inicio
  const authUser = await getCachedAuthUser();

  // Si el usuario autenticado está en la lista, añadir su email
  if (authUser && userIds.includes(authUser.id) && authUser.email) {
    emailMap.set(authUser.id, authUser.email);
  }

  try {
    // Si solo pedimos el email del usuario actual, no llamar a la Edge Function
    if (authUser && userIds.length === 1 && userIds[0] === authUser.id) {
      return emailMap;
    }

    // Usar supabase.functions.invoke para llamar a la Edge Function
    // Esto maneja automáticamente la autenticación y la URL base
    const { data, error } = await supabase.functions.invoke('get-user-emails', {
      body: { userIds }
    });

    if (error) {
      // Si falla, ya tenemos el email del usuario autenticado en el mapa (si estaba en userIds)
      // Solo loguear en desarrollo para debugging
      if (import.meta.env.DEV) {
        console.warn('[remoteDataAPI] Error al invocar get-user-emails:', error);
      }
      return emailMap;
    }

    if (data && data.success && data.emails) {
      // Convertir objeto a Map
      for (const [userId, email] of Object.entries(data.emails)) {
        if (email) {
          emailMap.set(userId, email as string);
        }
      }
    }

  } catch (error) {
    // Si falla, ya tenemos el email del usuario autenticado en el mapa (si estaba en userIds)
    if (import.meta.env.DEV) {
      console.warn('[remoteDataAPI] Excepción al obtener emails:', error);
    }
  }

  return emailMap;
}


// Caché en memoria para usuarios ya cargados
// Esto evita queries individuales cuando se llama a User.get() después de User.list()
const usersCache: Map<string, StudiaUser> = new Map();
let usersCacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene un usuario de la caché si está disponible
 */
function getCachedUser(id: string): StudiaUser | null {
  const now = Date.now();
  if (now - usersCacheTimestamp > CACHE_TTL) {
    // Caché expirada, limpiar
    usersCache.clear();
    usersCacheTimestamp = 0;
    return null;
  }
  return usersCache.get(id) || null;
}

/**
 * Almacena usuarios en la caché
 */
function cacheUsers(users: StudiaUser[]) {
  users.forEach(user => {
    if (user?.id) {
      usersCache.set(user.id, user);
    }
  });
  usersCacheTimestamp = Date.now();
}



/**
 * Implementación remota de AppDataAPI
 */
export function createRemoteDataAPI(): AppDataAPI {
  return {
    usuarios: {
      list: async (): Promise<StudiaUser[]> => {
        // Obtener perfiles desde Supabase - INCLUIR EXPLÍCITAMENTE el campo role
        // Usar paginación para obtener TODOS los usuarios (Supabase tiene límite por defecto)
        const PAGE_SIZE = 1000; // Límite máximo de Supabase por página
        let allData: DbProfile[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error, count } = await withAuthErrorHandling(
            supabase
              .from('profiles')
              .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono', { count: 'exact' })
              .range(from, from + PAGE_SIZE - 1)
          );

          if (error) {
            console.error('[remoteDataAPI] Error al leer profiles:', {
              error: error?.message || error,
              code: error?.code,
              details: error?.details,
            });
            throw error;
          }

          if (data && (data as DbProfile[]).length > 0) {
            allData = allData.concat(data as DbProfile[]);
            from += PAGE_SIZE;
            // Si obtenemos menos registros que PAGE_SIZE, hemos llegado al final
            // O si el count indica que ya tenemos todos
            hasMore = (data as DbProfile[]).length === PAGE_SIZE && (count === null || count === undefined || allData.length < count);
          } else {
            hasMore = false;
          }
        }

        const data = allData;

        // OPTIMIZADO: Usar getCachedAuthUser() en lugar de supabase.auth.getUser()
        const authUser = await getCachedAuthUser();
        const currentUserEmail = authUser?.email || null;
        const currentUserId = authUser?.id || null;

        // Obtener emails usando función SQL si está disponible, o usar el usuario autenticado
        let emailsMap = new Map<string, string>();
        try {
          const userIds = (data as DbProfile[] || []).map((u: DbProfile) => u.id);
          emailsMap = await getEmailsForUsers(userIds);
          // Añadir email del usuario autenticado al mapa si coincide
          if (currentUserId && currentUserEmail && userIds.includes(currentUserId)) {
            emailsMap.set(currentUserId, currentUserEmail);
          }
        } catch (e) {
          // Si falla, continuar sin emails adicionales
          if (currentUserId && currentUserEmail) {
            emailsMap.set(currentUserId, currentUserEmail);
          }
        }

        // OPTIMIZACIÓN: Obtener todos los profesores asignados en una sola query
        // Identificar IDs únicos de profesores asignados que no están ya en la lista
        const profesorIdsSet = new Set<string>();
        const existingUserIdsSet = new Set((data || []).map((u: DbProfile) => u.id));

        (data || []).forEach((u: DbProfile) => {
          const profesorId = u.profesor_asignado_id;
          if (profesorId && !existingUserIdsSet.has(profesorId)) {
            profesorIdsSet.add(profesorId);
          }
        });

        // Si hay profesores asignados que no están en la lista, obtenerlos en una sola query
        const profesoresMap: Map<string, DbProfile> = new Map();
        if (profesorIdsSet.size > 0) {
          try {
            const profesorIdsArray = Array.from(profesorIdsSet);
            // Hacer una única query con .in() para obtener todos los profesores
            const { data: profesoresData, error: profesoresError } = await withAuthErrorHandling(
              supabase
                .from('profiles')
                .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono')
                .in('id', profesorIdsArray)
            );

            if (!profesoresError && profesoresData && Array.isArray(profesoresData)) {
              // Crear mapa de profesores por ID
              (profesoresData as DbProfile[]).forEach((prof: DbProfile) => {
                profesoresMap.set(prof.id, prof);
              });
            }
          } catch (e) {
            // Si falla, continuar sin datos de profesores adicionales
            console.warn('[remoteDataAPI] Error al obtener profesores asignados:', e);
          }
        }

        // Normalizar usuarios y asociar datos de profesores
        const normalizedUsers = (data as DbProfile[] || []).map((u: DbProfile) => {
          // Usar helper seguro
          const camelUser = safeSnakeToCamel<StudiaUser>(u);

          // Priorizar: email del mapeo, luego del usuario mismo
          const email = emailsMap.get(u.id) || camelUser.email;

          // Normalizar usuario
          const normalized = normalizeSupabaseUser(camelUser, email);

          // Verificación CRÍTICA: forzar el rol desde el valor original de Supabase
          const originalRole = u.role;
          if (originalRole) {
            const roleUpper = String(originalRole).toUpperCase().trim();
            if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
              normalized.rolPersonalizado = roleUpper;
            }
          }

          return normalized;
        });

        // OPTIMIZACIÓN: Añadir el usuario autenticado si no está en la lista
        // Esto evita queries individuales en AuthProvider y useCurrentProfile
        let finalUsers = [...normalizedUsers];
        if (currentUserId && !existingUserIdsSet.has(currentUserId)) {
          try {
            // Obtener el perfil del usuario autenticado en una query adicional
            // Solo si no está en la lista principal
            const { data: currentUserProfile, error: currentUserError } = await withAuthErrorHandling(
              supabase
                .from('profiles')
                .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono')
                .eq('id', currentUserId)
                .single()
            );

            if (!currentUserError && currentUserProfile) {
              // Cast explícito para evitar error 'unknown'
              const profile = currentUserProfile as unknown as DbProfile;
              const camelUser = safeSnakeToCamel<StudiaUser>(profile);

              const email = currentUserEmail || camelUser.email;
              const normalized = normalizeSupabaseUser(camelUser, email);

              const originalRole = profile.role;
              if (originalRole) {
                const roleUpper = String(originalRole).toUpperCase().trim();
                if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
                  normalized.rolPersonalizado = roleUpper;
                }
              }

              finalUsers.push(normalized);
            }
          } catch (e) {
            // Si falla, continuar sin el usuario autenticado en la lista
            console.warn('[remoteDataAPI] Error al obtener perfil del usuario autenticado:', e);
          }
        }

        // Añadir profesores obtenidos adicionales a la lista (si no están ya incluidos)
        // Esto evita queries individuales cuando el frontend busca el profesor asignado
        if (profesoresMap.size > 0) {
          const existingIdsSet = new Set(finalUsers.map((u: StudiaUser) => u.id));
          const profesoresAdicionales = Array.from(profesoresMap.values())
            .filter((prof: DbProfile) => {
              return !existingIdsSet.has(prof.id);
            })
            .map((prof: DbProfile) => {
              const camelProf = safeSnakeToCamel<StudiaUser>(prof);

              const email = emailsMap.get(prof.id) || camelProf.email;
              const normalized = normalizeSupabaseUser(camelProf, email);

              const originalRole = prof.role;
              if (originalRole) {
                const roleUpper = String(originalRole).toUpperCase().trim();
                if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
                  normalized.rolPersonalizado = roleUpper;
                }
              }

              return normalized;
            });

          // Devolver usuarios + profesores adicionales
          finalUsers = [...finalUsers, ...profesoresAdicionales];
        }

        // Almacenar usuarios en caché para evitar queries individuales posteriores
        cacheUsers(finalUsers);

        return finalUsers;
      },
      get: async (id: string): Promise<StudiaUser | null> => {
        // OPTIMIZACIÓN: Primero buscar en la caché antes de hacer query individual
        const cachedUser = getCachedUser(id);
        if (cachedUser) {
          return cachedUser;
        }

        // Validar que el ID sea un UUID válido antes de hacer el request
        // Esto previene errores 400 cuando se pasan IDs legacy de MongoDB
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          // Si no es un UUID válido, devolver null silenciosamente
          // Este es un caso esperado cuando hay IDs legacy en la base de datos
          return null;
        }

        // Si no está en caché, hacer query individual
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('profiles')
            .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono')
            .eq('id', id)
            .single()
        );

        if (error) {
          if (error.code === 'PGRST116') return null; // No encontrado
          // Si es error 406 (Not Acceptable), probablemente es por RLS - devolver null en lugar de lanzar error
          if (error.code === 'PGRST301' || error.status === 406) {
            return null;
          }
          throw error;
        }

        // Usar helper seguro
        const camelUser = safeSnakeToCamel<StudiaUser>(data);

        // Intentar obtener email del usuario autenticado si coincide
        let email: string | undefined = undefined;
        try {
          const user = await getCachedAuthUser();
          if (user && user.id === id) {
            email = user.email || undefined;
          }
        } catch (e) {
          // Ignorar si no hay usuario autenticado
        }

        // Normalizar usuario
        const normalized = normalizeSupabaseUser(camelUser, email);

        // Verificación CRÍTICA: forzar el rol desde el valor original de Supabase
        const originalRole = (data as unknown as DbProfile).role;
        if (originalRole) {
          const roleUpper = String(originalRole).toUpperCase().trim();
          if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
            normalized.rolPersonalizado = roleUpper;
          }
        }

        // Almacenar en caché para futuras consultas
        cacheUsers([normalized]);

        return normalized;
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<StudiaUser[]> => {
        let query = supabase.from('profiles').select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;

        // Obtener email e ID del usuario autenticado si existe
        let currentUserEmail: string | null = null;
        let currentUserId: string | null = null;
        try {
          const user = await getCachedAuthUser();
          currentUserEmail = user?.email || null;
          currentUserId = user?.id || null;
        } catch (e) {
          // Ignorar si no hay usuario autenticado
        }

        return (data as DbProfile[] || []).map((u: DbProfile) => {
          // Preservar el campo 'role' ANTES de snakeToCamel
          const originalRole = u.role;

          const camelUser = snakeToCamel<StudiaUser>(u);

          // Asegurar que el campo 'role' se preserve
          if (originalRole && !camelUser.role) {
            camelUser.role = originalRole as UserRole;
          }

          // Usar email del usuario autenticado si coincide con el ID, sino usar el del usuario
          const email = (currentUserId && u.id === currentUserId && currentUserEmail)
            ? currentUserEmail
            : camelUser.email;

          // Normalizar usuario
          const normalized = normalizeSupabaseUser(camelUser, email);

          // Verificación CRÍTICA: forzar el rol desde el valor original de Supabase
          if (originalRole) {
            const roleUpper = String(originalRole).toUpperCase().trim();
            if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
              normalized.rolPersonalizado = roleUpper;
            }
          }

          return normalized;
        });
      },
      create: async (data: CreateStudiaUserInput): Promise<StudiaUser> => {
        const snakeData = camelToSnake(data);
        const { data: result, error } = await withAuthErrorHandling(
          supabase
            .from('profiles')
            .insert(snakeData)
            .select()
            .single()
        );

        if (error) throw error;

        const camelUser = safeSnakeToCamel<StudiaUser>(result);
        return normalizeSupabaseUser(camelUser, data.email);
      },
      update: async (id: string, updates: Partial<StudiaUser>): Promise<StudiaUser> => {
        // Mapear campos del frontend a campos de Supabase
        const supabaseUpdates: Partial<DbProfile> = {};

        // Mapear nombreCompleto → full_name
        // También aceptar full_name directamente para sincronización explícita
        if (updates.full_name !== undefined) {
          supabaseUpdates.full_name = updates.full_name;
        } else if (updates.nombreCompleto !== undefined) {
          supabaseUpdates.full_name = updates.nombreCompleto;
        }

        // Mapear rolPersonalizado → role
        if (updates.rolPersonalizado !== undefined) {
          supabaseUpdates.role = updates.rolPersonalizado.toUpperCase();
        }

        // Mapear profesorAsignadoId → profesor_asignado_id
        // IMPORTANTE: En Supabase, profesor_asignado_id debe ser un UUID válido
        // Solo actualizar si viene explícitamente definido (undefined significa no cambiar)
        if (updates.profesorAsignadoId !== undefined) {
          if (updates.profesorAsignadoId === null || updates.profesorAsignadoId === '') {
            supabaseUpdates.profesor_asignado_id = null;
          } else {
            const profesorId = String(updates.profesorAsignadoId).trim();
            // Validar si es un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (uuidRegex.test(profesorId)) {
              // Es un UUID válido, usar directamente
              supabaseUpdates.profesor_asignado_id = profesorId;
            } else {
              // No es un UUID válido - rechazar directamente sin intentar resolver
              // Esto previene errores cuando se intenta usar IDs de MongoDB
              throw new Error(`El ID del profesor asignado debe ser un UUID válido.Se recibió: ${profesorId} `);
            }
          }
        }

        // Otros campos que no necesitan mapeo especial
        if (updates.nivel !== undefined) {
          supabaseUpdates.nivel = updates.nivel;
        }
        if (updates.telefono !== undefined) {
          supabaseUpdates.telefono = updates.telefono;
        }
        // Mapear nivelTecnico → nivel_tecnico
        if (updates.nivelTecnico !== undefined) {
          supabaseUpdates.nivel_tecnico = updates.nivelTecnico;
        }
        // mediaLinks no se guarda en profiles (no existe la columna en Supabase)
        // Se mantiene solo para compatibilidad local

        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('profiles')
            .update(supabaseUpdates)
            .eq('id', id)
            .select()
            .single()
        );

        if (error) {
          console.error('[remoteDataAPI] Error al actualizar usuario:', {
            error: error?.message || error,
            code: error?.code,
            details: error?.details,
            id,
          });
          throw error;
        }

        // Sincronizar full_name con auth.users si se actualizó
        if (updates.nombreCompleto !== undefined) {
          try {
            // Actualizar raw_user_meta_data en auth.users para mantener sincronización
            // Esto requiere usar el Admin API o una función edge function
            // Por ahora, intentamos actualizar usando updateUser si está disponible
            const currentUser = await getCachedAuthUser();
            if (currentUser && currentUser.id === id) {
              // Solo podemos actualizar el usuario actual
              // Para otros usuarios, necesitaríamos Admin API o una función edge
              try {
                await wrapSupabaseCall(() => supabase.auth.updateUser({
                  data: { full_name: updates.nombreCompleto }
                }));
              } catch (authError) {
                // Si falla, no es crítico - el nombre ya está en profiles
                // Solo loguear en desarrollo
                if (import.meta.env.DEV) {
                  console.warn('[remoteDataAPI] No se pudo sincronizar full_name con auth.users:', authError);
                }
              }
            }
          } catch (syncError) {
            // No es crítico si falla la sincronización con auth.users
            // El nombre principal está en profiles que es la fuente de verdad
            if (import.meta.env.DEV) {
              console.warn('[remoteDataAPI] Error al sincronizar con auth.users:', syncError);
            }
          }
        }

        // Usar helper seguro
        const camelUser = safeSnakeToCamel<StudiaUser>(data);

        // Intentar obtener email del usuario autenticado si coincide
        let email: string | undefined = updates.email;
        if (!email) {
          try {
            const user = await getCachedAuthUser();
            if (user && user.id === id) {
              email = user.email || undefined;
            }
          } catch (e) {
            // Ignorar si no hay usuario autenticado
          }
        }

        // Normalizar usuario
        const normalized = normalizeSupabaseUser(camelUser, email);

        // Verificación CRÍTICA: forzar el rol desde el valor original de Supabase
        const originalRole = (data as unknown as DbProfile).role;
        if (originalRole) {
          const roleUpper = String(originalRole).toUpperCase().trim();
          if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
            normalized.rolPersonalizado = roleUpper;
          }
        }

        return normalized;
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await withAuthErrorHandling(
          supabase
            .from('profiles')
            .delete()
            .eq('id', id)
        );

        if (error) throw error;
        return { success: true };
      },
    },
    piezas: {
      list: fetchPiezasList,
      get: fetchPieza,
      filter: fetchPiezasByFilter,
      create: createPieza,
      update: updatePieza,
      delete: deletePieza,
    },
    bloques: {
      list: fetchBloquesListado,
      get: async (id: string) => fetchBloque(id),
      filter: fetchBloquesByFilter,
      create: createBloque,
      update: updateBloque,
      delete: deleteBloque,
    },
    planes: {
      list: fetchPlanesList,
      get: async (id: string) => fetchPlan(id),
      filter: fetchPlanesByFilter,
      create: createPlan,
      update: updatePlan,
      delete: deletePlan,
      preview: fetchPlanesPreview,
      previewEjercicios: fetchPlanesPreviewEjercicios,
      resolveForAsignacion: resolvePlanForAsignacion,
    },
    asignaciones: {
      list: fetchAsignaciones,
      get: async (id: string) => fetchAsignacion(id),
      filter: fetchAsignacionesByFilter,
      create: createAsignacion,
      update: updateAsignacion,
      delete: deleteAsignacion,
    },
    registrosSesion: {
      preview: fetchRegistrosSesionPreview,
      list: fetchRegistrosSesionList,
      get: async (id: string) => fetchRegistroSesion(id),
      filter: fetchRegistrosSesionByFilter,
      create: createRegistroSesion,
      update: updateRegistroSesion,
      delete: deleteRegistroSesion,
      listByUsuario: async (alumnoId: string, limit?: number | null) => {
        return fetchRegistrosSesionByFilter({ alumnoId }, limit);
      }
    },
    registrosBloque: {
      list: async (sort?: string) => {
        let query = supabase.from('registros_bloque').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((r) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('registros_bloque')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return normalizeISOFields(snakeToCamel<RegistroBloque>(data));
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null) => {
        let query = supabase.from('registros_bloque').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) {
          query = query.limit(limit);
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((r) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
      },
      create: async (data: Partial<RegistroBloque>) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('registroBloque'),
        });
        const { data: result, error } = await supabase
          .from('registros_bloque')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return normalizeISOFields(snakeToCamel<RegistroBloque>(result));
      },
      update: async (id: string, updates: Partial<RegistroBloque>) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('registros_bloque')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return normalizeISOFields(snakeToCamel<RegistroBloque>(data));
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('registros_bloque')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    eventosCalendario: {
      list: async (sort?: string): Promise<EventoCalendario[]> => {
        let query = supabase.from('eventos_calendario').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[] || []).map((e) => snakeToCamel<EventoCalendario>(e)));
      },
      get: async (id: string): Promise<EventoCalendario | null> => {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<EventoCalendario>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<EventoCalendario[]> => {
        let query = supabase.from('eventos_calendario').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<EventoCalendario>(e));
      },
      create: async (data: Partial<EventoCalendario>): Promise<EventoCalendario> => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('eventoCalendario'),
        });
        const { data: result, error } = await supabase
          .from('eventos_calendario')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<EventoCalendario>(result);
      },
      update: async (id: string, updates: Partial<EventoCalendario>): Promise<EventoCalendario> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('eventos_calendario')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<EventoCalendario>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('eventos_calendario')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    evaluaciones: {
      list: async (sort?: string): Promise<EvaluacionTecnica[]> => {
        let query = supabase.from('evaluaciones_tecnicas').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data as unknown[] || []).map((e) => snakeToCamel<EvaluacionTecnica>(e));
      },
      get: async (id: string): Promise<EvaluacionTecnica | null> => {
        const { data, error } = await supabase
          .from('evaluaciones_tecnicas')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<EvaluacionTecnica>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<EvaluacionTecnica[]> => {
        let query = supabase.from('evaluaciones_tecnicas').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<EvaluacionTecnica>(e));
      },
      create: async (data: Partial<EvaluacionTecnica>): Promise<EvaluacionTecnica> => {
        const snakeData = camelToSnake(data);
        // Si el ID es temporal (generado localmente) o no existe, lo eliminamos para que Supabase genere un UUID válido
        if (snakeData.id && (typeof snakeData.id === 'string' && !snakeData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
          delete snakeData.id;
        }
        const { data: result, error } = await supabase
          .from('evaluaciones_tecnicas')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<EvaluacionTecnica>(result);
      },
      update: async (id: string, updates: Partial<EvaluacionTecnica>): Promise<EvaluacionTecnica> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('evaluaciones_tecnicas')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<EvaluacionTecnica>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('evaluaciones_tecnicas')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
    },
    feedbacksSemanal: {
      list: async (sort?: string): Promise<FeedbackSemanal[]> => {
        const raw = await fetchFeedbacksSemanalList(sort);
        return raw.map((f) => {
          return {
            ...f,
            // If these properties are needed in UI, they should be added to the interface
            // For now, let's keep it strictly typed to the interface
          } as FeedbackSemanal;
        });
      },
      get: async (id: string): Promise<FeedbackSemanal | null> => fetchFeedbackSemanal(id),
      filter: (filters: Record<string, unknown>, limit?: number | null): Promise<FeedbackSemanal[]> =>
        fetchFeedbacksSemanalByFilter(filters, limit),
      create: async (data: Partial<FeedbackSemanal>): Promise<FeedbackSemanal> => {
        const raw = await createFeedbackSemanal(data);
        return raw;
      },
      update: async (id: string, updates: Partial<FeedbackSemanal>): Promise<FeedbackSemanal> => {
        const raw = await updateFeedbackSemanal(id, updates);
        return raw;
      },
      delete: deleteFeedbackSemanal,
    },
    levelsConfig: {
      list: async (sort?: string): Promise<LevelConfig[]> => {
        let query = supabase.from('levels_config').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<LevelConfig>(e));
      },
      get: async (id: string): Promise<LevelConfig | null> => {
        const { data, error } = await supabase
          .from('levels_config')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<LevelConfig>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<LevelConfig[]> => {
        let query = supabase.from('levels_config').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<LevelConfig>(e));
      },
      create: async (data: Partial<LevelConfig>): Promise<LevelConfig> => {
        const snakeData = camelToSnake({
          ...data,
          id: (data as any).id || generateId('levelConfig'),
        });
        const { data: result, error } = await supabase
          .from('levels_config')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<LevelConfig>(result);
      },
      update: async (id: string, updates: Partial<LevelConfig>): Promise<LevelConfig> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('levels_config')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<LevelConfig>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('levels_config')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    levelKeyCriteria: {
      list: async (sort?: string): Promise<LevelKeyCriteria[]> => {
        let query = supabase.from('level_key_criteria').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<LevelKeyCriteria>(e));
      },
      get: async (id: string): Promise<LevelKeyCriteria | null> => {
        const { data, error } = await supabase
          .from('level_key_criteria')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<LevelKeyCriteria>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<LevelKeyCriteria[]> => {
        let query = supabase.from('level_key_criteria').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<LevelKeyCriteria>(e));
      },
      create: async (data: Partial<LevelKeyCriteria>): Promise<LevelKeyCriteria> => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('levelKeyCriteria'),
        });
        const { data: result, error } = await supabase
          .from('level_key_criteria')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<LevelKeyCriteria>(result);
      },
      update: async (id: string, updates: Partial<LevelKeyCriteria>): Promise<LevelKeyCriteria> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('level_key_criteria')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<LevelKeyCriteria>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('level_key_criteria')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    studentCriteriaStatus: {
      list: async (sort?: string): Promise<StudentCriteriaStatus[]> => {
        let query = supabase.from('student_criteria_status').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentCriteriaStatus>(e));
      },
      get: async (id: string): Promise<StudentCriteriaStatus | null> => {
        const { data, error } = await supabase
          .from('student_criteria_status')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<StudentCriteriaStatus>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<StudentCriteriaStatus[]> => {
        let query = supabase.from('student_criteria_status').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentCriteriaStatus>(e));
      },
      create: async (data: Partial<StudentCriteriaStatus>): Promise<StudentCriteriaStatus> => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('studentCriteriaStatus'),
        });
        const { data: result, error } = await supabase
          .from('student_criteria_status')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<StudentCriteriaStatus>(result);
      },
      update: async (id: string, updates: Partial<StudentCriteriaStatus>): Promise<StudentCriteriaStatus> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('student_criteria_status')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<StudentCriteriaStatus>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('student_criteria_status')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    studentLevelHistory: {
      list: async (sort?: string): Promise<StudentLevelHistory[]> => {
        let query = supabase.from('student_level_history').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentLevelHistory>(e));
      },
      get: async (id: string): Promise<StudentLevelHistory | null> => {
        const { data, error } = await supabase
          .from('student_level_history')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<StudentLevelHistory>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<StudentLevelHistory[]> => {
        let query = supabase.from('student_level_history').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentLevelHistory>(e));
      },
      create: async (data: Partial<StudentLevelHistory>): Promise<StudentLevelHistory> => {
        const snakeData = camelToSnake({
          ...data,
          id: (data as any).id || generateId('studentLevelHistory'),
        });
        const { data: result, error } = await supabase
          .from('student_level_history')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<StudentLevelHistory>(result);
      },
      update: async (id: string, updates: Partial<StudentLevelHistory>): Promise<StudentLevelHistory> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('student_level_history')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<StudentLevelHistory>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('student_level_history')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    studentXpTotal: {
      list: async (sort?: string): Promise<StudentXPTotal[]> => {
        let query = supabase.from('student_xp_total').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentXPTotal>(e));
      },
      get: async (id: string): Promise<StudentXPTotal | null> => {
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_xp_total')
            .select('*')
            .eq('id', id)
            .single()
        );
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<StudentXPTotal>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<StudentXPTotal[]> => {
        let query = supabase.from('student_xp_total').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentXPTotal>(e));
      },
      create: async (data: Partial<StudentXPTotal>): Promise<StudentXPTotal> => {
        const snakeData = camelToSnake({
          ...data,
          id: (data as any).id || generateId('studentXpTotal'),
        });
        const { data: result, error } = await withAuthErrorHandling(
          supabase
            .from('student_xp_total')
            .insert(snakeData)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel<StudentXPTotal>(result);
      },
      update: async (id: string, updates: Partial<StudentXPTotal>): Promise<StudentXPTotal> => {
        const snakeUpdates = camelToSnake(updates);
        delete snakeUpdates.id;
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_xp_total')
            .update(snakeUpdates)
            .eq('id', id)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel<StudentXPTotal>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await withAuthErrorHandling(
          supabase
            .from('student_xp_total')
            .delete()
            .eq('id', id)
        );
        if (error) throw error;
        return { success: true };
      }
    },
    studentBackpack: {
      list: async (sort?: string): Promise<StudentBackpackItem[]> => {
        let query = supabase.from('student_backpack').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentBackpackItem>(e));
      },
      get: async (id: string): Promise<StudentBackpackItem | null> => {
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_backpack')
            .select('*')
            .eq('id', id)
            .single()
        );
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<StudentBackpackItem>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<StudentBackpackItem[]> => {
        let query = supabase.from('student_backpack').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<StudentBackpackItem>(e));
      },
      create: async (data: Partial<StudentBackpackItem>): Promise<StudentBackpackItem> => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('studentBackpack'),
        });
        const { data: result, error } = await withAuthErrorHandling(
          supabase
            .from('student_backpack')
            .insert(snakeData)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel<StudentBackpackItem>(result);
      },
      update: async (id: string, updates: Partial<StudentBackpackItem>): Promise<StudentBackpackItem> => {
        const snakeUpdates = camelToSnake(updates);
        delete snakeUpdates.id;
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_backpack')
            .update(snakeUpdates)
            .eq('id', id)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel<StudentBackpackItem>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await withAuthErrorHandling(
          supabase
            .from('student_backpack')
            .delete()
            .eq('id', id)
        );
        if (error) throw error;
        return { success: true };
      }
    },
    mediaAssets: {
      list: async (sort?: string): Promise<MediaAsset[]> => {
        let query = supabase.from('media_assets').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<MediaAsset>(e));
      },
      get: async (id: string): Promise<MediaAsset | null> => {
        const { data, error } = await supabase
          .from('media_assets')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<MediaAsset>(data);
      },
      filter: async (filters: Record<string, unknown>, limit?: number | null): Promise<MediaAsset[]> => {
        let query = supabase.from('media_assets').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return ((data as unknown[]) || []).map((e) => snakeToCamel<MediaAsset>(e));
      },
      create: async (data: CreateMediaAssetInput): Promise<MediaAsset> => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('mediaAsset'),
        }) as any; // Cast to any to handle type union mismatch for fileType in DB

        // Ensure user is set
        if (!snakeData.created_by) {
          const user = await getCachedAuthUser();
          if (user?.id) snakeData.created_by = user.id;
        }

        const { data: result, error } = await supabase
          .from('media_assets')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<MediaAsset>(result);
      },
      update: async (id: string, updates: UpdateMediaAssetInput): Promise<MediaAsset> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('media_assets')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<MediaAsset>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('media_assets')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      }
    },

    // Implementación de RPCs
    async getCalendarSummary(startDate: Date, endDate: Date, userId?: string): Promise<{
      registrosSesion: RegistroSesion[];
      feedbacksSemanal: FeedbackSemanal[];
      asignaciones: Asignacion[];
      eventosCalendario: EventoCalendario[];
    }> {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // 1. Sesiones
      let sessionsQuery = supabase
        .from('registros_sesion')
        .select('*')
        .gte('inicio_iso', startIso)
        .lte('inicio_iso', endIso);

      if (userId) sessionsQuery = sessionsQuery.eq('alumno_id', userId);

      // 2. Feedbacks
      let feedbacksQuery = supabase
        .from('feedbacks_semanal')
        .select('*')
        .gte('week_start', startIso.split('T')[0])
        .lte('week_start', endIso.split('T')[0]);

      if (userId) feedbacksQuery = feedbacksQuery.eq('alumno_id', userId);

      // 3. Asignaciones
      let asignsQuery = supabase
        .from('asignaciones')
        .select('*, planes(*)')
        .gte('fecha_fin', startIso.split('T')[0])
        .lte('fecha_inicio', endIso.split('T')[0]);

      if (userId) asignsQuery = asignsQuery.eq('alumno_id', userId);

      // 4. Eventos
      let eventsQuery = supabase
        .from('eventos_calendario')
        .select('*')
        .gte('fecha_hora', startIso)
        .lte('fecha_hora', endIso);

      if (userId) eventsQuery = eventsQuery.eq('user_id', userId);

      const [sessionsRes, feedbacksRes, asignsRes, eventsRes] = await Promise.all([
        sessionsQuery,
        feedbacksQuery,
        asignsQuery,
        eventsQuery
      ]);

      return {
        registrosSesion: (sessionsRes.data as unknown[] || []).map((r) => normalizeISOFields(snakeToCamel<RegistroSesion>(r))),
        feedbacksSemanal: (feedbacksRes.data as unknown[] || []).map((f) => snakeToCamel<FeedbackSemanal>(f)),
        asignaciones: (asignsRes.data as unknown[] || []).map((a) => normalizeAsignacionISO(snakeToCamel<Asignacion>(a))),
        eventosCalendario: (eventsRes.data as unknown[] || []).map((e) => snakeToCamel<EventoCalendario>(e)),
      };
    },

    async getProgressSummary(studentId?: string): Promise<{
      xpTotals: StudentXPTotal[];
      evaluacionesTecnicas: EvaluacionTecnica[];
      feedbacksSemanal: FeedbackSemanal[];
      registrosSesion: RegistroSesion[];
    }> {
      // If studentId is provided, filter by it; otherwise return ALL data (for ADMIN/PROF)
      // This matches the behavior of localDataClient.getProgressSummary
      const hasStudentFilter = studentId && studentId.trim() !== '';

      // Build queries conditionally
      let xpQuery = supabase.from('student_xp_total').select('*');
      let evalsQuery = supabase.from('evaluaciones_tecnicas').select('*').order('fecha', { ascending: false });
      let feedbackQuery = supabase.from('feedbacks_semanal').select('*').order('week_start', { ascending: false });
      let sessionsQuery = supabase.from('registros_sesion').select('*').order('inicio_iso', { ascending: false });

      if (hasStudentFilter) {
        xpQuery = xpQuery.eq('student_id', studentId);
        evalsQuery = evalsQuery.eq('alumno_id', studentId).limit(10);
        feedbackQuery = feedbackQuery.eq('alumno_id', studentId).limit(5);
        sessionsQuery = sessionsQuery.eq('alumno_id', studentId).limit(50);
      }
      // When no studentId filter, return all data (no per-student limit, but reasonable global limits)
      // This allows the frontend to filter by date range and selected students

      const [xpRes, evalsRes, feedbackRes, sessionsRes] = await Promise.all([
        xpQuery,
        evalsQuery,
        feedbackQuery,
        sessionsQuery
      ]);

      // Normalize sessions
      const sessions: RegistroSesion[] = (sessionsRes.data as unknown[] || []).map((s) => normalizeISOFields(snakeToCamel<RegistroSesion>(s)));

      // Fetch associated blocks for all sessions in batches (to avoid URL length limits)
      let sessionsWithBlocks = sessions;
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const chunkSize = 50;
        let allBlocks: RegistroBloque[] = [];

        for (let i = 0; i < sessionIds.length; i += chunkSize) {
          const chunk = sessionIds.slice(i, i + chunkSize);
          const { data: blocksData, error: blocksError } = await supabase
            .from('registros_bloque')
            .select('*')
            .in('registro_sesion_id', chunk);

          if (blocksError) {
            console.warn('[getProgressSummary] Error fetching blocks chunk:', blocksError);
            continue;
          }

          if (blocksData) {
            const normalizedBlocks = (blocksData as unknown[]).map((b) =>
              normalizeISOFields(snakeToCamel<RegistroBloque>(b))
            ) as RegistroBloque[];
            allBlocks = [...allBlocks, ...normalizedBlocks];
          }
        }

        // Join blocks to sessions
        sessionsWithBlocks = sessions.map(session => ({
          ...session,
          registrosBloque: allBlocks.filter(b => b.registroSesionId === session.id)
        }));
      }

      return {
        xpTotals: (xpRes.data as unknown[] || []).map((x) => snakeToCamel<StudentXPTotal>(x)),
        evaluacionesTecnicas: (evalsRes.data as unknown[] || []).map((e) => snakeToCamel<EvaluacionTecnica>(e)),
        feedbacksSemanal: (feedbackRes.data as unknown[] || []).map((f) => snakeToCamel<FeedbackSemanal>(f)),
        registrosSesion: sessionsWithBlocks,
      };
    },

    async getSeedStats(): Promise<{
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
    }> {
      return {
        usersCount: 0,
        usersAdmin: 0,
        usersProf: 0,
        usersEstu: 0,
        piezas: 0,
        planes: 0,
        bloques: 0,
        asignaciones: 0,
        registrosSesion: 0,
        registrosBloques: 0,
        feedbacks: 0,
      };
    },
  };
};

// Export a singleton instance for direct imports
export const remoteDataAPI = createRemoteDataAPI();

/**
 * Activa o desactiva un perfil de usuario (Admin RPC)
 */
export async function setProfileActive(profileId: string, isActive: boolean): Promise<void> {
  const { error } = await withAuthErrorHandling(
    supabase.rpc('admin_set_profile_active', {
      p_profile_id: profileId,
      p_is_active: isActive,
    })
  );

  if (error) {
    throw error;
  }
}



/**
 * Obtiene todos los feedbacks semanales (para migración de multimedia)
 */
export async function fetchFeedbacksSemanales(): Promise<FeedbackSemanal[]> {
  const { data, error } = await withAuthErrorHandling(
    supabase
      .from('feedbacks_semanal')
      .select('*')
      .order('created_at', { ascending: false })
  );

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map((item) => snakeToCamel<FeedbackSemanal>(item));
}

/**
 * Obtiene todos los mensajes de soporte (para migración de multimedia)
 */
export async function fetchSupportMensajes(): Promise<SupportMensaje[]> {
  const { data, error } = await withAuthErrorHandling(
    supabase
      .from('support_mensajes')
      .select('*')
      .order('created_at', { ascending: false })
  );

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map((item) => snakeToCamel<SupportMensaje>(item));
}

/**
 * Obtiene una vista previa de los planes para la página de ejercicios
 */
export async function fetchBloquesPreview(): Promise<Bloque[]> {
  const { data, error } = await withAuthErrorHandling(
    supabase
      .from('bloques')
      .select('*')
      .order('created_at', { ascending: false })
  );

  if (error) throw error;
  return ((data as any[]) || []).map((item) => snakeToCamel<Bloque>(item));
}

/**
 * Obtiene una vista previa de las piezas
 */
export async function fetchPiezasPreview(): Promise<Pieza[]> {
  const { data, error } = await withAuthErrorHandling(
    supabase
      .from('piezas')
      .select('*')
      .order('created_at', { ascending: false })
  );

  if (error) throw error;
  return ((data as any[]) || []).map((item) => snakeToCamel<Pieza>(item));
}

/**
 * Obtiene registros de sesión con multimedia
 */
export async function fetchRegistrosSesionMultimedia(): Promise<RegistroSesion[]> {
  const { data, error } = await withAuthErrorHandling(
    supabase
      .from('registros_sesion')
      .select('*')
      .not('media_links', 'is', null) // Filtrar solo los que tienen media
      .order('created_at', { ascending: false })
  );

  if (error) throw error;
  return ((data as any[]) || []).map((item) => snakeToCamel<RegistroSesion>(item));
}








