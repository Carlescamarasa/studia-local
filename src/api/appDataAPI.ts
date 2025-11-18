/**
 * Interfaz AppDataAPI
 * 
 * Define el contrato común para todas las implementaciones de acceso a datos
 * (local y remoto). Todas las implementaciones deben cumplir esta interfaz.
 */

import type {
  StudiaUser,
  CreateStudiaUserInput,
  UpdateStudiaUserInput,
  Pieza,
  CreatePiezaInput,
  UpdatePiezaInput,
  Bloque,
  CreateBloqueInput,
  UpdateBloqueInput,
  Plan,
  CreatePlanInput,
  UpdatePlanInput,
  Asignacion,
  CreateAsignacionInput,
  UpdateAsignacionInput,
  RegistroSesion,
  CreateRegistroSesionInput,
  UpdateRegistroSesionInput,
  RegistroBloque,
  CreateRegistroBloqueInput,
  UpdateRegistroBloqueInput,
  FeedbackSemanal,
  CreateFeedbackSemanalInput,
  UpdateFeedbackSemanalInput,
} from '@/types/domain';

/**
 * Interfaz genérica para operaciones CRUD de una entidad
 */
export interface EntityAPI<T, CreateInput, UpdateInput> {
  list: (sort?: string) => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  filter: (filters: Record<string, any>, limit?: number | null) => Promise<T[]>;
  create: (data: CreateInput) => Promise<T>;
  update: (id: string, updates: UpdateInput) => Promise<T>;
  delete: (id: string) => Promise<{ success: boolean }>;
  bulkCreate?: (items: CreateInput[]) => Promise<T[]>;
}

/**
 * API de usuarios
 */
export interface UserAPI extends EntityAPI<StudiaUser, CreateStudiaUserInput, UpdateStudiaUserInput> {}

/**
 * API de piezas
 */
export interface PiezaAPI extends EntityAPI<Pieza, CreatePiezaInput, UpdatePiezaInput> {}

/**
 * API de bloques
 */
export interface BloqueAPI extends EntityAPI<Bloque, CreateBloqueInput, UpdateBloqueInput> {}

/**
 * API de planes
 */
export interface PlanAPI extends EntityAPI<Plan, CreatePlanInput, UpdatePlanInput> {}

/**
 * API de asignaciones
 */
export interface AsignacionAPI extends EntityAPI<Asignacion, CreateAsignacionInput, UpdateAsignacionInput> {}

/**
 * API de registros de sesión
 */
export interface RegistroSesionAPI extends EntityAPI<RegistroSesion, CreateRegistroSesionInput, UpdateRegistroSesionInput> {}

/**
 * API de registros de bloque
 */
export interface RegistroBloqueAPI extends EntityAPI<RegistroBloque, CreateRegistroBloqueInput, UpdateRegistroBloqueInput> {}

/**
 * API de feedbacks semanales
 */
export interface FeedbackSemanalAPI extends EntityAPI<FeedbackSemanal, CreateFeedbackSemanalInput, UpdateFeedbackSemanalInput> {}

/**
 * Interfaz principal AppDataAPI
 * 
 * Agrupa todas las APIs de entidades en un solo objeto.
 */
export interface AppDataAPI {
  usuarios: UserAPI;
  piezas: PiezaAPI;
  bloques: BloqueAPI;
  planes: PlanAPI;
  asignaciones: AsignacionAPI;
  registrosSesion: RegistroSesionAPI;
  registrosBloque: RegistroBloqueAPI;
  feedbacksSemanal: FeedbackSemanalAPI;
}

