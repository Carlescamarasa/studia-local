/**
 * Date helper functions for cuaderno feature
 * 
 * Re-exported from shared utilities for backward compatibility.
 * New code should import directly from @/features/shared/utils/dateUtils
 */

export {
    pad2,
    formatLocalDate,
    parseLocalDate,
    startOfMonday,
    isoWeekNumber,
    calcularLunesSemanaISO,
} from '@/features/shared/utils/dateUtils';
