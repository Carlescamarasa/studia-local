/**
 * Date helper functions for cuaderno feature
 */

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export const formatLocalDate = (d: Date): string =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseLocalDate = (s: string): Date => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};

export const startOfMonday = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
};

/**
 * Calculate week number (ISO 8601)
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
