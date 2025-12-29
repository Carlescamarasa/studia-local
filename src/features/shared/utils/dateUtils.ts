/**
 * Shared Date Utilities
 * 
 * Consolidated from:
 * - cuaderno/utils/dateHelpers.ts
 * - progreso/utils/progresoUtils.ts
 * - calendar/components/utils.ts
 */

// ==================== Core Helpers ====================

export const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Formats a Date to ISO local string (YYYY-MM-DD)
 * Handles both Date objects and ISO strings
 */
export const formatLocalDate = (d: Date | string | null): string => {
    if (!d) return '';
    if (typeof d === 'string') {
        return d.split('T')[0]; // Extract date part from ISO string
    }
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Parses an ISO date string (YYYY-MM-DD) to Date object
 */
export const parseLocalDate = (s: string | null): Date => {
    if (!s) return new Date();
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Returns the Monday of the ISO week for a given date
 */
export const startOfMonday = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
};

/**
 * Returns the Sunday of the ISO week for a given date
 */
export const endOfSunday = (date: Date): Date => {
    const lunes = startOfMonday(date);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return domingo;
};

/**
 * Calculate ISO 8601 week number
 */
export const isoWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 * Get ISO Monday date string for current week
 */
export const calcularLunesSemanaISO = (date: Date): string => {
    return formatLocalDate(startOfMonday(date));
};

/**
 * Check if a date is between start and end (inclusive)
 */
export function isBetween(date: Date, start: string | Date | null, end: string | Date | null): boolean {
    if (!start || !end) return true;
    const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
    const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;
    return date >= dStart && date <= dEnd;
}

/**
 * Determines the optimal granularity (day/week/month) for a date range
 */
export function getBucketSpec(start: string | Date, end: string | Date): string {
    if (!start || !end) return 'dia';

    const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
    const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;

    if (!dStart || !dEnd) return 'dia';

    const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 14) return 'dia';
    if (diffDays <= 90) return 'semana';
    return 'mes';
}
