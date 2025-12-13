/**
 * Utility functions for exercise variations and mode logic
 * 
 * Foco mode: Uses full exercise material and time
 * Repaso mode: Random variation selection based on student level
 */

import type { Variation } from '@/types/domain';

/**
 * Filter variations eligible for a student's level
 * @param variations - Array of exercise variations
 * @param studentLevel - Student's technical level (1-10)
 * @returns Array of eligible variations
 */
export function getEligibleVariations(
    variations: Variation[],
    studentLevel: number
): Variation[] {
    if (!variations || variations.length === 0) return [];
    return variations.filter(v => (v.nivelMinimo || 1) <= studentLevel);
}

/**
 * Select a random variation from eligible ones
 * @param variations - Array of exercise variations
 * @param studentLevel - Student's technical level (1-10)
 * @returns A randomly selected eligible variation, or null if none
 */
export function selectRandomVariation(
    variations: Variation[],
    studentLevel: number
): Variation | null {
    const eligible = getEligibleVariations(variations, studentLevel);
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Get exercise duration based on mode
 * @param ejercicio - The exercise object with duracionSeg and variations
 * @param mode - 'foco' (full exercise) or 'repaso' (random variation)
 * @param studentLevel - Student's level for variation filtering
 * @returns Duration in seconds
 */
export function getExerciseDuration(
    ejercicio: { duracionSeg?: number; variations?: Variation[] },
    mode: 'foco' | 'repaso',
    studentLevel: number
): number {
    // Foco mode always uses the full exercise duration
    if (mode === 'foco') {
        return ejercicio.duracionSeg || 0;
    }

    // Repaso mode: try to get variation duration
    const variation = selectRandomVariation(ejercicio.variations || [], studentLevel);

    // If variation has duration, use it; otherwise fallback to exercise duration
    return variation?.duracionSeg || ejercicio.duracionSeg || 0;
}

/**
 * Calculate total session time considering exercise modes
 * @param bloques - Array of exercise blocks with modo field
 * @param studentLevel - Student's level for variation duration calculation
 * @returns Object with focoTime, repasoTime, and totalTime
 */
export function calculateSessionTime(
    bloques: Array<{
        duracionSeg?: number;
        variations?: Variation[];
        modo?: 'foco' | 'repaso';
        tipo?: string;
    }>,
    studentLevel: number
): { focoTime: number; repasoTime: number; totalTime: number } {
    let focoTime = 0;
    let repasoTime = 0;

    bloques.forEach(bloque => {
        // Skip AD (descanso/aviso) from time calculation
        if (bloque.tipo === 'AD') return;

        const mode = bloque.modo || 'foco';
        const duration = getExerciseDuration(bloque, mode, studentLevel);

        if (mode === 'foco') {
            focoTime += duration;
        } else {
            repasoTime += duration;
        }
    });

    return {
        focoTime,
        repasoTime,
        totalTime: focoTime + repasoTime
    };
}

/**
 * Prioritize exercises to fit within a time ceiling
 * Foco exercises have priority; repaso can be skipped
 * @param bloques - Array of exercise blocks
 * @param maxTime - Maximum session time in seconds
 * @param studentLevel - Student's level
 * @returns Filtered array of bloque codes that fit the time
 */
export function prioritizeExercises(
    bloques: Array<{
        code: string;
        duracionSeg?: number;
        variations?: Variation[];
        modo?: 'foco' | 'repaso';
        tipo?: string;
    }>,
    maxTime: number,
    studentLevel: number
): string[] {
    // Always include AD blocks (they're informational)
    const adBlocks = bloques.filter(b => b.tipo === 'AD').map(b => b.code);

    // Split into foco and repaso
    const focoBloques = bloques.filter(b => (b.modo || 'foco') === 'foco' && b.tipo !== 'AD');
    const repasoBloques = bloques.filter(b => b.modo === 'repaso' && b.tipo !== 'AD');

    const includedCodes: string[] = [...adBlocks];
    let usedTime = 0;

    // First, include all foco exercises (high priority)
    focoBloques.forEach(bloque => {
        const duration = getExerciseDuration(bloque, 'foco', studentLevel);
        usedTime += duration;
        includedCodes.push(bloque.code);
    });

    // Then, include repaso exercises while under the ceiling
    repasoBloques.forEach(bloque => {
        const duration = getExerciseDuration(bloque, 'repaso', studentLevel);
        if (usedTime + duration <= maxTime) {
            usedTime += duration;
            includedCodes.push(bloque.code);
        }
    });

    return includedCodes;
}
