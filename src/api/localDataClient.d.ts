
export function setLocalDataRef(data: any): void;
export function getCurrentUser(): any;
export function setCurrentUser(userId: string): void;

export interface EntityAPI {
    list: (sort?: string) => Promise<any[]>;
    get: (id: string) => Promise<any>;
    filter: (filters: any, limit?: number | null) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<{ success: boolean }>;
    bulkCreate?: (items: any[]) => Promise<any[]>;
}

export const localDataClient: {
    auth: {
        me: () => Promise<any>;
        getCurrentUser: () => any;
        login: (credentials: any) => Promise<{ user: any; success: boolean }>;
        logout: () => Promise<{ success: boolean }>;
        updateMe: (data: any, effectiveUserId?: string | null) => Promise<any>;
    };
    entities: {
        User: EntityAPI;
        Asignacion: EntityAPI;
        Bloque: EntityAPI;
        FeedbackSemanal: EntityAPI;
        Pieza: EntityAPI;
        Plan: EntityAPI;
        RegistroBloque: EntityAPI;
        RegistroSesion: EntityAPI;
        EventoCalendario: EntityAPI;
        EvaluacionTecnica: EntityAPI;
        LevelConfig: EntityAPI;
        LevelKeyCriteria: EntityAPI;
        StudentCriteriaStatus: EntityAPI;
        StudentLevelHistory: EntityAPI;
        StudentXPTotal: EntityAPI;
        StudentBackpack: EntityAPI;
        [key: string]: EntityAPI;
    };
    getCalendarSummary: (startDate: Date, endDate: Date, userId?: string) => Promise<any>;
    getProgressSummary: (studentId?: string) => Promise<any>;
};
