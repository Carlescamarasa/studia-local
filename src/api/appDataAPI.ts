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
  EventoCalendario,
  CreateEventoCalendarioInput,
  UpdateEventoCalendarioInput,
  EvaluacionTecnica,
  CreateEvaluacionTecnicaInput,
  UpdateEvaluacionTecnicaInput,
  LevelConfig,
  CreateLevelConfigInput,
  UpdateLevelConfigInput,
  LevelKeyCriteria,
  CreateLevelKeyCriteriaInput,
  UpdateLevelKeyCriteriaInput,
  StudentCriteriaStatus,
  CreateStudentCriteriaStatusInput,
  UpdateStudentCriteriaStatusInput,
  StudentLevelHistory,
  CreateStudentLevelHistoryInput,
  StudentXPTotal,
  CreateStudentXPTotalInput,
  UpdateStudentXPTotalInput,
  StudentBackpackItem,
  MediaAsset,
  CreateMediaAssetInput,
  UpdateMediaAssetInput,
} from '@/features/shared/types/domain';

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
export type UserAPI = EntityAPI<StudiaUser, CreateStudiaUserInput, UpdateStudiaUserInput>;

/**
 * API de piezas
 */
export type PiezaAPI = EntityAPI<Pieza, CreatePiezaInput, UpdatePiezaInput>;

/**
 * API de bloques
 */
export type BloqueAPI = EntityAPI<Bloque, CreateBloqueInput, UpdateBloqueInput>;

/**
 * API de planes
 */
export type PlanAPI = EntityAPI<Plan, CreatePlanInput, UpdatePlanInput>;

/**
 * API de asignaciones
 */
export type AsignacionAPI = EntityAPI<Asignacion, CreateAsignacionInput, UpdateAsignacionInput>;

/**
 * API de registros de sesión
 */
export type RegistroSesionAPI = EntityAPI<RegistroSesion, CreateRegistroSesionInput, UpdateRegistroSesionInput>;

/**
 * API de registros de bloque
 */
export type RegistroBloqueAPI = EntityAPI<RegistroBloque, CreateRegistroBloqueInput, UpdateRegistroBloqueInput>;

/**
 * API de feedbacks semanales
 */
export type FeedbackSemanalAPI = EntityAPI<FeedbackSemanal, CreateFeedbackSemanalInput, UpdateFeedbackSemanalInput>;

/**
 * API de eventos del calendario
 */
export type EventoCalendarioAPI = EntityAPI<EventoCalendario, CreateEventoCalendarioInput, UpdateEventoCalendarioInput>;

/**
 * API de evaluaciones técnicas
 */
export type EvaluacionTecnicaAPI = EntityAPI<EvaluacionTecnica, CreateEvaluacionTecnicaInput, UpdateEvaluacionTecnicaInput>;

export type LevelConfigAPI = EntityAPI<LevelConfig, CreateLevelConfigInput, UpdateLevelConfigInput>;
export type LevelKeyCriteriaAPI = EntityAPI<LevelKeyCriteria, CreateLevelKeyCriteriaInput, UpdateLevelKeyCriteriaInput>;
export type StudentCriteriaStatusAPI = EntityAPI<StudentCriteriaStatus, CreateStudentCriteriaStatusInput, UpdateStudentCriteriaStatusInput>;
// StudentLevelHistory no tiene UpdateInput definido exportado, usare Partial<...> & {id: string} o any si falla, pero usare CreateStudentLevelHistoryInput como update type temporal o any
export type StudentLevelHistoryAPI = EntityAPI<StudentLevelHistory, CreateStudentLevelHistoryInput, any>;
export type StudentXPTotalAPI = EntityAPI<StudentXPTotal, CreateStudentXPTotalInput, UpdateStudentXPTotalInput>;
export type StudentBackpackAPI = EntityAPI<StudentBackpackItem, any, any>;
export type MediaAssetAPI = EntityAPI<MediaAsset, CreateMediaAssetInput, UpdateMediaAssetInput>;

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
  eventosCalendario: EventoCalendarioAPI;
  evaluaciones: EvaluacionTecnicaAPI;
  levelsConfig: LevelConfigAPI;
  levelKeyCriteria: LevelKeyCriteriaAPI;
  studentCriteriaStatus: StudentCriteriaStatusAPI;
  studentLevelHistory: StudentLevelHistoryAPI;
  studentXpTotal: StudentXPTotalAPI;
  studentBackpack: StudentBackpackAPI;
  mediaAssets: MediaAssetAPI;

  // RPC Methods
  getCalendarSummary?: (startDate: Date, endDate: Date, userId?: string) => Promise<{
    registrosSesion: RegistroSesion[];
    feedbacksSemanal: FeedbackSemanal[];
    asignaciones: Asignacion[];
    eventosCalendario: EventoCalendario[];
  }>;
  getProgressSummary?: (studentId?: string) => Promise<{
    xpTotals: StudentXPTotal[];
    evaluacionesTecnicas: EvaluacionTecnica[];
    feedbacksSemanal: FeedbackSemanal[];
    registrosSesion: RegistroSesion[];
  }>;
  getSeedStats?: () => Promise<{
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

