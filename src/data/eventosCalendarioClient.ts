/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { getEntity, createItem, updateItem, deleteItem } from './localStorageClient';

const ENTITY_KEY = 'eventosCalendario';

export interface EventoCalendarioData {
    id?: string;
    titulo: string;
    descripcion?: string | null;
    fechaInicio: string;
    fechaFin?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    all_day?: boolean;
    tipo?: 'encuentro' | 'masterclass' | 'colectiva' | 'otro';
    visiblePara?: string[];
    creadoPorId?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

export interface EventoCalendario extends EventoCalendarioData {
    id: string;
}

export const EventosCalendarioAPI = {
    getAllEventosCalendario(): EventoCalendario[] {
        return getEntity(ENTITY_KEY) as EventoCalendario[];
    },
    createEventoCalendario(data: EventoCalendarioData): EventoCalendario {
        return createItem(ENTITY_KEY, data as any) as unknown as EventoCalendario;
    },
    updateEventoCalendario(id: string, updates: Partial<EventoCalendarioData>): EventoCalendario {
        return updateItem(ENTITY_KEY, id, updates as any) as unknown as EventoCalendario;
    },
    deleteEventoCalendario(id: string): { success: boolean } {
        return deleteItem(ENTITY_KEY, id);
    },
};
