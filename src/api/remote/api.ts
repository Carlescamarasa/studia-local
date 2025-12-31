/// <reference types="../../vite-env" />
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



// Importar funciones de asignaciones para uso interno en createRemoteDataAPI
import {
  fetchAsignaciones,
  fetchAsignacion,
  fetchAsignacionesByFilter,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion
} from './asignaciones';

// Importar funciones de piezas para uso interno en createRemoteDataAPI
import {
  fetchPiezasList,
  fetchPieza,
  fetchPiezasByFilter,
  createPieza,
  updatePieza,
  deletePieza
} from './piezas';

// Importar funciones de sesiones para uso interno en createRemoteDataAPI
import {
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
const usersCache: Map<string, any> = new Map();
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
        const profesoresMap = new Map<string, any>();
        if (profesorIdsSet.size > 0) {
          try {
            const profesorIdsArray = Array.from(profesorIdsSet);
            // Hacer una única query con .in() para obtener todos los profesores
            const { data: profesoresData, error: profesoresError } = await withAuthErrorHandling(
              supabase
                .from('profiles')
                .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at, nivel, nivel_tecnico, telefono')
                .in('id', profesorIdsArray) as unknown as Promise<any>
            );

            if (!profesoresError && profesoresData && Array.isArray(profesoresData)) {
              // Crear mapa de profesores por ID
              (profesoresData as unknown as DbProfile[]).forEach((prof: DbProfile) => {
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
            .filter((prof: unknown) => {
              const p = prof as DbProfile;
              return !existingIdsSet.has(p.id);
            })
            .map((prof: unknown) => {
              const p = prof as DbProfile;
              const camelProf = safeSnakeToCamel<StudiaUser>(p);

              const email = emailsMap.get(p.id) || camelProf.email;
              const normalized = normalizeSupabaseUser(camelProf, email);

              const originalRole = p.role;
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
      filter: async (filters: Record<string, any>, limit?: number | null) => {
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
      create: async (data): Promise<StudiaUser> => {
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
              throw new Error(`El ID del profesor asignado debe ser un UUID válido. Se recibió: ${profesorId}`);
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
        const originalRole = (data as any).role;
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
      list: async (sort?: string) => {
        let query = supabase.from('bloques').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as DbBloque[] || []).map((b: DbBloque) => {
          const camel = snakeToCamel<Bloque>(b);
          // Fix targetPPMs mapping (snakeToCamel produces targetPpms)
          if ((camel as any).targetPpms) {
            camel.targetPPMs = (camel as any).targetPpms;
            delete (camel as any).targetPpms;
          }
          // Map content (JSONB) to variations - CRITICAL for exercise variations display
          // Also check raw b.content in case snakeToCamel doesn't preserve it
          const rawContent = b.content;
          if (!camel.content && rawContent) {
            camel.content = rawContent;
          }
          if (camel.content && !camel.variations) {
            // Handle both array structure and { variations: [...] } structure
            if (Array.isArray(camel.content)) {
              camel.variations = camel.content;
            } else if ((camel.content as any).variations && Array.isArray((camel.content as any).variations)) {
              camel.variations = (camel.content as any).variations;
            } else {
              camel.variations = [];
            }
          }
          // Also try to use raw content as fallback
          if ((!camel.variations || camel.variations.length === 0) && rawContent) {
            if (Array.isArray(rawContent)) {
              camel.variations = rawContent;
            } else if (rawContent.variations && Array.isArray(rawContent.variations)) {
              camel.variations = rawContent.variations;
            }
          }
          return camel;
        });
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('bloques')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        const camel = snakeToCamel<Bloque>(data);
        // Fix targetPPMs mapping (snakeToCamel produces targetPpms)
        if ((camel as any).targetPpms) {
          camel.targetPPMs = (camel as any).targetPpms;
          delete (camel as any).targetPpms;
        }
        // Map content (JSONB) to variations
        if (camel.content && !camel.variations) {
          if (Array.isArray(camel.content)) {
            camel.variations = camel.content;
          } else if ((camel.content as any).variations && Array.isArray((camel.content as any).variations)) {
            camel.variations = (camel.content as any).variations;
          } else {
            camel.variations = [];
          }
        }
        return camel;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('bloques').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as DbBloque[] || []).map((b: DbBloque) => {
          const camel = snakeToCamel<Bloque>(b);
          // Fix targetPPMs mapping (snakeToCamel produces targetPpms)
          if ((camel as any).targetPpms) {
            camel.targetPPMs = (camel as any).targetPpms;
            delete (camel as any).targetPpms;
          }
          // Map content (JSONB) to variations
          if (camel.content && !camel.variations) {
            // Handle new structure { variations: [...] } or legacy array structure
            if (Array.isArray(camel.content)) {
              camel.variations = camel.content;
            } else if ((camel.content as any).variations && Array.isArray((camel.content as any).variations)) {
              camel.variations = (camel.content as any).variations;
            } else {
              camel.variations = [];
            }
          }
          return camel;
        });
      },
      create: async (data) => {
        // Only send fields that exist in the bloques table schema
        // DB columns: id, nombre, code, tipo, duracion_seg, instrucciones, indicador_logro, 
        // materiales_requeridos, media_links, elementos_ordenados, pieza_ref_id, profesor_id,
        // skill_tags, target_ppms, content
        const allowedFields = new Set([
          'id', 'nombre', 'code', 'tipo', 'duracionSeg', 'instrucciones',
          'indicadorLogro', 'materialesRequeridos', 'mediaLinks', 'elementosOrdenados',
          'piezaRefId', 'profesorId', 'skillTags', 'targetPPMs', 'content'
        ]);

        // Get current user ID for profesor_id (required field)
        let profesorId = (data as any).profesorId;
        if (!profesorId) {
          try {
            const user = await getCachedAuthUser();
            profesorId = user?.id;
          } catch (e) {
            console.warn('[remoteDataAPI.bloques.create] Could not get current user for profesor_id');
          }
        }

        if (!profesorId) {
          throw new Error('profesor_id es requerido para crear un bloque');
        }

        // Generate ID
        const bloqueId = data.id || generateId('bloque');

        // Filter to allowed fields only
        const filteredData: any = {
          id: bloqueId,
          profesorId: profesorId,
        };

        for (const [key, value] of Object.entries(data)) {
          if (key === 'id' || key === 'profesorId') continue; // Already handled
          if (allowedFields.has(key)) {
            filteredData[key] = value;
          } else {
            // Silently skip non-DB fields (metodo, variations, skillTags, targetPPMs, etc.)
            console.log(`[remoteDataAPI.bloques.create] Field '${key}' not in DB schema, skipping`);
          }
        }

        const snakeData = camelToSnake(filteredData);

        // Fix targetPPMs mapping (camelToSnake produces target_pp_ms)
        if (snakeData.target_pp_ms) {
          snakeData.target_ppms = snakeData.target_pp_ms;
          delete snakeData.target_pp_ms;
        } else if (filteredData.targetPPMs) {
          snakeData.target_ppms = filteredData.targetPPMs;
        }

        const { data: result, error } = await supabase
          .from('bloques')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<Bloque>(result);
      },
      update: async (id: string, updates: Partial<Bloque>) => {
        // Only send fields that exist in the bloques table schema
        // DB columns: id, nombre, code, tipo, duracion_seg, instrucciones, indicador_logro, 
        // materiales_requeridos, media_links, elementos_ordenados, pieza_ref_id, profesor_id,
        // skill_tags, target_ppms, content
        const allowedFields = new Set([
          'nombre', 'code', 'tipo', 'duracionSeg', 'instrucciones',
          'indicadorLogro', 'materialesRequeridos', 'mediaLinks', 'elementosOrdenados',
          'piezaRefId', 'skillTags', 'targetPPMs', 'content'
          // Note: 'metodo', 'variations' are frontend-only (variations mapped to content)
        ]);

        // Filter out fields not in DB schema
        const filteredUpdates: Partial<Bloque> = {};

        // DEBUG: Log what we receive
        console.log('[remoteDataAPI.bloques.update] Received updates:', {
          id,
          indicadorLogro: updates.indicadorLogro,
          allKeys: Object.keys(updates)
        });

        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.has(key)) {
            // @ts-ignore - Valid field check done via allowedFields set
            filteredUpdates[key] = value;
          } else {
            // Silently log non-DB fields (don't spam console with warnings)
            console.log(`[remoteDataAPI.bloques.update] Field '${key}' not in DB schema, skipping`);
          }
        }

        // DEBUG: Log what we're sending
        console.log('[remoteDataAPI.bloques.update] Filtered updates:', filteredUpdates);

        const snakeUpdates = camelToSnake(filteredUpdates);

        // Fix targetPPMs mapping (camelToSnake produces target_pp_ms)
        const record = snakeUpdates as Record<string, unknown>;
        if (record.target_pp_ms) {
          record.target_ppms = record.target_pp_ms;
          delete record.target_pp_ms;
        } else if (filteredUpdates.targetPPMs) {
          record.target_ppms = filteredUpdates.targetPPMs;
        }

        // DEBUG: Log snake case version
        console.log('[remoteDataAPI.bloques.update] Snake updates:', snakeUpdates);

        const { data, error } = await supabase
          .from('bloques')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[remoteDataAPI] Error al actualizar bloque:', {
            error: error?.message || error,
            code: error?.code,
            details: error?.details,
            id,
          });
          throw error;
        }

        // DEBUG: Log what Supabase returned
        console.log('[remoteDataAPI.bloques.update] Supabase returned:', {
          id: data?.id,
          code: data?.code,
          indicador_logro: data?.indicador_logro,
          success: !!data
        });

        const resultado = snakeToCamel<Bloque>(data);

        return resultado;
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('bloques')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    planes: {
      list: async (sort?: string) => {
        let query = supabase.from('planes').select('*');

        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as any[] || []).map((p: any) => snakeToCamel<Plan>(p));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('planes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<Plan>(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('planes').select('*');

        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as any[] || []).map((p: any) => snakeToCamel<Plan>(p));
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('plan'),
        });
        const { data: result, error } = await supabase
          .from('planes')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<Plan>(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('planes')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return snakeToCamel<Plan>(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('planes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      },
    },
    asignaciones: {
      list: fetchAsignaciones,
      get: fetchAsignacion,
      filter: fetchAsignacionesByFilter,
      create: createAsignacion,
      update: updateAsignacion,
      delete: deleteAsignacion,
    },
    registrosSesion: {
      list: fetchRegistrosSesionList,
      get: fetchRegistroSesion,
      filter: fetchRegistrosSesionByFilter,
      create: createRegistroSesion,
      update: updateRegistroSesion,
      delete: deleteRegistroSesion,
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
        return ((data as any[]) || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
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
      filter: async (filters: Record<string, any>, limit?: number | null) => {
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
        return ((data as any[]) || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: (data as any).id || generateId('registroBloque'),
        });
        const { data: result, error } = await supabase
          .from('registros_bloque')
          .insert(snakeData)
          .select()
          .single();

        if (error) throw error;
        return normalizeISOFields(snakeToCamel<RegistroBloque>(result));
      },
      update: async (id: string, updates: any) => {
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
      bulkCreate: async (data: any[]) => {
        const snakeData = data.map((item: any) => camelToSnake({
          ...item,
          id: item.id || generateId('registroBloque'),
        }));

        const { data: result, error } = await supabase
          .from('registros_bloque')
          .insert(snakeData)
          .select();

        if (error) throw error;
        return (result || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
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
        return ((data as any[]) || []).map((e: any) => snakeToCamel<EventoCalendario>(e));
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
      filter: async (filters: Record<string, any>, limit?: number | null): Promise<EventoCalendario[]> => {
        let query = supabase.from('eventos_calendario').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel<EventoCalendario>(e));
      },
      create: async (data: any): Promise<EventoCalendario> => {
        const snakeData = camelToSnake(data);
        const { data: result, error } = await supabase
          .from('eventos_calendario')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<EventoCalendario>(result);
      },
      update: async (id: string, updates: any): Promise<EventoCalendario> => {
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
        return (data as any[] || []).map((e: any) => snakeToCamel<EvaluacionTecnica>(e));
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
      filter: async (filters: Record<string, any>, limit?: number | null): Promise<EvaluacionTecnica[]> => {
        let query = supabase.from('evaluaciones_tecnicas').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel<EvaluacionTecnica>(e));
      },
      create: async (data): Promise<EvaluacionTecnica> => {
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
      update: async (id: string, updates: any): Promise<EvaluacionTecnica> => {
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
      list: async (sort: string = '-created_at'): Promise<FeedbackSemanal[]> => {
        const raw = await fetchFeedbacksSemanalList(sort);
        return raw.map((f: any) => {
          const camel = snakeToCamel<FeedbackSemanal>(f);
          return normalizeAsignacionISO(camel);
        });
      },
      get: async (id: string) => {
        const raw = await fetchFeedbackSemanal(id);
        if (!raw) return null;
        const camel = snakeToCamel<FeedbackSemanal>(raw);
        return normalizeAsignacionISO(camel);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const snakeFilters: Record<string, any> = {};
        for (const [key, value] of Object.entries(filters)) {
          snakeFilters[toSnakeCase(key)] = value;
        }

        const raw = await fetchFeedbacksSemanalByFilter(snakeFilters, limit);
        return raw.map((f: any) => {
          const camel = snakeToCamel<FeedbackSemanal>(f);
          return normalizeAsignacionISO(camel);
        });
      },
      create: async (data: any) => {
        const snakeData = camelToSnake(data);
        const raw = await createFeedbackSemanal(snakeData);
        const camel = snakeToCamel<FeedbackSemanal>(raw);
        return normalizeAsignacionISO(camel);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        delete snakeUpdates.id;
        const raw = await updateFeedbackSemanal(id, snakeUpdates);
        const camel = snakeToCamel<FeedbackSemanal>(raw);
        return normalizeAsignacionISO(camel);
      },
      delete: async (id: string) => {
        await deleteFeedbackSemanal(id);
        return { success: true };
      }
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
        return ((data as any[]) || []).map((e: any) => snakeToCamel<LevelConfig>(e));
      },
      get: async (id: string): Promise<LevelConfig | null> => {
        // ID is integer level
        const { data, error } = await supabase
          .from('levels_config')
          .select('*')
          .eq('level', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<LevelConfig>(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null): Promise<LevelConfig[]> => {
        let query = supabase.from('levels_config').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel<LevelConfig>(e));
      },
      create: async (data: any): Promise<LevelConfig> => {
        const snakeData = camelToSnake(data);
        const { data: result, error } = await supabase
          .from('levels_config')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<LevelConfig>(result);
      },
      update: async (id: string, updates: any): Promise<LevelConfig> => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('levels_config')
          .update(snakeUpdates)
          .eq('level', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel<LevelConfig>(data);
      },
      delete: async (id: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
          .from('levels_config')
          .delete()
          .eq('level', id);
        if (error) throw error;
        return { success: true };
      },
    },
    levelKeyCriteria: {
      list: async (sort?: string) => {
        let query = supabase.from('level_key_criteria').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('level_key_criteria')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('level_key_criteria').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (data: any) => {
        const snakeData = camelToSnake(data);
        if (snakeData.id && (typeof snakeData.id === 'string' && !snakeData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
          delete snakeData.id;
        }
        const { data: result, error } = await supabase
          .from('level_key_criteria')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('level_key_criteria')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('level_key_criteria')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
    },
    studentCriteriaStatus: {
      list: async (sort?: string) => {
        let query = supabase.from('student_criteria_status').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('student_criteria_status')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('student_criteria_status').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (data: any) => {
        const snakeData = camelToSnake(data);
        if (snakeData.id && (typeof snakeData.id === 'string' && !snakeData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
          delete snakeData.id;
        }
        const { data: result, error } = await supabase
          .from('student_criteria_status')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('student_criteria_status')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('student_criteria_status')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
    },
    studentLevelHistory: {
      list: async (sort?: string) => {
        let query = supabase.from('student_level_history').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('student_level_history')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('student_level_history').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (data: any) => {
        const snakeData = camelToSnake(data);
        if (snakeData.id && (typeof snakeData.id === 'string' && !snakeData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
          delete snakeData.id;
        }
        const { data: result, error } = await supabase
          .from('student_level_history')
          .insert(snakeData)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('student_level_history')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('student_level_history')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      },
    },
    studentXpTotal: {
      list: async (sort?: string) => {
        let query = supabase.from('student_xp_total').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
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
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('student_xp_total').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (item: any) => {
        const snakeItem = camelToSnake(item);
        if (snakeItem.id === undefined) delete snakeItem.id;
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_xp_total')
            .insert(snakeItem)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel(data);
      },
      update: async (id: string, updates: any) => {
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
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
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
      list: async (sort?: string) => {
        let query = supabase.from('student_backpack').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
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
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('student_backpack').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await withAuthErrorHandling(query);
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (item: any) => {
        const snakeItem = camelToSnake(item);
        if (!snakeItem.id) delete snakeItem.id;
        const { data, error } = await withAuthErrorHandling(
          supabase
            .from('student_backpack')
            .insert(snakeItem)
            .select()
            .single()
        );
        if (error) throw error;
        return snakeToCamel(data);
      },
      update: async (id: string, updates: any) => {
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
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
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
      list: async (sort?: string) => {
        let query = supabase.from('media_assets').select('*');
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('media_assets')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('media_assets').select('*');
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        return ((data as any[]) || []).map((e: any) => snakeToCamel(e));
      },
      create: async (input: any) => {
        const snakeInput = camelToSnake(input);

        // Ensure user is set
        if (!snakeInput.created_by) {
          const user = await getCachedAuthUser();
          if (user?.id) snakeInput.created_by = user.id;
        }

        const { data, error } = await supabase
          .from('media_assets')
          .insert(snakeInput)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(data);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('media_assets')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return snakeToCamel(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('media_assets')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { success: true };
      }
    },

    // Implementación de RPCs
    getCalendarSummary: async (startDate: Date, endDate: Date, userId?: string) => {
      const { data, error } = await withAuthErrorHandling(
        supabase.rpc('get_calendar_summary', {
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
          p_user_id: userId || null
        })
      );

      if (error) {
        console.error('[remoteDataAPI] Error en getCalendarSummary:', error);
        throw error;
      }

      // Transformar snake_case a camelCase y normalizar campos
      const raw = data as any;
      return {
        registrosSesion: (raw.registrosSesion || []).map(snakeToCamel).map(normalizeISOFields),
        feedbacksSemanal: (raw.feedbacksSemanal || []).map(snakeToCamel).map(normalizeAsignacionISO),
        asignaciones: (raw.asignaciones || []).map(snakeToCamel).map(normalizeAsignacionISO),
        eventosCalendario: (raw.eventosCalendario || []).map(snakeToCamel)
      };
    },

    getProgressSummary: async (studentId?: string) => {
      const { data, error } = await withAuthErrorHandling(
        supabase.rpc('get_progress_summary', {
          p_student_id: studentId || null
        })
      );

      if (error) {
        console.error('[remoteDataAPI] Error en getProgressSummary:', error);
        throw error;
      }

      const raw = data as any;

      // La RPC ahora devuelve registros_bloque embebidos en cada sesión
      const registrosSesion = (raw.registrosSesion || []).map((session: any) => {
        const normalizedSession = normalizeISOFields(snakeToCamel(session)) as Record<string, any>;
        // Procesar bloques embebidos si existen
        const registrosBloque = (session.registros_bloque || []).map((block: any) =>
          normalizeISOFields(snakeToCamel(block))
        );
        return {
          ...normalizedSession,
          registrosBloque
        };
      });

      return {
        xpTotals: (raw.xpTotals || []).map(snakeToCamel),
        evaluacionesTecnicas: (raw.evaluacionesTecnicas || []).map(snakeToCamel),
        feedbacksSemanal: (raw.feedbacksSemanal || []).map(snakeToCamel).map(normalizeAsignacionISO),
        registrosSesion
      };
    },
    getSeedStats: async () => {
      const { data, error } = await supabase.rpc('get_seed_stats');
      if (error) {
        console.error('[remoteDataAPI] Error en getSeedStats:', error);
        throw error;
      }
      return data as {
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
      };
    }
  };
}

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








