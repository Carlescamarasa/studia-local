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
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
 * Implementación remota de AppDataAPI
 */
export function createRemoteDataAPI(): AppDataAPI {
  return {
    usuarios: {
      list: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) throw error;
        return (data || []).map((u: any) => snakeToCamel<StudiaUser>(u));
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
        return snakeToCamel<StudiaUser>(data);
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
        return (data || []).map((u: any) => snakeToCamel<StudiaUser>(u));
      },
      create: async (data) => {
        const snakeData = camelToSnake(data);
        const { data: result, error } = await supabase
          .from('profiles')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<StudiaUser>(result);
      },
      update: async (id: string, updates: any) => {
        const snakeUpdates = camelToSnake(updates);
        const { data, error } = await supabase
          .from('profiles')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return snakeToCamel<StudiaUser>(data);
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
        // Serializar campos JSON antes de convertir a snake_case
        const dataWithSerializedJson = serializeJsonFields(data, ['plan', 'piezaSnapshot']);
        const snakeData = camelToSnake({
          ...dataWithSerializedJson,
          id: data.id || generateId('asignacion'),
        });
        const { data: result, error } = await supabase
          .from('asignaciones')
          .insert(snakeData)
          .select()
          .single();
        
        if (error) throw error;
        // Deserializar campos JSON después de leer
        const parsed = snakeToCamel<Asignacion>(result);
        return deserializeJsonFields(parsed, ['plan', 'piezaSnapshot']);
      },
      update: async (id: string, updates: any) => {
        // Serializar campos JSON si están presentes
        const updatesWithSerializedJson = serializeJsonFields(updates, ['plan', 'piezaSnapshot']);
        const snakeUpdates = camelToSnake(updatesWithSerializedJson);
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

