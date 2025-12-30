import { Bloque, Plan, Pieza, EvaluacionTecnica } from '@/features/shared/types/domain';

export type { Bloque, Plan, Pieza, EvaluacionTecnica };

export interface PiezaSnapshot {
    id?: string;
    nombre?: string;
    nivel?: string;
    [key: string]: any;
}

export interface PlanSnapshot {
    nombre?: string;
    semanas?: any[];
    id?: string;
}

export interface Asignacion {
    id: string;
    alumnoId: string;
    profesorId?: string;
    piezaId?: string | null;
    piezaSnapshot?: PiezaSnapshot;
    plan?: PlanSnapshot;
    semanaInicioISO: string;
    estado: 'borrador' | 'publicada' | 'en_curso' | 'cerrada' | string;
    foco?: string;
    notas?: string | null;
    notificarAlumno?: boolean;
    created_date?: string; // Legacy local field
    [key: string]: any;
}

export interface RegistroBloque {
    id: string;
    sesionId?: string; // Legacy
    registroSesionId?: string; // New
    bloqueId?: string; // code del ejercicio
    asignacionId?: string;
    alumnoId?: string;
    semanaIdx?: number;
    sesionIdx?: number;
    ordenEjecucion?: number;
    tipo?: string;
    code?: string;
    nombre?: string;
    duracionObjetivoSeg?: number;
    duracionRealSeg?: number;
    estado?: string;
    iniciosPausa?: number;
    inicioISO?: string;
    finISO?: string;
    completado?: boolean; // Legacy
    bpm?: number; // Legacy
    duracion_seg?: number; // Legacy
    fecha?: string; // ISO Legacy
    nota?: string; // Legacy
    created_date?: string; // Legacy local
    [key: string]: any;
}

export interface RegistroSesion {
    id: string;
    asignacionId: string;
    alumnoId?: string;
    profesorAsignadoId?: string;
    semanaIdx?: number;
    sesionIdx?: number;
    semanaIndex?: number; // Legacy
    sesionIndex?: number; // Legacy
    fecha?: string; // ISO Legacy
    inicioISO?: string;
    finISO?: string;
    duracionTotal?: number; // Legacy
    duracionRealSeg?: number;
    duracionObjetivoSeg?: number;
    bloquesTotales?: number;
    bloquesCompletados?: number;
    bloquesOmitidos?: number;
    completada?: boolean; // Legacy
    finalizada?: boolean;
    finAnticipado?: boolean;
    motivoFin?: string;
    puntuacion?: number; // Legacy
    calificacion?: number;
    comentarios?: string; // Legacy
    notas?: string;
    dispositivo?: string;
    versionSchema?: string;
    piezaNombre?: string;
    planNombre?: string;
    semanaNombre?: string;
    sesionNombre?: string;
    foco?: string;
    created_date?: string;
    [key: string]: any;
}

export interface FeedbackSemanal {
    id: string;
    asignacionId?: string; // Optional in local
    alumnoId: string;
    profesorId: string;
    semanaIndex?: number; // Legacy
    semanaInicioISO?: string;
    fecha?: string; // ISO Legacy
    estado?: 'pendiente' | 'completado'; // Legacy
    respuestaAlumno?: string;
    respuestaProfesor?: string;
    puntuacionGeneral?: number;
    notaProfesor?: string;
    mediaLinks?: string[];
    created_date?: string;
    [key: string]: any;
}

export interface Usuario {
    id: string;
    rolPersonalizado: string;
    nombreCompleto: string;
    full_name?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profesorAsignadoId?: string;
    estado: string;
    fechaRegistro: string;
    [key: string]: any;
}

// Support & Error Reporting
export interface ErrorContext {
    url: string;
    pathname: string;
    userAgent: string;
    screenSize: {
        width: number;
        height: number;
    };
    timestamp: string;
    userId: string | null;
    userEmail: string | null;
    consoleLogs?: any;
    error?: {
        message: string;
        stack?: string;
        name?: string;
    } | null;
    mediaLinks?: string[];
}

export interface ErrorReport {
    id: string;
    userId: string | null;
    category: string;
    description: string;
    screenshotUrl: string | null;
    audioUrl: string | null;
    context: ErrorContext;
    created_at?: string;
    estado?: 'abierto' | 'en_proceso' | 'cerrado';
}

export interface Ticket {
    id: string;
    alumnoId: string;
    profesorId?: string;
    titulo: string;
    descripcion?: string;
    estado: 'abierto' | 'en_proceso' | 'cerrado';
    tipo?: string;
    created_at: string;
    updated_at: string;
    ultimaRespuestaDe?: 'alumno' | 'profesor' | 'admin';
    _alumnoNombre?: string;
    _profesorNombre?: string;
}

export interface Mensaje {
    id: string;
    ticketId: string;
    autorId: string;
    rolAutor: 'alumno' | 'profesor' | 'admin';
    texto: string;
    mediaLinks?: string[];
    created_at: string;
    _autorNombre?: string;
}

export interface LocalData {
    usuarios: Usuario[];
    asignaciones: Asignacion[];
    bloques: Bloque[];
    feedbacksSemanal: FeedbackSemanal[];
    piezas: Pieza[];
    planes: Plan[];
    registrosBloque: RegistroBloque[];
    registrosSesion: RegistroSesion[];
    evaluacionesTecnicas: EvaluacionTecnica[];
    loading?: boolean;
    [key: string]: any;
}

