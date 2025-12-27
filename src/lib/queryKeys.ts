import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized query keys for React Query
 * Using `as const` for type safety and autocomplete
 */
export const QUERY_KEYS = {
    // ============================================================================
    // XP Data
    // ============================================================================
    STUDENT_XP_ALL: ['student-xp-total-all'] as const,
    STUDENT_XP: (studentId: string) => ['student-xp', studentId] as const,
    RECENT_XP: (studentId: string, windowDays: number) => ['recent-xp', studentId, windowDays] as const,
    TOTAL_XP: (studentId: string) => ['total-xp', studentId] as const,
    TOTAL_XP_V2: (studentId: string) => ['total-xp-v2', studentId] as const,
    QUALITATIVE_XP: (studentId: string) => ['qualitative-xp', studentId] as const,

    // ============================================================================
    // Technical Skills Data
    // ============================================================================
    EVALUACIONES_TECNICAS: ['evaluacionesTecnicas'] as const,
    EVALUACIONES_TECNICAS_STUDENT: (studentId: string) => ['evaluacionesTecnicas', studentId] as const,

    FEEDBACKS_SEMANAL: ['feedbacksSemanal'] as const,
    FEEDBACKS_SEMANAL_STUDENT: (studentId: string) => ['feedbacksSemanal', studentId] as const,

    // ============================================================================
    // Processed/Computed Skills Data
    // ============================================================================
    STUDENT_SKILLS_PROCESSED: (studentId: string) => ['student-skills-processed', studentId] as const,
    HABILIDADES_STATS: (studentId: string) => ['habilidades-stats', studentId] as const,

    // ============================================================================
    // Users & Profiles
    // ============================================================================
    USERS: ['users'] as const,
    ALL_USERS: ['allUsers'] as const,
    PROFESORES: ['profesores'] as const,
    STUDENT_PROFILE: (studentId: string) => ['student-profile', studentId] as const,

    // ============================================================================
    // Sessions & Blocks
    // ============================================================================
    REGISTROS_SESION: ['registrosSesion'] as const,
    REGISTROS_BLOQUE: ['registrosBloque'] as const,

    // ============================================================================
    // Assignments & Plans
    // ============================================================================
    ASIGNACIONES: ['asignaciones'] as const,
    ASIGNACIONES_PROF: ['asignacionesProf'] as const,
    PLANES: ['planes'] as const,
    PIEZAS: ['piezas'] as const,
    BLOQUES: ['bloques'] as const,

    // ============================================================================
    // Calendar & Progress
    // ============================================================================
    CALENDAR_SUMMARY: ['calendarSummary'] as const,
    PROGRESS_SUMMARY: ['progressSummary'] as const,

    // ============================================================================
    // Levels System
    // ============================================================================
    LEVEL_CONFIGS_ALL: ['level-configs-all'] as const,
    LEVEL_CONFIG: (level: number) => ['level-config', level] as const,

    // ============================================================================
    // Other
    // ============================================================================
    SEED_STATS: ['seedStats'] as const,
    STUDENT_BACKPACK: (studentId: string) => ['studentBackpack', studentId] as const,
    MEDIA_ASSETS: ['media_assets'] as const,
    ERROR_REPORTS: ['error-reports'] as const,
    SUPPORT_TICKETS: ['support-tickets'] as const,
    SUPPORT_MENSAJES: (ticketId: string) => ['support-mensajes', ticketId] as const,
    SUPPORT_TICKET: (ticketId: string) => ['support-ticket', ticketId] as const,

    // ============================================================================
    // Invalidation Helpers
    // ============================================================================

    /**
     * Invalidate all technical skills data for a specific student
     * Use after creating/updating evaluations or adding XP
     */
    invalidateStudentSkills: (queryClient: QueryClient, studentId: string) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVALUACIONES_TECNICAS });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_XP_ALL });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_SKILLS_PROCESSED(studentId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HABILIDADES_STATS(studentId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_XP(studentId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_XP(studentId, 30) });
    },

    /**
     * Invalidate all XP-related data (use after session completion)
     */
    invalidateAllXP: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_XP_ALL });
        queryClient.invalidateQueries({ queryKey: ['student-xp'] }); // Prefix match
        queryClient.invalidateQueries({ queryKey: ['total-xp'] }); // Prefix match
        queryClient.invalidateQueries({ queryKey: ['recent-xp'] }); // Prefix match
    },

    /**
     * Invalidate calendar and progress summaries
     */
    invalidateCalendarAndProgress: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CALENDAR_SUMMARY });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS_SUMMARY });
    },
} as const;
