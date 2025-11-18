/**
 * Implementación remota de AppDataAPI
 * 
 * Usa Supabase para proporcionar acceso a datos desde la base de datos remota.
 * Maneja el mapeo entre camelCase (frontend) y snake_case (Supabase).
 */

import type { AppDataAPI } from './appDataAPI';
import { supabase } from '@/lib/supabaseClient';
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

  // Retornar usuario normalizado con todos los campos necesarios
  return {
    ...user,
    // Campos mapeados
    rolPersonalizado: rolPersonalizado,
    nombreCompleto: nombreCompleto,
    full_name: fullName || nombreCompleto, // Mantener full_name
    // Email: usar el proporcionado o el que ya está en el usuario
    email: email || user.email || '',
    // Profesor asignado (ya está en camelCase como profesorAsignadoId)
    profesorAsignadoId: user.profesorAsignadoId || null,
    // Estado (mapear isActive a estado si es necesario)
    estado: user.isActive !== false ? 'activo' : 'inactivo',
    isActive: user.isActive !== false,
  };
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
    const { data: { user } } = await supabase.auth.getUser();
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
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at');
        
        if (error) {
          console.error('❌ Error al leer profiles:', error);
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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null; // No encontrado
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
          const { data: { user } } = await supabase.auth.getUser();
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
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Obtener email e ID del usuario autenticado si existe
        let currentUserEmail: string | null = null;
        let currentUserId: string | null = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
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
        const { data: result, error } = await supabase
          .from('profiles')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        
        const camelUser = snakeToCamel<StudiaUser>(result);
        return normalizeSupabaseUser(camelUser, data.email);
      },
      update: async (id: string, updates: any) => {
        // Mapear campos del frontend a campos de Supabase
        const supabaseUpdates: any = {};
        
        // Mapear nombreCompleto → full_name
        if (updates.nombreCompleto !== undefined) {
          supabaseUpdates.full_name = updates.nombreCompleto;
        }
        
        // Mapear rolPersonalizado → role
        if (updates.rolPersonalizado !== undefined) {
          supabaseUpdates.role = updates.rolPersonalizado.toUpperCase();
        }
        
        // Mapear profesorAsignadoId → profesor_asignado_id
        if (updates.profesorAsignadoId !== undefined) {
          supabaseUpdates.profesor_asignado_id = updates.profesorAsignadoId || null;
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
        
        const { data, error } = await supabase
          .from('profiles')
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error al actualizar usuario:', error);
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
        let email: string | undefined = updates.email;
        if (!email) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
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
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        
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
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('bloques')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<Bloque>(data);
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
        // Deserializar campos JSON después de leer
        return (data || []).map((a: any) => {
          const parsed = snakeToCamel<Asignacion>(a);
          return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
        });
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
        return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
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
        // Deserializar campos JSON después de leer
        return (data || []).map((a: any) => {
          const parsed = snakeToCamel<Asignacion>(a);
          return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
        });
      },
      create: async (data) => {
        // Para campos JSONB, Supabase acepta objetos directamente, pero necesitamos
        // convertirlos a snake_case sin serializar a string primero
        // Extraer campos JSON antes de camelToSnake para manejarlos por separado
        const planValue = data.plan;
        const piezaSnapshotValue = data.piezaSnapshot;
        const dataWithoutJson = { ...data };
        delete dataWithoutJson.plan;
        delete dataWithoutJson.piezaSnapshot;
        
        const snakeData = camelToSnake({
          ...dataWithoutJson,
          id: data.id || generateId('asignacion'),
        });
        
        // Agregar campos JSONB directamente como objetos (Supabase los maneja automáticamente)
        if (planValue) {
          snakeData.plan = planValue; // Mantener como objeto, Supabase lo serializa internamente
        }
        if (piezaSnapshotValue) {
          snakeData.pieza_snapshot = piezaSnapshotValue; // Convertir nombre a snake_case
        }
        
        const { data: result, error } = await supabase
          .from('asignaciones')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) {
          console.error('Error de Supabase al crear asignación:', error);
          throw error;
        }
        
        // Deserializar campos JSON después de leer (por si acaso vienen como strings)
        const parsed = snakeToCamel<Asignacion>(result);
        return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
      },
      update: async (id: string, updates: any) => {
        // Extraer campos JSON antes de camelToSnake
        const planValue = updates.plan;
        const piezaSnapshotValue = updates.piezaSnapshot;
        const updatesWithoutJson = { ...updates };
        delete updatesWithoutJson.plan;
        delete updatesWithoutJson.piezaSnapshot;
        
        const snakeUpdates = camelToSnake(updatesWithoutJson);
        
        // Agregar campos JSONB directamente como objetos
        if (planValue !== undefined) {
          snakeUpdates.plan = planValue;
        }
        if (piezaSnapshotValue !== undefined) {
          snakeUpdates.pieza_snapshot = piezaSnapshotValue;
        }
        
        const { data, error } = await supabase
          .from('asignaciones')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        
        // Deserializar campos JSON después de leer
        const parsed = snakeToCamel<Asignacion>(data);
        return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
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
        return (data || []).map((r: any) => snakeToCamel<RegistroSesion>(r));
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
        return snakeToCamel<RegistroSesion>(data);
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
        return (data || []).map((r: any) => snakeToCamel<RegistroSesion>(r));
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
        return snakeToCamel<RegistroSesion>(result);
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
        return snakeToCamel<RegistroSesion>(data);
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
        return (data || []).map((r: any) => snakeToCamel<RegistroBloque>(r));
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
        return snakeToCamel<RegistroBloque>(data);
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
        return (data || []).map((r: any) => snakeToCamel<RegistroBloque>(r));
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
        return snakeToCamel<RegistroBloque>(result);
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
        return snakeToCamel<RegistroBloque>(data);
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
        return (data || []).map((f: any) => snakeToCamel<FeedbackSemanal>(f));
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
        return snakeToCamel<FeedbackSemanal>(data);
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
        return (data || []).map((f: any) => snakeToCamel<FeedbackSemanal>(f));
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
        return snakeToCamel<FeedbackSemanal>(result);
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
        return snakeToCamel<FeedbackSemanal>(data);
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

