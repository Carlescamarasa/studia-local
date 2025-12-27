/**
 * Centralized exports for all progreso feature hooks
 * 
 * Usage:
 *   import { useXP, useEstadisticas, useHabilidadesStats } from '@/features/progreso/hooks';
 */

// XP and Level Management
export {
    useRecentXP,
    useRecentEvaluationXP,
    useRecentManualXP,
    useAllStudentXPTotals,
    useLifetimePracticeXP,
    useTotalXP,
    totalXPToObject,
    useTotalXPMultiple,
    useLifetimePracticeXPMultiple,
    useAggregateLevelGoals,
    type AggregateLevelGoalsResult,
} from './useXP';

// Statistics and KPIs
export {
    useEstadisticas,
    safeNumber,
} from './useEstadisticas';

// Skills Data
export {
    useHabilidadesStats,
    useHabilidadesStatsMultiple,
} from './useHabilidadesStats';

export {
    useStudentSkillsData,
    type ProcessedSkillsData,
} from './useStudentSkillsData';

export {
    useStudentSkillsRadar,
} from './useStudentSkillsRadar';
