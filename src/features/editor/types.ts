/* eslint-disable @typescript-eslint/no-explicit-any */
import { MediaItem } from "@/features/shared/components/media/MediaLinksInput";
export type { MediaItem };

export interface TargetPPM {
    nivel: number;
    bpm: number;
    unidad: string;
}

export interface Variation {
    id?: string;
    label?: string;
    nombre: string;
    min_level?: number;
    nivelMinimo?: number;
    duracionSeg?: number;
    tags?: string[];
    asset_url?: string;
    asset_urls?: string[];
    media?: MediaItem[];
    mediaItems?: MediaItem[];
}

export interface Elemento {
    id?: string;
    nombre: string;
    media?: {
        video?: string;
        audio?: string;
        imagen?: string;
        pdf?: string;
    };
    mediaLinks?: MediaItem[];
    [key: string]: unknown;
}

export type NivelPieza = 'principiante' | 'intermedio' | 'avanzado';

export interface Pieza {
    id: string;
    nombre?: string;
    descripcion?: string;
    nivel?: NivelPieza;
    tiempoObjetivoSeg?: number;
    elementos?: Elemento[];
    profesorId?: string | null;
    [key: string]: unknown;
}

export interface PiezaFormData {
    nombre: string;
    descripcion: string;
    nivel: NivelPieza;
    tiempoObjetivoSeg: number;
    elementos: Elemento[];
}

export interface Ejercicio {
    id?: string;
    code?: string; // Made optional to fit both creation and existing patterns, but usually required for existing
    nombre?: string;
    title?: string; // Some legacy objects might use title
    tipo?: string;
    metodo?: string;
    duracionSeg?: number;
    duracion_seg?: number;
    instrucciones?: string;
    indicadorLogro?: string;
    indicador_logro?: string;
    materialesRequeridos?: string[];
    materiales_requeridos?: string[];
    mediaLinks?: (string | MediaItem)[];
    media_links?: (string | MediaItem)[];
    media?: Record<string, string> | any; // Loose type for backwards compatibility
    elementosOrdenados?: string[];
    elementos_ordenados?: string[];
    piezaRefId?: string | null;
    targetPPMs?: TargetPPM[];
    target_ppms?: TargetPPM[];
    skillTags?: string[];
    variations?: Variation[];
    content?: {
        variations?: Variation[];
        mediaItems?: MediaItem[];
    } | Variation[]; // Sometimes content is just the array of variations
    profesorId?: string | null;
    modo?: 'foco' | 'repaso'; // UI specific
    raw?: any; // For keeping original DB object if needed
}

export interface EjercicioFormData {
    id: string | null;
    nombre: string;
    code: string;
    tipo: string;
    metodo: string;
    duracionSeg: number;
    instrucciones: string;
    indicadorLogro: string;
    materialesRequeridos: string[];
    mediaLinks: (string | MediaItem)[];
    elementosOrdenados: string[];
    piezaRefId: string | null;
    targetPPMs: TargetPPM[];
    target_ppms?: TargetPPM[];
    skillTags: string[];
    variations: Variation[];
    profesorId?: string | null;
    content?: {
        variations?: Variation[];
        mediaItems?: MediaItem[];
    };
    media?: Record<string, string>;
}

export interface Ronda {
    id: string;
    bloques: string[]; // codes
    repeticiones: number;
    aleatoria: boolean;
}

export interface SecuenciaItem {
    kind: 'BLOQUE' | 'RONDA';
    id?: string; // id for RONDA
    code?: string; // code for BLOQUE
}

export interface SessionFormData {
    nombre: string;
    foco: string;
    bloques: Ejercicio[];
    rondas: Ronda[];
    secuencia: SecuenciaItem[];
}

export interface Sesion {
    nombre: string;
    foco: string;
    bloques: Ejercicio[];
    rondas: Ronda[];
}

export interface Semana {
    nombre: string;
    objetivo?: string;
    foco: string;
    sesiones: Sesion[];
}

export interface Plan {
    id?: string;
    nombre: string;
    profesorId?: string;
    focoGeneral: string;
    objetivoSemanalPorDefecto?: string;
    piezaId?: string;
    semanas: Semana[];
}

export interface EditorState {
    nombre: string;
    focoGeneral: string;
    objetivoSemanalPorDefecto: string;
    piezaId: string;
    semanas: Semana[];
}

export interface PlanFormData {
    nombre: string;
    focoGeneral: string;
    objetivoSemanalPorDefecto: string;
    piezaId: string;
    semanas: Semana[];
}
