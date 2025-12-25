/**
 * Tipos de dominio para Studia
 * 
 * Estos tipos representan las entidades de negocio de la aplicación
 * y son compartidos entre LocalDataProvider y RemoteDataProvider (futuro).
 */

/**
 * Roles de usuario en el sistema
 */
export type UserRole = 'ADMIN' | 'PROF' | 'ESTU';

/**
 * Usuario de Studia
 * 
 * Representa un usuario del sistema (administrador, profesor o estudiante).
 * Este tipo es el contrato compartido entre el modelo local y el remoto (Supabase).
 * 
 * @property id - Identificador único del usuario (UUID en Supabase, string en local)
 * @property email - Email del usuario (se sincroniza con auth.users.email en Supabase)
 * @property full_name - Nombre completo del usuario
 * @property role - Rol del usuario: ADMIN, PROF o ESTU
 * @property profesor_asignado_id - ID del profesor asignado (solo para estudiantes, nullable)
 * @property is_active - Indica si el usuario está activo
 * @property created_at - Fecha de creación del usuario (ISO string)
 * @property updated_at - Fecha de última actualización (ISO string)
 * 
 * Notas:
 * - Los campos `first_name` y `last_name` del modelo local se pueden derivar de `full_name` si es necesario
 * - El campo `nombreCompleto` del modelo local es equivalente a `full_name`
 * - El campo `rolPersonalizado` del modelo local se mapea a `role`
 * - El campo `estado` del modelo local se mapea a `is_active` (true si "activo")
 * - El campo `fechaRegistro` del modelo local se mapea a `created_at`
 */
export interface StudiaUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  profesor_asignado_id: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string

  /**
   * Nivel técnico numérico (1-100) para determinar BPMs objetivos.
   * El campo 'nivel' (string) se mantiene para descripción visual.
   */
  nivelTecnico?: number;
}

/**
 * Tipo auxiliar para crear un usuario (sin campos auto-generados)
 */
export type CreateStudiaUserInput = Omit<StudiaUser, 'id' | 'created_at' | 'updated_at'> & { id?: string };

/**
 * Tipo auxiliar para actualizar un usuario (todos los campos opcionales excepto id)
 */
export type UpdateStudiaUserInput = Partial<Omit<StudiaUser, 'id' | 'created_at'>> & {
  id: string;
};

/**
 * Elemento de una pieza (partitura, audio, video, etc.)
 */
export interface PiezaElemento {
  nombre: string;
  mediaLinks: string[];
}

/**
 * Pieza musical
 * 
 * Representa una pieza musical que los estudiantes practican.
 */
export interface Pieza {
  id: string;
  nombre: string;
  descripcion?: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  tiempoObjetivoSeg: number;
  elementos: PiezaElemento[];
  profesorId: string;
  created_at: string;
  updated_at: string;
}

export type CreatePiezaInput = Omit<Pieza, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdatePiezaInput = Partial<Omit<Pieza, 'id' | 'created_at'>> & { id: string };

/**
 * Definición de BPM objetivo por nivel técnico
 */
export interface PPMObjetivoPorNivel {
  nivel: number;
  bpm: number;
  unidad: 'negra' | 'blanca' | 'blancaConPuntillo' | 'corchea';
}

/**
 * Variación de un ejercicio
 * 
 * Representa una variante del material de un ejercicio con filtrado por nivel.
 * Usado en modo repaso para selección aleatoria basada en nivel del alumno.
 */
export interface Variation {
  /** ID único de la variación (para linking de assets) */
  id?: string;
  /** Nombre/etiqueta de la variación (ej: "Sistema 1", "Escala mayor") */
  nombre: string;
  /** Nivel mínimo requerido (1-10) para que esta variación sea elegible */
  nivelMinimo: number;
  /** Duración estimada en segundos */
  duracionSeg: number;
  /** URLs de assets (PDF, audio, video, imagen) */
  mediaLinks?: string[];
  /** Tags opcionales para categorización */
  tags?: string[];
}

/**
 * Bloque/Ejercicio de práctica
 * 
 * Representa un ejercicio o bloque que forma parte de una sesión de práctica.
 */
export interface Bloque {
  id: string;
  nombre: string;
  code: string;
  tipo: 'CA' | 'CB' | 'TC' | 'FM' | 'VC' | 'AD';
  duracionSeg: number;
  instrucciones?: string;
  indicadorLogro?: string;
  materialesRequeridos: string[];
  mediaLinks: string[];
  elementosOrdenados: string[];
  piezaRefId?: string | null;
  profesorId: string;
  created_at: string;
  updated_at: string;

  /**
   * Etiquetas de habilidades maestras que trabaja este ejercicio.
   * Ej: ['motricidad', 'registro', 'sonido']
   */
  skillTags?: string[];

  /**
   * Nivel de dificultad específico para cada habilidad (1-10).
   * Permite que un ejercicio sea fácil en 'motricidad' (2) pero difícil en 'resistencia' (8).
   */
  difficultyLevels?: Record<string, number>;

  /**
   * BPMs objetivo según el nivel técnico del alumno.
   * Permite escalar la dificultad del ejercicio automáticamente.
   */
  targetPPMs?: PPMObjetivoPorNivel[];

  /**
   * Contenido/Variaciones del ejercicio (JSONB).
   *[{ "label": "Sistema 1", "min_level": 1, "tags": ["easy"], "asset_url": "..." }]
   */
  content?: Variation[];
  variations?: Variation[];
}

export type CreateBloqueInput = Omit<Bloque, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateBloqueInput = Partial<Omit<Bloque, 'id' | 'created_at'>> & { id: string };

/**
 * Bloque dentro de una sesión (con datos embebidos)
 */
export interface SesionBloque {
  id?: string;
  code: string;
  nombre: string;
  tipo: 'CA' | 'CB' | 'TC' | 'FM' | 'VC' | 'AD';
  duracionSeg: number;
  [key: string]: any; // Permite campos adicionales del bloque original
}

/**
 * Ronda dentro de una sesión
 */
export interface SesionRonda {
  id?: string;
  nombre?: string;
  bloques: SesionBloque[];
  [key: string]: any;
}

/**
 * Sesión dentro de una semana
 */
export interface PlanSesion {
  id?: string;
  nombre: string;
  foco?: string;
  bloques: SesionBloque[];
  rondas: SesionRonda[];
  [key: string]: any;
}

/**
 * Semana dentro de un plan
 */
export interface PlanSemana {
  id?: string;
  nombre: string;
  foco?: string;
  objetivo?: string;
  sesiones: PlanSesion[];
  [key: string]: any;
}

/**
 * Plan de práctica
 * 
 * Representa un plan de práctica con estructura anidada de semanas, sesiones y bloques.
 */
export interface Plan {
  id: string;
  nombre: string;
  focoGeneral: 'GEN' | 'SON' | 'FLX' | 'ART' | 'MOT' | 'COG';
  objetivoSemanalPorDefecto?: string;
  piezaId: string;
  profesorId: string;
  semanas: PlanSemana[];
  created_at: string;
  updated_at: string;
}

export type CreatePlanInput = Omit<Plan, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdatePlanInput = Partial<Omit<Plan, 'id' | 'created_at'>> & { id: string };

/**
 * Snapshot de una pieza embebido en una asignación
 */
export interface PiezaSnapshot {
  nombre: string;
  descripcion?: string;
  nivel: string;
  tiempoObjetivoSeg: number;
  elementos: PiezaElemento[];
}

/**
 * Asignación de práctica
 * 
 * Representa una asignación de práctica que un profesor hace a un estudiante.
 */
export interface Asignacion {
  id: string;
  alumnoId: string;
  profesorId: string;
  piezaId: string;
  semanaInicioISO: string; // YYYY-MM-DD
  estado: 'borrador' | 'publicada' | 'archivada' | 'en_curso';
  foco: 'GEN' | 'SON' | 'FLX' | 'ART' | 'MOT' | 'COG';
  notas?: string | null;
  plan: Plan; // Snapshot completo del plan
  piezaSnapshot: PiezaSnapshot; // Snapshot completo de la pieza
  isDraft?: boolean;
  modo?: 'manual' | 'asignada';
  created_at: string;
  updated_at: string;
}

export type CreateAsignacionInput = Omit<Asignacion, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateAsignacionInput = Partial<Omit<Asignacion, 'id' | 'created_at'>> & { id: string };

/**
 * Registro de sesión de práctica
 * 
 * Representa un registro de una sesión de práctica realizada por un estudiante.
 */
export interface RegistroSesion {
  id: string;
  asignacionId: string;
  alumnoId: string;
  profesorAsignadoId: string;
  semanaIdx: number;
  sesionIdx: number;
  inicioISO: string; // ISO 8601
  finISO?: string | null; // ISO 8601
  duracionRealSeg: number;
  duracionObjetivoSeg: number;
  bloquesTotales: number;
  bloquesCompletados: number;
  bloquesOmitidos: number;
  finalizada: boolean;
  finAnticipado: boolean;
  motivoFin?: string | null;
  calificacion?: number | null; // 1-4
  notas?: string | null;
  mediaLinks?: string[]; // Array de URLs de medios (YouTube, etc.)
  dispositivo?: string;
  versionSchema?: string;
  piezaNombre?: string;
  planNombre?: string;
  semanaNombre?: string;
  sesionNombre?: string;
  foco?: string;
  created_at: string;
  registrosBloque?: RegistroBloque[];
}

export type CreateRegistroSesionInput = Omit<RegistroSesion, 'id' | 'created_at'> & { id?: string };
export type UpdateRegistroSesionInput = Partial<Omit<RegistroSesion, 'id' | 'created_at'>> & { id: string };

/**
 * Registro de bloque ejecutado
 * 
 * Representa un registro detallado de un bloque ejecutado en una sesión.
 */
export interface RegistroBloque {
  id: string;
  registroSesionId: string;
  asignacionId: string;
  alumnoId: string;
  semanaIdx: number;
  sesionIdx: number;
  ordenEjecucion: number;
  tipo: 'CA' | 'CB' | 'TC' | 'FM' | 'VC' | 'AD';
  code: string;
  nombre: string;
  duracionObjetivoSeg: number;
  duracionRealSeg: number;
  estado: 'completado' | 'omitido';
  iniciosPausa: number;
  inicioISO: string; // ISO 8601
  finISO?: string | null; // ISO 8601
  created_at: string;

  /**
   * BPM real alcanzado durante la práctica del bloque.
   * Se registra automáticamente al finalizar.
   */
  ppmAlcanzado?: {
    bpm: number;
    unidad: 'negra' | 'blanca' | 'blancaConPuntillo' | 'corchea';
  };
}

export type CreateRegistroBloqueInput = Omit<RegistroBloque, 'id' | 'created_at'> & { id?: string };
export type UpdateRegistroBloqueInput = Partial<Omit<RegistroBloque, 'id' | 'created_at'>> & { id: string };

/**
 * Feedback semanal
 * 
 * Representa un feedback que un profesor da a un estudiante cada semana.
 */
export interface FeedbackSemanal {
  id: string;
  alumnoId: string;
  profesorId: string;
  semanaInicioISO: string; // YYYY-MM-DD
  notaProfesor: string;
  mediaLinks: string[];
  created_at: string;
  updated_at: string;
  /** Calidad de sonido (0-10, nullable) - Métrica técnica unificada */
  sonido?: number | null;
  /** Capacidad cognitiva (0-10, nullable) - Métrica técnica unificada */
  cognicion?: number | null;
  /** Evaluación técnica detallada (Motricidad, Articulación, etc.) */
  habilidades?: HabilidadesMaestras;
  /** Deltas XP manuales por habilidad */
  xp_delta_by_skill?: Record<string, number>;
}

export type CreateFeedbackSemanalInput = Omit<FeedbackSemanal, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateFeedbackSemanalInput = Partial<Omit<FeedbackSemanal, 'id' | 'created_at'>> & { id: string };

/**
 * Evento del calendario
 * 
 * Representa un evento importante del calendario (encuentro, masterclass, colectiva, etc.)
 * que puede ser creado por ADMIN o PROF y es visible para los roles especificados.
 */
export interface EventoCalendario {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fechaInicio: string; // YYYY-MM-DD (legacy, mantenido para compatibilidad)
  fechaFin?: string | null; // YYYY-MM-DD (legacy, mantenido para compatibilidad)
  start_at?: string | null; // ISO timestamp con hora (ej. 2024-01-15T18:00:00Z)
  end_at?: string | null; // ISO timestamp con hora (ej. 2024-01-15T20:00:00Z)
  all_day?: boolean; // true si es evento de todo el día
  tipo: 'encuentro' | 'masterclass' | 'colectiva' | 'otro';
  creadoPorId: string; // ID del usuario que creó el evento
  visiblePara: UserRole[]; // Roles que pueden verlo
  created_at: string;
  updated_at: string;
}

export type CreateEventoCalendarioInput = Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateEventoCalendarioInput = Partial<Omit<EventoCalendario, 'id' | 'created_at'>> & { id: string };

/**
 * Ticket de soporte
 * 
 * Representa un ticket de soporte/duda entre un alumno y un profesor.
 */
export interface SupportTicket {
  id: string;
  alumnoId: string;
  profesorId: string | null;
  estado: 'abierto' | 'en_proceso' | 'cerrado';
  tipo: 'duda_general' | 'tecnica' | 'pieza' | 'ritmo' | 'sonido' | 'otro' | null;
  titulo: string;
  created_at: string;
  updated_at: string;
  cerradoAt: string | null;
  ultimaRespuestaDe: 'alumno' | 'profesor' | null;
}

export type CreateSupportTicketInput = Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'cerradoAt' | 'ultimaRespuestaDe'>;
export type UpdateSupportTicketInput = Partial<Omit<SupportTicket, 'id' | 'created_at'>> & { id: string };

/**
 * Mensaje dentro de un ticket de soporte
 * 
 * Representa un mensaje (texto + media_links) dentro de un ticket.
 */
export interface SupportMensaje {
  id: string;
  ticketId: string;
  autorId: string;
  rolAutor: 'alumno' | 'profesor' | 'admin';
  texto: string;
  mediaLinks: string[]; // Array de URLs
  created_at: string;
}

export type CreateSupportMensajeInput = Omit<SupportMensaje, 'id' | 'created_at'>;
export type UpdateSupportMensajeInput = Partial<Omit<SupportMensaje, 'id' | 'created_at'>> & { id: string };

/**
 * Estructura de las 5 Habilidades Maestras
 * 
 * Define los valores métricos para cada una de las habilidades pedagógicas.
 */
export interface HabilidadesMaestras {
  /** Calidad de sonido (0-10) */
  sonido?: number;

  /** Flexibilidad y registro (0-10) */
  flexibilidad?: number;

  /** Motricidad / Digitación (BPM) */
  motricidad?: number;

  /** Velocidad de articulación (BPM) para diferentes golpes de lengua */
  articulacion?: {
    t?: number;   // Simple
    tk?: number;  // Doble
    ttk?: number; // Triple
  };

  /** Capacidad cognitiva / Lectura / Memoria (0-10) */
  cognitivo?: number;
}

/**
 * Evaluación Técnica (Snapshot)
 * 
 * Representa una evaluación puntual del perfil técnico de un estudiante.
 * Permite historizar la evolución de las habilidades en el tiempo.
 */
export interface EvaluacionTecnica {
  id: string;
  alumnoId: string;
  profesorId: string;
  fecha: string; // ISO 8601 (YYYY-MM-DD)
  habilidades: HabilidadesMaestras;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export type CreateEvaluacionTecnicaInput = Omit<EvaluacionTecnica, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateEvaluacionTecnicaInput = Partial<Omit<EvaluacionTecnica, 'id' | 'created_at'>> & { id: string };

/**
 * Configuración de requisitos por nivel
 */
export interface LevelConfig {
  level: number;
  minXpFlex: number;
  minXpMotr: number;
  minXpArt: number;
  minEvalSound: number;
  minEvalCog: number;
  evidenceWindowDays: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateLevelConfigInput = Omit<LevelConfig, 'created_at' | 'updated_at'>;
export type UpdateLevelConfigInput = Partial<Omit<LevelConfig, 'created_at'>> & { level: number };

/**
 * Criterios clave para subir de nivel
 */
export type CriteriaSkill = 'Flexibilidad' | 'Motricidad' | 'Articulación' | 'Sonido' | 'Cognición';
export type CriteriaSource = 'PRACTICA' | 'PROF';

export interface LevelKeyCriteria {
  id: string;
  level: number;
  skill: CriteriaSkill;
  source: CriteriaSource;
  description: string;
  thresholdNum?: number | null;
  required: boolean;
  evidenceRequired: number;
  evidenceDays: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateLevelKeyCriteriaInput = Omit<LevelKeyCriteria, 'id' | 'created_at' | 'updated_at'>;
export type UpdateLevelKeyCriteriaInput = Partial<Omit<LevelKeyCriteria, 'id' | 'created_at'>> & { id: string };

/**
 * Estado de los criterios para un estudiante
 */
export type CriteriaStatus = 'PASSED' | 'FAILED';

export interface StudentCriteriaStatus {
  id: string;
  studentId: string;
  criterionId: string;
  status: CriteriaStatus;
  assessedAt: string;
  assessedBy?: string | null;
}

export type CreateStudentCriteriaStatusInput = Omit<StudentCriteriaStatus, 'id'>;
export type UpdateStudentCriteriaStatusInput = Partial<Omit<StudentCriteriaStatus, 'id'>> & { id: string };

/**
 * Historial de cambios de nivel
 */
export interface StudentLevelHistory {
  id: string;
  studentId: string;
  fromLevel?: number | null;
  toLevel: number;
  changedAt: string;
  changedBy?: string | null;
  reason?: string | null;
}

export type CreateStudentLevelHistoryInput = Omit<StudentLevelHistory, 'id' | 'changedAt'>;

// ============================================================================
// Student XP Total - Lifetime XP accumulation by skill
// ============================================================================

export interface StudentXPTotal {
  id: string;
  studentId: string;
  skill: 'motricidad' | 'articulacion' | 'flexibilidad';
  totalXp: number;
  practiceXp: number;
  evaluationXp: number;
  lastUpdatedAt: string;
  lastManualXpAt?: string; // Timestamp when manual XP was last awarded
  lastManualXpAmount?: number; // Amount of last manual XP (for 30-day window)
}

export type CreateStudentXPTotalInput = Omit<StudentXPTotal, 'id'>;
export type UpdateStudentXPTotalInput = Partial<Omit<StudentXPTotal, 'id' | 'studentId' | 'skill'>>;

// ============================================================================
// Media Assets - Centralized file management
// ============================================================================

export interface MediaAsset {
  id: string;
  url: string;
  name?: string;
  fileType: 'pdf' | 'audio' | 'video' | 'image' | 'youtube' | 'drive' | 'soundcloud' | 'other';
  state: 'uploaded' | 'external';
  storagePath?: string;

  // Polymorphic origin
  originType: 'ejercicio' | 'variacion' | 'feedback_profesor' | 'feedback_sesion' | 'centro_dudas' | 'otro';
  originId: string;
  originLabel?: string;
  originContext?: Record<string, any>;

  created_at: string;
  createdBy?: string;
}

export type CreateMediaAssetInput = Omit<MediaAsset, 'id' | 'created_at' | 'fileType' | 'state'> & {
  id?: string,
  fileType: string,
  state?: 'uploaded' | 'external'
};
export type UpdateMediaAssetInput = Partial<Omit<MediaAsset, 'id' | 'created_at'>> & { id: string };

// ============================================================================
// Student Backpack - Spaced Repetition System
// ============================================================================

export interface StudentBackpackItem {
  id: string;
  studentId: string;
  backpackKey: string;
  status: 'nuevo' | 'en_progreso' | 'dominado' | 'oxidado' | 'archivado';
  masteryScore: number;
  lastPracticedAt: string; // ISO timestamp
  masteredWeeks: string[]; // ISO dates of weeks where item was mastered
  lastMasteredWeekStart?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

