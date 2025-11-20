/**
 * Implementación remota de AppDataAPI
 * 
 * Usa Supabase para proporcionar acceso a datos desde la base de datos remota.
 * Maneja el mapeo entre camelCase (frontend) y snake_case (Supabase).
 */

import type { AppDataAPI } from './appDataAPI';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';
import type {
  StudiaUser,
  Pieza,
  Bloque,
  Plan,
  Asignacion,
  RegistroSesion,
  RegistroBloque,
  FeedbackSemanal,
} from '@/types/domain';

/**
 * Helper para convertir camelCase a snake_case
 * Maneja correctamente siglas como ISO, ID, etc.
 * Ejemplos:
 * - semanaInicioISO -> semana_inicio_iso
 * - userId -> user_id
 * - XMLHttpRequest -> xml_http_request
 */
function toSnakeCase(str: string): string {
  // Procesar de derecha a izquierda para manejar siglas correctamente
  // Primero, separar siglas finales (secuencias de mayúsculas al final)
  // Ej: "semanaInicioISO" -> "semanaInicio_ISO"
  let result = str.replace(/([a-z])([A-Z]+)$/g, '$1_$2');
  
  // Luego, insertar _ antes de mayúsculas que siguen a minúsculas o números
  // Esto maneja casos como "semanaInicio" -> "semana_Inicio"
  result = result.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  
  // Insertar _ antes de mayúsculas que siguen a otras mayúsculas seguidas de minúsculas
  // (ej: "HTTP" seguido de "Request" en "HTTPRequest")
  result = result.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
  
  // Convertir todo a minúsculas
  return result.toLowerCase();
}

/**
 * Helper para convertir snake_case a camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normaliza campos ISO en objetos RegistroSesion y RegistroBloque
 * Convierte inicioIso → inicioISO y finIso → finISO
 */
function normalizeISOFields<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeISOFields(item)) as T;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: any = { ...obj };
  
  // Normalizar campos ISO específicos
  if ('inicioIso' in result && !('inicioISO' in result)) {
    result.inicioISO = result.inicioIso;
    delete result.inicioIso;
  }
  if ('finIso' in result && !('finISO' in result)) {
    result.finISO = result.finIso;
    delete result.finIso;
  }
  
  // Aplicar recursivamente a propiedades anidadas
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key) && typeof result[key] === 'object') {
      result[key] = normalizeISOFields(result[key]);
    }
  }
  
  return result as T;
}

/**
 * Normaliza campos ISO en objetos Asignacion y FeedbackSemanal
 * Convierte semanaInicioIso → semanaInicioISO
 */
function normalizeAsignacionISO<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeAsignacionISO(item)) as T;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: any = { ...obj };
  
  // Normalizar semanaInicioIso → semanaInicioISO
  if ('semanaInicioIso' in result && !('semanaInicioISO' in result)) {
    result.semanaInicioISO = result.semanaInicioIso;
    delete result.semanaInicioIso;
  }
  
  // Aplicar recursivamente a propiedades anidadas
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key) && typeof result[key] === 'object') {
      result[key] = normalizeAsignacionISO(result[key]);
    }
  }
  
  return result as T;
}

/**
 * Convierte un objeto de snake_case a camelCase recursivamente
 */
function snakeToCamel<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as T;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = snakeToCamel(obj[key]);
    }
  }
  return result as T;
}

/**
 * Convierte un objeto de camelCase a snake_case recursivamente
 */
function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item));
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = camelToSnake(obj[key]);
    }
  }
  return result;
}

/**
 * Helper para generar un ID único (compatible con formato local)
 */
function generateId(prefix: string = 'item'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Resuelve el plan para una asignación usando la arquitectura híbrida:
 * - Si plan_adaptado existe → usar plan_adaptado (snapshot adaptado)
 * - Si no, y plan_id existe → buscar en planesList o cargar desde BD (referencia)
 * - Si no, y plan existe (legacy) → usar plan (compatibilidad)
 */
async function resolvePlanForAsignacion(
  asignacion: any, 
  planesList?: Plan[]
): Promise<Plan | null> {
  // Prioridad 1: plan_adaptado (snapshot adaptado)
  if (asignacion.planAdaptado) {
    return asignacion.planAdaptado;
  }
  
  // Prioridad 2: plan_id (referencia a plantilla)
  if (asignacion.planId) {
    // Si tenemos la lista de planes, buscar ahí primero
    if (planesList) {
      const plan = planesList.find(p => p.id === asignacion.planId);
      if (plan) return plan;
    }
    
    // Si no está en la lista, cargar desde BD
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('id', asignacion.planId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return snakeToCamel<Plan>(data);
    } catch (error) {
      console.warn('[resolvePlanForAsignacion] Error al cargar plan por ID:', error);
      return null;
    }
  }
  
  // Prioridad 3: plan (legacy, compatibilidad)
  if (asignacion.plan) {
    return asignacion.plan;
  }
  
  return null;
}

/**
 * Helper para serializar campos JSON específicos antes de enviar a Supabase
 */
function serializeJsonFields(data: any, jsonFields: string[]): any {
  const result = { ...data };
  for (const field of jsonFields) {
    if (result[field] && (typeof result[field] === 'object' || Array.isArray(result[field]))) {
      // Serializar objetos y arrays a string JSON
      result[field] = JSON.stringify(result[field]);
    }
  }
  return result;
}

/**
 * Helper para deserializar campos JSON específicos después de leer de Supabase
 */
function deserializeJsonFields(data: any, jsonFields: string[]): any {
  const result = { ...data };
  for (const field of jsonFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch (e) {
        // Mantener como string si falla el parse
      }
    }
  }
  return result;
}

/**
 * Normaliza un usuario de Supabase para que tenga los campos esperados por el código
 * Mapea: role → rolPersonalizado, fullName → nombreCompleto, y normaliza nombreCompleto
 */
function normalizeSupabaseUser(user: any, email?: string): any {
  if (!user) return user;

  // Después de snakeToCamel, los campos están en camelCase:
  // - role → role (no cambia porque no tiene guiones bajos)
  // - full_name → fullName
  // - profesor_asignado_id → profesorAsignadoId
  // - is_active → isActive

  // Mapear role → rolPersonalizado
  // El campo 'role' viene directamente de Supabase y no se modifica por snakeToCamel
  // Verificar tanto 'role' (directo de Supabase) como 'rolPersonalizado' (ya mapeado)
  const roleValue = user.role || user.rolPersonalizado;
  const rolPersonalizado = (roleValue && ['ADMIN', 'PROF', 'ESTU'].includes(roleValue.toUpperCase())) 
    ? roleValue.toUpperCase() 
    : 'ESTU';

  // Obtener full_name (puede estar como fullName o full_name después de snakeToCamel)
  const fullName = user.fullName || user.full_name || '';

  // Generar nombreCompleto desde full_name si está disponible
  let nombreCompleto = '';
  if (fullName && fullName.trim()) {
    nombreCompleto = fullName.trim();
  } else if (user.email) {
    // Intentar derivar del email
    const emailStr = String(user.email);
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
  } else if (email) {
    // Usar el email proporcionado como parámetro
    const emailStr = String(email);
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
    // Último recurso
    nombreCompleto = `Usuario ${user.id || 'Nuevo'}`;
  }

  // Obtener profesor_asignado_id - puede estar como profesorAsignadoId (después de snakeToCamel) 
  // o como profesor_asignado_id (directo de Supabase)
  let profesorAsignadoId = user.profesorAsignadoId || user.profesor_asignado_id || null;
  
  // Validar que profesorAsignadoId sea un UUID válido (en Supabase debe ser UUID)
  // Si no es UUID válido, establecer como null para evitar errores
  if (profesorAsignadoId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(profesorAsignadoId).trim())) {
      // Si no es un UUID válido (por ejemplo, es un ID de MongoDB), ignorarlo
      // Esto puede pasar si hay datos locales mezclados con datos de Supabase
      profesorAsignadoId = null;
    }
  }
  
  // Asegurar que full_name siempre tenga un valor si nombreCompleto está disponible
  // full_name es la fuente de verdad, pero si no existe en la BD, usar nombreCompleto generado
  let finalFullName = (fullName && fullName.trim()) || (nombreCompleto && nombreCompleto.trim()) || '';
  
  // Si aún está vacío y hay email, usar email como último recurso para full_name
  if (!finalFullName && email) {
    const emailStr = String(email);
    if (emailStr.includes('@')) {
      const parteLocal = emailStr.split('@')[0];
      const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
      if (parteLocal && !isLikelyId) {
        finalFullName = parteLocal
          .replace(/[._+-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim() || emailStr;
      } else {
        finalFullName = emailStr;
      }
    } else {
      finalFullName = emailStr;
    }
  }
  
  // Si nombreCompleto está vacío pero finalFullName tiene valor, sincronizar
  if (!nombreCompleto && finalFullName) {
    nombreCompleto = finalFullName;
  }
  
  // Retornar usuario normalizado con todos los campos necesarios
  return {
    ...user,
    // Campos mapeados
    rolPersonalizado: rolPersonalizado,
    nombreCompleto: nombreCompleto,
    full_name: finalFullName, // full_name es la fuente de verdad - usar valor de BD o fallback
    // Email: usar el proporcionado o el que ya está en el usuario
    email: email || user.email || '',
    // Profesor asignado - asegurar que esté en camelCase y sea UUID válido
    profesorAsignadoId: profesorAsignadoId,
    // Estado (mapear isActive a estado si es necesario)
    estado: user.isActive !== false ? 'activo' : 'inactivo',
    isActive: user.isActive !== false,
  };
}

/**
 * Wrapper para interceptar errores de autenticación en llamadas a Supabase
 * Detecta errores 401/403 y dispara un evento personalizado para que AuthProvider pueda reaccionar
 */
async function withAuthErrorHandling<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await promise;
    
    // Si hay error y es de autenticación, disparar evento
    if (result.error && isAuthError(result.error)) {
      // Disparar evento personalizado para que AuthProvider lo escuche
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error: result.error } 
      }));
    }
    
    return result;
  } catch (error: any) {
    // Si es un error de autenticación, disparar evento
    if (isAuthError(error)) {
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

/**
 * Wrapper para operaciones que pueden lanzar errores directamente
 */
async function wrapSupabaseCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (isAuthError(error)) {
      // Disparar evento personalizado para que AuthProvider lo escuche
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

/**
 * Obtiene emails de usuarios desde auth.users usando Admin API o función SQL
 * Por ahora, retornamos un mapa vacío ya que no tenemos acceso directo a auth.users
 * desde el cliente. Los emails se obtendrán del usuario autenticado cuando coincidan.
 * 
 * Para obtener emails de todos los usuarios, se recomienda:
 * 1. Crear una función SQL en Supabase que haga JOIN entre profiles y auth.users
 * 2. O almacenar email también en profiles (duplicación pero funcional)
 * 3. O usar el Admin API de Supabase con service_role key
 */
async function getEmailsForUsers(userIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  
  if (!userIds || userIds.length === 0) return emailMap;

  // Por ahora, solo podemos obtener el email del usuario autenticado
  // Para obtener emails de todos los usuarios, se requiere una función SQL
  // o usar el Admin API con permisos service_role
  try {
    const { data: { user } } = await wrapSupabaseCall(() => supabase.auth.getUser());
    if (user && user.id && userIds.includes(user.id)) {
      emailMap.set(user.id, user.email || '');
    }
  } catch (error) {
    // Ignorar si no hay usuario autenticado
  }

  return emailMap;
}

/**
 * Implementación remota de AppDataAPI
 */
export function createRemoteDataAPI(): AppDataAPI {
  return {
    usuarios: {
      list: async () => {
        // Obtener perfiles desde Supabase - INCLUIR EXPLÍCITAMENTE el campo role
        const { data, error } = await withAuthErrorHandling(
          supabase
          .from('profiles')
            .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
        );
        
        if (error) {
          console.error('[remoteDataAPI] Error al leer profiles:', {
            error: error?.message || error,
            code: error?.code,
            status: error?.status,
            details: error?.details,
          });
          throw error;
        }
        
        // Obtener email e ID del usuario autenticado si existe (para comparación)
        let currentUserEmail: string | null = null;
        let currentUserId: string | null = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentUserEmail = user?.email || null;
          currentUserId = user?.id || null;
        } catch (e) {
          // Ignorar si no hay usuario autenticado
        }
        
        // Obtener emails usando función SQL si está disponible, o usar el usuario autenticado
        let emailsMap = new Map<string, string>();
        try {
          const userIds = (data || []).map((u: any) => u.id);
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
        
        // Normalizar usuarios
        return (data || []).map((u: any) => {
          // Preservar el campo 'role' ANTES de snakeToCamel (es crítico)
          const originalRole = u.role;
          
          const camelUser = snakeToCamel<StudiaUser>(u);
          
          // Asegurar que el campo 'role' se preserve explícitamente
          if (originalRole && !camelUser.role) {
            camelUser.role = originalRole;
          }
          
          // Priorizar: email del mapeo, luego del usuario mismo
          const email = emailsMap.get(u.id) || camelUser.email;
          
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
      get: async (id: string) => {
        const { data, error } = await withAuthErrorHandling(
          supabase
          .from('profiles')
          .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
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
        
        // Preservar el campo 'role' ANTES de snakeToCamel
        const originalRole = data.role;
        
        const camelUser = snakeToCamel<StudiaUser>(data);
        
        // Asegurar que el campo 'role' se preserve
        if (originalRole && !camelUser.role) {
          camelUser.role = originalRole;
        }
        
        // Intentar obtener email del usuario autenticado si coincide
        let email: string | undefined = undefined;
        try {
          const { data: { user } } = await wrapSupabaseCall(() => supabase.auth.getUser());
          if (user && user.id === id) {
            email = user.email || undefined;
          }
        } catch (e) {
          // Ignorar si no hay usuario autenticado
        }
        
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
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('profiles').select('*');
        
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
          const { data: { user } } = await wrapSupabaseCall(() => supabase.auth.getUser());
          currentUserEmail = user?.email || null;
          currentUserId = user?.id || null;
        } catch (e) {
          // Ignorar si no hay usuario autenticado
        }
        
        return (data || []).map((u: any) => {
          // Preservar el campo 'role' ANTES de snakeToCamel
          const originalRole = u.role;
          
          const camelUser = snakeToCamel<StudiaUser>(u);
          
          // Asegurar que el campo 'role' se preserve
          if (originalRole && !camelUser.role) {
            camelUser.role = originalRole;
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
      create: async (data) => {
        const snakeData = camelToSnake(data);
        const { data: result, error } = await withAuthErrorHandling(
          supabase
          .from('profiles')
          .insert(snakeData)
          .select()
            .single()
        );
        
        if (error) throw error;
        
        const camelUser = snakeToCamel<StudiaUser>(result);
        return normalizeSupabaseUser(camelUser, data.email);
      },
      update: async (id: string, updates: any) => {
        // Mapear campos del frontend a campos de Supabase
        const supabaseUpdates: any = {};
        
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
            status: error?.status,
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
            const { data: { user: currentUser } } = await wrapSupabaseCall(() => supabase.auth.getUser());
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
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[remoteDataAPI] No se pudo sincronizar full_name con auth.users:', authError);
                }
              }
            }
          } catch (syncError) {
            // No es crítico si falla la sincronización con auth.users
            // El nombre principal está en profiles que es la fuente de verdad
            if (process.env.NODE_ENV === 'development') {
              console.warn('[remoteDataAPI] Error al sincronizar con auth.users:', syncError);
            }
          }
        }
        
        // Preservar el campo 'role' ANTES de snakeToCamel
        const originalRole = data.role;
        
        const camelUser = snakeToCamel<StudiaUser>(data);
        
        // Asegurar que el campo 'role' se preserve
        if (originalRole && !camelUser.role) {
          camelUser.role = originalRole;
        }
        
        // Intentar obtener email del usuario autenticado si coincide
        let email: string | undefined = updates.email;
        if (!email) {
          try {
            const { data: { user } } = await wrapSupabaseCall(() => supabase.auth.getUser());
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
        if (originalRole) {
          const roleUpper = String(originalRole).toUpperCase().trim();
          if (['ADMIN', 'PROF', 'ESTU'].includes(roleUpper)) {
            normalized.rolPersonalizado = roleUpper;
          }
        }
        
        return normalized;
      },
      delete: async (id: string) => {
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
      list: async (sort?: string) => {
        let query = supabase.from('piezas').select('*');
        
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((p: any) => snakeToCamel<Pieza>(p));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('piezas')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return snakeToCamel<Pieza>(data);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('piezas').select('*');
        
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((p: any) => snakeToCamel<Pieza>(p));
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('pieza'),
        });
        const { data: result, error } = await supabase
          .from('piezas')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<Pieza>(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('piezas')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<Pieza>(data);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('piezas')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      },
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
        return (data || []).map((b: any) => snakeToCamel<Bloque>(b));
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
        return snakeToCamel<Bloque>(data);
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
        return (data || []).map((b: any) => snakeToCamel<Bloque>(b));
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('bloque'),
        });
        const { data: result, error } = await supabase
          .from('bloques')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<Bloque>(result);
      },
      update: async (id: string, updates: any) => {
        // Debug: Verificar mediaLinks antes de convertir
        if (process.env.NODE_ENV === 'development' && updates.mediaLinks) {
          console.log('[remoteDataAPI] Actualizando bloque con mediaLinks:', {
            id,
            mediaLinks_original: updates.mediaLinks,
            updates_completo: updates
          });
        }
        
        const snakeUpdates = camelToSnake(updates);
        
        // Debug: Verificar conversión a snake_case
        if (process.env.NODE_ENV === 'development' && updates.mediaLinks) {
          console.log('[remoteDataAPI] Después de camelToSnake:', {
            media_links: snakeUpdates.media_links,
            snakeUpdates_completo: snakeUpdates
          });
        }
        
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
            status: error?.status,
            id,
          });
          throw error;
        }
        
        const resultado = snakeToCamel<Bloque>(data);
        
        // Debug: Verificar resultado
        if (process.env.NODE_ENV === 'development' && updates.mediaLinks) {
          console.log('[remoteDataAPI] Bloque actualizado:', {
            id: resultado.id,
            code: resultado.code,
            mediaLinks_guardado: resultado.mediaLinks
          });
        }
        
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
        return (data || []).map((p: any) => snakeToCamel<Plan>(p));
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
        return (data || []).map((p: any) => snakeToCamel<Plan>(p));
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
      list: async (sort?: string) => {
        let query = supabase.from('asignaciones').select('*');
        
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Cargar todos los planes necesarios de una vez para eficiencia
        const asignacionesParsed = (data || []).map((a: any) => {
          const parsed = snakeToCamel<Asignacion>(a);
          return normalizeAsignacionISO(parsed);
        });
        
        // Obtener todos los planIds únicos que necesitamos cargar
        const planIdsNecesarios = new Set<string>();
        asignacionesParsed.forEach((a: any) => {
          if (a.planId && !a.planAdaptado && !a.plan) {
            planIdsNecesarios.add(a.planId);
          }
        });
        
        // Cargar todos los planes necesarios
        let planesList: Plan[] = [];
        if (planIdsNecesarios.size > 0) {
          const { data: planesData, error: planesError } = await supabase
            .from('planes')
            .select('*')
            .in('id', Array.from(planIdsNecesarios));
          
          if (!planesError && planesData) {
            planesList = planesData.map((p: any) => snakeToCamel<Plan>(p));
          }
        }
        
        // Resolver planes para cada asignación
        const asignacionesResueltas = await Promise.all(
          asignacionesParsed.map(async (a: any) => {
            const plan = await resolvePlanForAsignacion(a, planesList);
            return {
              ...deserializeJsonFields(a, ['planAdaptado', 'piezaSnapshot']),
              plan: plan || a.plan || null, // Asegurar que siempre hay un plan
            };
          })
        );
        
        return asignacionesResueltas;
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('asignaciones')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        
        // Deserializar campos JSON después de leer
        const parsed = snakeToCamel<Asignacion>(data);
        const normalized = normalizeAsignacionISO(parsed);
        const deserialized = deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);
        
        // Resolver el plan
        const plan = await resolvePlanForAsignacion(deserialized);
        
        return {
          ...deserialized,
          plan: plan || deserialized.plan || null,
        };
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('asignaciones').select('*');
        
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Cargar todos los planes necesarios de una vez para eficiencia
        const asignacionesParsed = (data || []).map((a: any) => {
          const parsed = snakeToCamel<Asignacion>(a);
          return normalizeAsignacionISO(parsed);
        });
        
        // Obtener todos los planIds únicos que necesitamos cargar
        const planIdsNecesarios = new Set<string>();
        asignacionesParsed.forEach((a: any) => {
          if (a.planId && !a.planAdaptado && !a.plan) {
            planIdsNecesarios.add(a.planId);
          }
        });
        
        // Cargar todos los planes necesarios
        let planesList: Plan[] = [];
        if (planIdsNecesarios.size > 0) {
          const { data: planesData, error: planesError } = await supabase
            .from('planes')
            .select('*')
            .in('id', Array.from(planIdsNecesarios));
          
          if (!planesError && planesData) {
            planesList = planesData.map((p: any) => snakeToCamel<Plan>(p));
          }
        }
        
        // Resolver planes para cada asignación
        const asignacionesResueltas = await Promise.all(
          asignacionesParsed.map(async (a: any) => {
            const plan = await resolvePlanForAsignacion(a, planesList);
            return {
              ...deserializeJsonFields(a, ['planAdaptado', 'piezaSnapshot']),
              plan: plan || a.plan || null,
            };
          })
        );
        
        return asignacionesResueltas;
      },
      create: async (data) => {
        // Arquitectura híbrida: soportar planId (referencia) o plan/planAdaptado (snapshot)
        const planIdValue = data.planId;
        const planValue = data.plan || data.planAdaptado; // plan es legacy, planAdaptado es nuevo
        const piezaSnapshotValue = data.piezaSnapshot;
        
        const dataWithoutJson = { ...data };
        delete dataWithoutJson.plan;
        delete dataWithoutJson.planAdaptado;
        delete dataWithoutJson.planId;
        delete dataWithoutJson.piezaSnapshot;
        
        const snakeData = camelToSnake({
          ...dataWithoutJson,
          id: data.id || generateId('asignacion'),
        });
        
        // Lógica híbrida:
        // - Si planId existe: usar referencia (plan_id = planId, plan_adaptado = NULL)
        // - Si plan/planAdaptado existe pero no planId: usar snapshot (plan_adaptado = plan, plan_id = NULL)
        // - Si ambos existen: priorizar planId (referencia), planAdaptado como backup
        if (planIdValue) {
          // Usar referencia
          snakeData.plan_id = planIdValue;
          snakeData.plan_adaptado = null;
        } else if (planValue) {
          // Usar snapshot
          snakeData.plan_adaptado = planValue;
          snakeData.plan_id = null;
        }
        // Si no hay ninguno, el constraint de la BD fallará (correcto)
        
        if (piezaSnapshotValue) {
          snakeData.pieza_snapshot = piezaSnapshotValue;
        }
        
        const { data: result, error } = await supabase
          .from('asignaciones')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) {
          console.error('[remoteDataAPI] Error al crear asignación:', {
            error: error?.message || error,
            code: error?.code,
            status: error?.status,
            details: error?.details,
          });
          throw error;
        }
        
        // Deserializar y resolver el plan
        const parsed = snakeToCamel<Asignacion>(result);
        const normalized = normalizeAsignacionISO(parsed);
        const deserialized = deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);
        
        // Resolver el plan para retornarlo
        const plan = await resolvePlanForAsignacion(deserialized);
        
        return {
          ...deserialized,
          plan: plan || deserialized.plan || null,
        };
      },
      update: async (id: string, updates: any) => {
        // Arquitectura híbrida: permitir actualizar planAdaptado o planId
        // Manejar campo legacy 'plan' para compatibilidad
        if (updates.plan !== undefined && updates.planAdaptado === undefined) {
          // Si se envía 'plan' (legacy), convertirlo a planAdaptado
          updates.planAdaptado = updates.plan;
          delete updates.plan;
        }
        
        // Extraer campos especiales antes de camelToSnake
        const planIdValue = updates.planId;
        const planAdaptadoValue = updates.planAdaptado;
        const piezaSnapshotValue = updates.piezaSnapshot;
        
        const updatesWithoutJson = { ...updates };
        delete updatesWithoutJson.planId;
        delete updatesWithoutJson.planAdaptado;
        delete updatesWithoutJson.plan; // Legacy
        delete updatesWithoutJson.piezaSnapshot;
        
        // Campos permitidos en update
        const camposPermitidos = new Set([
          'notas', 'foco', 'estado', 'semanaInicioISO', 'semana_inicio_iso',
          'piezaId', 'pieza_id', 'piezaSnapshot', 'pieza_snapshot',
          'profesorId', 'profesor_id', 'alumnoId', 'alumno_id',
          'planId', 'plan_id', 'planAdaptado', 'plan_adaptado',
        ]);
        
        const camposActualizados = Object.keys(updatesWithoutJson);
        const camposNoPermitidos = camposActualizados.filter(campo => {
          const campoCamel = camelToSnake({ [campo]: '' });
          const campoSnake = Object.keys(campoCamel)[0];
          return !camposPermitidos.has(campo) && !camposPermitidos.has(campoSnake);
        });
        
        if (camposNoPermitidos.length > 0) {
          const errorMsg = `Campos no permitidos en actualización de asignación: ${camposNoPermitidos.join(', ')}. Solo se pueden actualizar: notas, foco, estado, semanaInicioISO, piezaId, planId, planAdaptado (y piezaSnapshot si piezaId cambia).`;
          console.warn('[remoteDataAPI]', errorMsg);
          if (process.env.NODE_ENV === 'development') {
            console.warn('[remoteDataAPI] Campos eliminados del update:', camposNoPermitidos);
          }
          camposNoPermitidos.forEach(campo => delete updatesWithoutJson[campo]);
        }
        
        const snakeUpdates = camelToSnake(updatesWithoutJson);
        
        // Manejar planId y planAdaptado
        // Si se actualiza planAdaptado: establecer plan_id = NULL (ya no usa referencia)
        // Si se actualiza planId: establecer plan_adaptado = NULL (vuelve a usar referencia)
        // IMPORTANTE: No establecer ambos a null al mismo tiempo (violaría el constraint)
        if (planAdaptadoValue !== undefined) {
          snakeUpdates.plan_adaptado = planAdaptadoValue;
          // Solo establecer plan_id a null si realmente estamos actualizando plan_adaptado
          // No tocar plan_id si no se está actualizando explícitamente
          if (planIdValue === undefined) {
            snakeUpdates.plan_id = null; // Ya no usa referencia
          }
        }
        
        if (planIdValue !== undefined) {
          snakeUpdates.plan_id = planIdValue;
          // Solo establecer plan_adaptado a null si realmente estamos actualizando planId
          // No tocar plan_adaptado si no se está actualizando explícitamente
          if (planAdaptadoValue === undefined) {
            snakeUpdates.plan_adaptado = null; // Vuelve a usar referencia
          }
        }
        
        if (piezaSnapshotValue !== undefined) {
          snakeUpdates.pieza_snapshot = piezaSnapshotValue;
        }
        
        // Validar que no esté vacío
        if (Object.keys(snakeUpdates).length === 0) {
          throw new Error('No se pueden actualizar asignaciones con un objeto vacío. Debe incluir al menos un campo válido.');
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[remoteDataAPI] Actualizando asignación:', {
            id,
            camposActualizados: Object.keys(snakeUpdates),
            incluyePlanId: planIdValue !== undefined,
            incluyePlanAdaptado: planAdaptadoValue !== undefined,
            incluyePiezaSnapshot: piezaSnapshotValue !== undefined,
          });
        }
        
        const { data, error } = await supabase
          .from('asignaciones')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          const errorContext = {
            error: error?.message || error,
            code: error?.code,
            status: error?.status,
            details: error?.details,
            id,
          };
          
          console.error('[remoteDataAPI] Error al actualizar asignación:', errorContext);
          
          // Mejorar mensajes de error específicos
          if (error.code === 'PGRST204' || error.code === '406') {
            const errorMsg = 'Error 406 (Not Acceptable): El servidor rechazó la actualización. Verifica que los campos enviados sean válidos y modificables.';
            throw new Error(errorMsg);
          }
          if (error.code === 'PGRST116') {
            // Error: no se encontró la fila o no se pudo devolver
            const errorMsg = 'Error: No se pudo actualizar la asignación. Verifica que el ID sea válido y que tengas permisos para actualizarla.';
            throw new Error(errorMsg);
          }
          if (error.code === 'PGRST301' || error.code === '23503') {
            const errorMsg = 'Error de integridad referencial: Verifica que las referencias (alumnoId, profesorId, piezaId, planId) existan en la base de datos.';
            throw new Error(errorMsg);
          }
          throw error;
        }
        
        // Deserializar y resolver el plan
        const parsed = snakeToCamel<Asignacion>(data);
        const normalized = normalizeAsignacionISO(parsed);
        const deserialized = deserializeJsonFields(normalized, ['planAdaptado', 'piezaSnapshot']);
        
        // Resolver el plan
        const plan = await resolvePlanForAsignacion(deserialized);
        
        return {
          ...deserialized,
          plan: plan || deserialized.plan || null,
        };
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('asignaciones')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      },
    },
    registrosSesion: {
      list: async (sort?: string) => {
        let query = supabase.from('registros_sesion').select('*');
        
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroSesion>(r)));
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('registros_sesion')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        return normalizeISOFields(snakeToCamel<RegistroSesion>(data));
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('registros_sesion').select('*');
        
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroSesion>(r)));
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('registroSesion'),
        });
        const { data: result, error } = await supabase
          .from('registros_sesion')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        return normalizeISOFields(snakeToCamel<RegistroSesion>(result));
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('registros_sesion')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return normalizeISOFields(snakeToCamel<RegistroSesion>(data));
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('registros_sesion')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      },
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
        return (data || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
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
        return (data || []).map((r: any) => normalizeISOFields(snakeToCamel<RegistroBloque>(r)));
      },
      create: async (data) => {
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
      delete: async (id: string) => {
        const { error } = await supabase
          .from('registros_bloque')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      },
    },
    feedbacksSemanal: {
      list: async (sort?: string) => {
        let query = supabase.from('feedbacks_semanal').select('*');
        
        if (sort) {
          const direction = sort.startsWith('-') ? 'desc' : 'asc';
          const field = sort.startsWith('-') ? sort.slice(1) : sort;
          const snakeField = toSnakeCase(field);
          query = query.order(snakeField, { ascending: direction === 'asc' });
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((f: any) => {
          const parsed = snakeToCamel<FeedbackSemanal>(f);
          return normalizeAsignacionISO<FeedbackSemanal>(parsed);
        });
      },
      get: async (id: string) => {
        const { data, error } = await supabase
          .from('feedbacks_semanal')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }
        const parsed = snakeToCamel<FeedbackSemanal>(data);
        return normalizeAsignacionISO<FeedbackSemanal>(parsed);
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        let query = supabase.from('feedbacks_semanal').select('*');
        
        for (const [key, value] of Object.entries(filters)) {
          const snakeKey = toSnakeCase(key);
          query = query.eq(snakeKey, value);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((f: any) => {
          const parsed = snakeToCamel<FeedbackSemanal>(f);
          return normalizeAsignacionISO<FeedbackSemanal>(parsed);
        });
      },
      create: async (data) => {
        const snakeData = camelToSnake({
          ...data,
          id: data.id || generateId('feedback'),
        });
        const { data: result, error } = await supabase
          .from('feedbacks_semanal')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        const parsed = snakeToCamel<FeedbackSemanal>(result);
        return normalizeAsignacionISO<FeedbackSemanal>(parsed);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('feedbacks_semanal')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        const parsed = snakeToCamel<FeedbackSemanal>(data);
        return normalizeAsignacionISO<FeedbackSemanal>(parsed);
      },
      delete: async (id: string) => {
        const { error } = await supabase
          .from('feedbacks_semanal')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return { success: true };
      },
    },
  };
}

