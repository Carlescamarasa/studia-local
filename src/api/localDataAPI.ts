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
  EventoCalendario,
  EvaluacionTecnica,
  LevelConfig,
  LevelKeyCriteria,
  StudentCriteriaStatus,
  StudentLevelHistory,
  StudentXPTotal,
  StudentBackpackItem,
  MediaAsset,
} from '../types/domain';

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
 * (convierte camelCase a snake_case para campos de fecha si es necesario)
 */
function mapLocalEntityToDomain<T>(
  entity: any
): T {
  const mapped = { ...entity };

  // Mapear created_date a created_at si existe
  if (mapped.created_date && !mapped.created_at) {
    mapped.created_at = mapped.created_date;
  }

  // Mapear createdAt a created_at si existe (para tipos camelCase en domain.ts)
  if (mapped.createdAt && !mapped.created_at) {
    mapped.created_at = mapped.createdAt;
  }

  // Asegurar que updated_at o updatedAt existe
  if (!mapped.updated_at && !mapped.updatedAt) {
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
      bulkCreate: async (items) => {
        const bulkCreate = localDataClient.entities.RegistroBloque.bulkCreate;
        if (bulkCreate) {
          const registros = await bulkCreate(items);
          return registros.map(r => mapLocalEntityToDomain<RegistroBloque>(r));
        }
        return [];
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
    eventosCalendario: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.EventoCalendario.list(sort);
        return items.map(i => mapLocalEntityToDomain<EventoCalendario>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.EventoCalendario.get(id);
        return item ? mapLocalEntityToDomain<EventoCalendario>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.EventoCalendario.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<EventoCalendario>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.EventoCalendario.create(data);
        return mapLocalEntityToDomain<EventoCalendario>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.EventoCalendario.update(id, updates);
        return mapLocalEntityToDomain<EventoCalendario>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.EventoCalendario.delete(id);
      },
    },
    evaluaciones: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.EvaluacionTecnica.list(sort);
        return items.map(i => mapLocalEntityToDomain<EvaluacionTecnica>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.EvaluacionTecnica.get(id);
        return item ? mapLocalEntityToDomain<EvaluacionTecnica>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.EvaluacionTecnica.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<EvaluacionTecnica>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.EvaluacionTecnica.create(data);
        return mapLocalEntityToDomain<EvaluacionTecnica>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.EvaluacionTecnica.update(id, updates);
        return mapLocalEntityToDomain<EvaluacionTecnica>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.EvaluacionTecnica.delete(id);
      },
    },
    levelsConfig: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.LevelConfig.list(sort);
        return items.map(i => mapLocalEntityToDomain<LevelConfig>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.LevelConfig.get(id);
        return item ? mapLocalEntityToDomain<LevelConfig>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.LevelConfig.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<LevelConfig>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.LevelConfig.create(data);
        return mapLocalEntityToDomain<LevelConfig>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.LevelConfig.update(id, updates);
        return mapLocalEntityToDomain<LevelConfig>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.LevelConfig.delete(id);
      },
    },
    levelKeyCriteria: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.LevelKeyCriteria.list(sort);
        return items.map(i => mapLocalEntityToDomain<LevelKeyCriteria>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.LevelKeyCriteria.get(id);
        return item ? mapLocalEntityToDomain<LevelKeyCriteria>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.LevelKeyCriteria.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<LevelKeyCriteria>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.LevelKeyCriteria.create(data);
        return mapLocalEntityToDomain<LevelKeyCriteria>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.LevelKeyCriteria.update(id, updates);
        return mapLocalEntityToDomain<LevelKeyCriteria>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.LevelKeyCriteria.delete(id);
      },
    },
    studentCriteriaStatus: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.StudentCriteriaStatus.list(sort);
        return items.map(i => mapLocalEntityToDomain<StudentCriteriaStatus>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.StudentCriteriaStatus.get(id);
        return item ? mapLocalEntityToDomain<StudentCriteriaStatus>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.StudentCriteriaStatus.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<StudentCriteriaStatus>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.StudentCriteriaStatus.create(data);
        return mapLocalEntityToDomain<StudentCriteriaStatus>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.StudentCriteriaStatus.update(id, updates);
        return mapLocalEntityToDomain<StudentCriteriaStatus>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.StudentCriteriaStatus.delete(id);
      },
    },
    studentLevelHistory: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.StudentLevelHistory.list(sort);
        return items.map(i => mapLocalEntityToDomain<StudentLevelHistory>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.StudentLevelHistory.get(id);
        return item ? mapLocalEntityToDomain<StudentLevelHistory>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.StudentLevelHistory.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<StudentLevelHistory>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.StudentLevelHistory.create(data);
        return mapLocalEntityToDomain<StudentLevelHistory>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.StudentLevelHistory.update(id, updates);
        return mapLocalEntityToDomain<StudentLevelHistory>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.StudentLevelHistory.delete(id);
      },
    },
    studentXpTotal: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.StudentXPTotal.list(sort);
        return items.map(i => mapLocalEntityToDomain<StudentXPTotal>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.StudentXPTotal.get(id);
        return item ? mapLocalEntityToDomain<StudentXPTotal>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.StudentXPTotal.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<StudentXPTotal>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.StudentXPTotal.create(data);
        return mapLocalEntityToDomain<StudentXPTotal>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.StudentXPTotal.update(id, updates);
        return mapLocalEntityToDomain<StudentXPTotal>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.StudentXPTotal.delete(id);
      },
    },
    studentBackpack: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.StudentBackpack.list(sort);
        return items.map(i => mapLocalEntityToDomain<StudentBackpackItem>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.StudentBackpack.get(id);
        return item ? mapLocalEntityToDomain<StudentBackpackItem>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.StudentBackpack.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<StudentBackpackItem>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.StudentBackpack.create(data);
        return mapLocalEntityToDomain<StudentBackpackItem>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.StudentBackpack.update(id, updates);
        return mapLocalEntityToDomain<StudentBackpackItem>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.StudentBackpack.delete(id);
      },
    },
    mediaAssets: {
      list: async (sort?: string) => {
        const items = await localDataClient.entities.MediaAsset.list(sort);
        return items.map(i => mapLocalEntityToDomain<MediaAsset>(i));
      },
      get: async (id: string) => {
        const item = await localDataClient.entities.MediaAsset.get(id);
        return item ? mapLocalEntityToDomain<MediaAsset>(item) : null;
      },
      filter: async (filters: Record<string, any>, limit?: number | null) => {
        const items = await localDataClient.entities.MediaAsset.filter(filters, limit || undefined);
        return items.map(i => mapLocalEntityToDomain<MediaAsset>(i));
      },
      create: async (data) => {
        const item = await localDataClient.entities.MediaAsset.create(data);
        return mapLocalEntityToDomain<MediaAsset>(item);
      },
      update: async (id: string, updates: any) => {
        const item = await localDataClient.entities.MediaAsset.update(id, updates);
        return mapLocalEntityToDomain<MediaAsset>(item);
      },
      delete: async (id: string) => {
        return await localDataClient.entities.MediaAsset.delete(id);
      },
    },

    // RPC Methods
    getCalendarSummary: (startDate: Date, endDate: Date, userId?: string) => {
      return localDataClient.getCalendarSummary(startDate, endDate, userId);
    },
    getProgressSummary: (studentId?: string) => {
      return localDataClient.getProgressSummary(studentId);
    },
    getSeedStats: () => {
      return localDataClient.getSeedStats();
    },
  };
}
