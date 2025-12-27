/**
 * Implementación local de AppDataAPI
 * 
 * Usa LocalDataProvider y los clientes existentes de src/data/*
 * para proporcionar acceso a datos desde localStorage.
 */

import type { AppDataAPI } from './appDataAPI';
import { localDataClient } from './localDataClient';
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
 * Helper para mapear usuarios del formato local al formato de dominio
 */
function mapLocalUserToDomain(user: any): StudiaUser {
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.full_name || user.nombreCompleto || '',
    role: (user.role || user.rolPersonalizado || 'ESTU') as 'ADMIN' | 'PROF' | 'ESTU',
    profesor_asignado_id: user.profesor_asignado_id || user.profesorAsignadoId || null,
    is_active: user.is_active ?? (user.estado === 'activo'),
    created_at: user.created_at || user.fechaRegistro || new Date().toISOString(),
    updated_at: user.updated_at || user.created_at || new Date().toISOString(),
  };
}

/**
 * Helper para mapear entidades del formato local al formato de dominio
 * (convierte camelCase a snake_case para campos de fecha)
 */
function mapLocalEntityToDomain<T extends { created_at?: string; created_date?: string; updated_at?: string }>(
  entity: any,
  dateFields: string[] = ['created_at', 'updated_at']
): T {
  const mapped = { ...entity };

  // Mapear created_date a created_at si existe
  if (mapped.created_date && !mapped.created_at) {
    mapped.created_at = mapped.created_date;
    delete mapped.created_date;
  }

  // Asegurar que updated_at existe
  if (!mapped.updated_at) {
    mapped.updated_at = mapped.created_at || new Date().toISOString();
  }

  return mapped as T;
}

/**
 * Implementación local de AppDataAPI
 */
export function createLocalDataAPI(): AppDataAPI {
  return {
    usuarios: {
      list: async () => {
        const users = await localDataClient.entities.User.list();
        return users.map(mapLocalUserToDomain);
      },
      get: async (id: string) => {
        const user = await localDataClient.entities.User.get(id);
        return user ? mapLocalUserToDomain(user) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const users = await localDataClient.entities.User.filter(filters, limit || undefined);
        return users.map(mapLocalUserToDomain);
      },
      create: async (data) => {
        const user = await localDataClient.entities.User.create(data);
        return mapLocalUserToDomain(user);
      },
      update: async (id: string, updates: any) => {
        const user = await localDataClient.entities.User.update(id, updates);
        return mapLocalUserToDomain(user);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.User.delete(id);
      },
    },
    piezas: {
      list: async (sort?: string) => {
        const piezas = await localDataClient.entities.Pieza.list(sort);
        return piezas.map(p => mapLocalEntityToDomain<Pieza>(p));
      },
      get: async (id: string) => {
        const pieza = await localDataClient.entities.Pieza.get(id);
        return pieza ? mapLocalEntityToDomain<Pieza>(pieza) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const piezas = await localDataClient.entities.Pieza.filter(filters, limit || undefined);
        return piezas.map(p => mapLocalEntityToDomain<Pieza>(p));
      },
      create: async (data) => {
        const pieza = await localDataClient.entities.Pieza.create(data);
        return mapLocalEntityToDomain<Pieza>(pieza);
      },
      update: async (id: string, updates: any) => {
        const pieza = await localDataClient.entities.Pieza.update(id, updates);
        return mapLocalEntityToDomain<Pieza>(pieza);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.Pieza.delete(id);
      },
    },
    bloques: {
      list: async (sort?: string) => {
        const bloques = await localDataClient.entities.Bloque.list(sort);
        return bloques.map(b => mapLocalEntityToDomain<Bloque>(b));
      },
      get: async (id: string) => {
        const bloque = await localDataClient.entities.Bloque.get(id);
        return bloque ? mapLocalEntityToDomain<Bloque>(bloque) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const bloques = await localDataClient.entities.Bloque.filter(filters, limit || undefined);
        return bloques.map(b => mapLocalEntityToDomain<Bloque>(b));
      },
      create: async (data) => {
        const bloque = await localDataClient.entities.Bloque.create(data);
        return mapLocalEntityToDomain<Bloque>(bloque);
      },
      update: async (id: string, updates: any) => {
        const bloque = await localDataClient.entities.Bloque.update(id, updates);
        return mapLocalEntityToDomain<Bloque>(bloque);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.Bloque.delete(id);
      },
    },
    planes: {
      list: async (sort?: string) => {
        const planes = await localDataClient.entities.Plan.list(sort);
        return planes.map(p => mapLocalEntityToDomain<Plan>(p));
      },
      get: async (id: string) => {
        const plan = await localDataClient.entities.Plan.get(id);
        return plan ? mapLocalEntityToDomain<Plan>(plan) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const planes = await localDataClient.entities.Plan.filter(filters, limit || undefined);
        return planes.map(p => mapLocalEntityToDomain<Plan>(p));
      },
      create: async (data) => {
        const plan = await localDataClient.entities.Plan.create(data);
        return mapLocalEntityToDomain<Plan>(plan);
      },
      update: async (id: string, updates: any) => {
        const plan = await localDataClient.entities.Plan.update(id, updates);
        return mapLocalEntityToDomain<Plan>(plan);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.Plan.delete(id);
      },
    },
    asignaciones: {
      list: async (sort?: string) => {
        const asignaciones = await localDataClient.entities.Asignacion.list(sort);
        return asignaciones.map(a => mapLocalEntityToDomain<Asignacion>(a));
      },
      get: async (id: string) => {
        const asignacion = await localDataClient.entities.Asignacion.get(id);
        return asignacion ? mapLocalEntityToDomain<Asignacion>(asignacion) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const asignaciones = await localDataClient.entities.Asignacion.filter(filters, limit || undefined);
        return asignaciones.map(a => mapLocalEntityToDomain<Asignacion>(a));
      },
      create: async (data) => {
        const asignacion = await localDataClient.entities.Asignacion.create(data);
        return mapLocalEntityToDomain<Asignacion>(asignacion);
      },
      update: async (id: string, updates: any) => {
        const asignacion = await localDataClient.entities.Asignacion.update(id, updates);
        return mapLocalEntityToDomain<Asignacion>(asignacion);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.Asignacion.delete(id);
      },
    },
    registrosSesion: {
      list: async (sort?: string, options?: { includeBlocks?: boolean }) => {
        const registros = await localDataClient.entities.RegistroSesion.list(sort, options);
        return registros.map(r => mapLocalEntityToDomain<RegistroSesion>(r));
      },
      get: async (id: string) => {
        const registro = await localDataClient.entities.RegistroSesion.get(id);
        return registro ? mapLocalEntityToDomain<RegistroSesion>(registro) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const registros = await localDataClient.entities.RegistroSesion.filter(filters, limit || undefined);
        return registros.map(r => mapLocalEntityToDomain<RegistroSesion>(r));
      },
      create: async (data) => {
        const registro = await localDataClient.entities.RegistroSesion.create(data);
        return mapLocalEntityToDomain<RegistroSesion>(registro);
      },
      update: async (id: string, updates: any) => {
        const registro = await localDataClient.entities.RegistroSesion.update(id, updates);
        return mapLocalEntityToDomain<RegistroSesion>(registro);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.RegistroSesion.delete(id);
      },
    },
    registrosBloque: {
      list: async (sort?: string) => {
        const registros = await localDataClient.entities.RegistroBloque.list(sort);
        return registros.map(r => mapLocalEntityToDomain<RegistroBloque>(r));
      },
      get: async (id: string) => {
        const registro = await localDataClient.entities.RegistroBloque.get(id);
        return registro ? mapLocalEntityToDomain<RegistroBloque>(registro) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const registros = await localDataClient.entities.RegistroBloque.filter(filters, limit || undefined);
        return registros.map(r => mapLocalEntityToDomain<RegistroBloque>(r));
      },
      create: async (data) => {
        const registro = await localDataClient.entities.RegistroBloque.create(data);
        return mapLocalEntityToDomain<RegistroBloque>(registro);
      },
      update: async (id: string, updates: any) => {
        const registro = await localDataClient.entities.RegistroBloque.update(id, updates);
        return mapLocalEntityToDomain<RegistroBloque>(registro);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.RegistroBloque.delete(id);
      },
    },
    feedbacksSemanal: {
      list: async (sort?: string) => {
        const feedbacks = await localDataClient.entities.FeedbackSemanal.list(sort);
        return feedbacks.map(f => mapLocalEntityToDomain<FeedbackSemanal>(f));
      },
      get: async (id: string) => {
        const feedback = await localDataClient.entities.FeedbackSemanal.get(id);
        return feedback ? mapLocalEntityToDomain<FeedbackSemanal>(feedback) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const feedbacks = await localDataClient.entities.FeedbackSemanal.filter(filters, limit || undefined);
        return feedbacks.map(f => mapLocalEntityToDomain<FeedbackSemanal>(f));
      },
      create: async (data) => {
        const feedback = await localDataClient.entities.FeedbackSemanal.create(data);
        return mapLocalEntityToDomain<FeedbackSemanal>(feedback);
      },
      update: async (id: string, updates: any) => {
        const feedback = await localDataClient.entities.FeedbackSemanal.update(id, updates);
        return mapLocalEntityToDomain<FeedbackSemanal>(feedback);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.FeedbackSemanal.delete(id);
      },
    },
  };
}

