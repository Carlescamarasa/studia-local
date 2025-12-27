import { differenceInDays, parseISO } from 'date-fns';

/**
 * Backpack status types
 */
export type BackpackStatus = 'nuevo' | 'en_progreso' | 'dominado' | 'oxidado' | 'archivado';

/**
 * Get days since last practice for a backpack item
 * @param item - Backpack item with last_practiced_at field
 * @param now - Reference date (defaults to current date)
 * @returns Number of days since last practice, or null if never practiced
 */
export function getDaysSinceLastPractice(
    item: { lastPracticedAt?: string | null; last_practiced_at?: string | null },
    now: Date = new Date()
): number | null {
    const lastPracticed = item.lastPracticedAt || item.last_practiced_at;

    if (!lastPracticed) {
        return null;
    }

    try {
        const lastDate = typeof lastPracticed === 'string'
            ? parseISO(lastPracticed)
            : new Date(lastPracticed);

        return differenceInDays(now, lastDate);
    } catch {
        return null;
    }
}

/**
 * Get derived backpack status based on time since last practice
 * 
 * Rules:
 * - If lastPracticedAt is null/undefined -> returns item.status (no derivation)
 * - If > 6 months (180 days) since last practice -> 'archivado'
 * - If > 3 months (90 days) since last practice -> 'oxidado'
 * - Otherwise -> returns item.status
 * 
 * @param item - Backpack item with status and lastPracticedAt fields
 * @param now - Reference date (defaults to current date)
 * @returns Derived status
 */
export function getDerivedBackpackStatus(
    item: {
        status: BackpackStatus;
        lastPracticedAt?: string | null;
        last_practiced_at?: string | null;
    },
    now: Date = new Date()
): BackpackStatus {
    const daysSince = getDaysSinceLastPractice(item, now);

    // No derivation if never practiced
    if (daysSince === null) {
        return item.status;
    }

    // Archived if > 6 months (180 days)
    if (daysSince > 180) {
        return 'archivado';
    }

    // Oxidado if > 3 months (90 days)
    if (daysSince > 90) {
        return 'oxidado';
    }

    // Otherwise, return original status
    return item.status;
}
