import { localDataClient } from '@/api/localDataClient';

/**
 * XP Service - Manages student experience points (XP) for skill tracking
 */

export interface StudentXPTotal {
    id: string;
    studentId: string;
    skill: 'motricidad' | 'articulacion' | 'flexibilidad';
    totalXp: number;
    practiceXp: number;
    evaluationXp: number;
    lastUpdatedAt: string;
    lastManualXpAt?: string;
    lastManualXpAmount?: number;
}

export interface RecentXPResult {
    motricidad: number;
    articulacion: number;
    flexibilidad: number;
}

export type XPSkill = 'motricidad' | 'articulacion' | 'flexibilidad';
export type XPSource = 'BLOCK' | 'PROF';

/**
 * Compute XP from recent practice blocks (last N days)
 * Returns XP per skill based on blocks completed in the time window
 * 
 * @param studentId - Student ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns Object with XP per skill (uncapped)
 */
export async function computePracticeXP(
    studentId: string,
    windowDays: number = 30
): Promise<RecentXPResult> {
    try {
        // Get all completed blocks for the student (RegistroBloque)
        const allBlocks = await localDataClient.entities.RegistroBloque.list();

        // Filter blocks completed in the last N days for this student
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - windowDays);

        const recentBlocks = allBlocks.filter((block: any) => {
            if (block.alumnoId !== studentId) return false;
            if (block.estado !== 'completado') return false;
            if (!block.completadoEn) return false;
            const completedDate = new Date(block.completadoEn);
            return completedDate >= cutoffDate;
        });

        // Accumulate XP per skill
        const xp: RecentXPResult = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0
        };

        recentBlocks.forEach((block: any) => {
            // Calculate XP based on BPM achieved vs target
            const earnedXP = calculateXPFromBlock(block);

            // Distribute XP to relevant skills based on block type
            // For now, distribute evenly - this can be refined later
            xp.motricidad += earnedXP / 3;
            xp.articulacion += earnedXP / 3;
            xp.flexibilidad += earnedXP / 3;
        });

        return xp;
    } catch (error) {
        console.error('Error computing practice XP:', error);
        return { motricidad: 0, articulacion: 0, flexibilidad: 0 };
    }
}

/**
 * Compute lifetime practice XP (all time)
 * Wrapper around computePracticeXP with a large window
 * 
 * @param studentId - Student ID
 * @returns Object with XP per skill (uncapped)
 */
export async function computeLifetimePracticeXP(
    studentId: string
): Promise<RecentXPResult> {
    try {
        const totals = await localDataClient.entities.StudentXPTotal.filter({ studentId });

        const result: RecentXPResult = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0
        };

        totals.forEach((t: any) => {
            const skill = t.skill as XPSkill;
            if (skill in result) {
                // Use practiceXp column, fallback to 0
                result[skill] = t.practiceXp || t.practice_xp || 0;
            }
        });

        return result;
    } catch (error) {
        console.error('Error computing lifetime practice XP:', error);
        return { motricidad: 0, articulacion: 0, flexibilidad: 0 };
    }
}

/**
 * Calculate XP earned from a single block based on performance
 * 
 * @param block - RegistroBloque object
 * @returns XP amount (base 0-100)
 */
function calculateXPFromBlock(block: any): number {
    // Check if block has BPM data
    if (!block.ppmObjetivo || !block.ppmAlcanzado?.bpm) return 0;

    const target = block.ppmObjetivo.bpm;
    const achieved = block.ppmAlcanzado.bpm;
    const ratio = achieved / target;

    // XP scales with performance
    if (ratio >= 1.0) return 100; // Met or exceeded target
    if (ratio >= 0.9) return 80;  // Close to target
    if (ratio >= 0.75) return 60; // Moderate achievement
    if (ratio >= 0.5) return 40;  // Partial achievement
    return 20; // Minimum for attempting
}

/**
 * Compute qualitative evaluation scores from recent professor evaluations
 * Returns Sonido and Cognición scaled from 0-10 to 0-100
 * 
 * @param studentId - Student ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns Sonido and Cognición scores (0-100 scale)
 */
export async function computeEvaluationXP(
    studentId: string,
    windowDays: number = 30
): Promise<{ sonido: number; cognicion: number }> {
    try {
        const allEvaluations = await localDataClient.entities.EvaluacionTecnica.list();

        // Filter evaluations for this student in the last N days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - windowDays);

        const recentEvaluations = allEvaluations.filter((evaluation: any) => {
            if (evaluation.alumnoId !== studentId) return false;
            if (!evaluation.fecha) return false;
            const evalDate = new Date(evaluation.fecha);
            return evalDate >= cutoffDate;
        });

        if (recentEvaluations.length === 0) {
            return { sonido: 0, cognicion: 0 };
        }

        // Get most recent evaluation
        // Get most recent evaluation
        // Sort by date descending, then by creation time/ID if available to break ties
        const latest = recentEvaluations.sort((a: any, b: any) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            if (dateA !== dateB) return dateB - dateA;

            // If dates are equal, try to use created_at/createdAt if available, or id
            // Handle both snake_case (DB) and camelCase (API)
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);

            if (createdA !== createdB) return createdB - createdA;

            // Fallback to ID comparison if timestamps are missing or equal
            return (b.id || '').localeCompare(a.id || '');
        })[0];

        if (!latest.habilidades) {
            return { sonido: 0, cognicion: 0 };
        }

        // Scale from 0-10 to 0-100
        const sonido = (latest.habilidades.sonido || 0) * 10;
        const cognicion = (latest.habilidades.cognitivo || 0) * 10;

        return { sonido, cognicion };
    } catch (error) {
        console.error('Error computing evaluation XP:', error);
        return { sonido: 0, cognicion: 0 };
    }
}


/**
 * Compute manual XP adjustments from professor evaluations (last N days)
 * Returns XP for Mot/Art/Flex that was manually awarded by professors
 * 
 * @param studentId - Student ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns XP for motricidad, articulacion, flexibilidad from professor adjustments
 */
export async function computeManualXP(
    studentId: string,
    windowDays: number = 30
): Promise<{ motricidad: number; articulacion: number; flexibilidad: number }> {
    try {
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - windowDays);

        // Get all XP totals for this student
        const xpRecords = await localDataClient.entities.StudentXPTotal.filter({ studentId });

        const result = {
            motricidad: 0,
            articulacion: 0,
            flexibilidad: 0
        };

        // For each skill, check if manual XP was awarded recently
        xpRecords.forEach((record: any) => {
            if (record.lastManualXpAt && record.lastManualXpAmount) {
                const manualDate = new Date(record.lastManualXpAt);
                if (manualDate >= cutoffDate) {
                    // Manual XP is within window, include it
                    const skill = record.skill as 'motricidad' | 'articulacion' | 'flexibilidad';
                    result[skill] = Math.min(100, Math.abs(record.lastManualXpAmount));
                }
            }
        });

        return result;
    } catch (error) {
        console.error('Error computing manual XP:', error);
        return { motricidad: 0, articulacion: 0, flexibilidad: 0 };
    }
}

export async function addXP(
    studentId: string,
    skill: XPSkill,
    amount: number,
    source: XPSource,
    timestamp?: string
): Promise<void> {
    try {
        // Get current total XP for this skill
        const existing = await localDataClient.entities.StudentXPTotal.filter({
            studentId,
            skill
        });

        const currentRecord = existing.length > 0 ? existing[0] : null;

        // Get current values (handling snake_case from DB if needed via snakeToCamel in API)
        const currentPractice = currentRecord?.practiceXp || currentRecord?.practice_xp || 0;
        const currentEvaluation = currentRecord?.evaluationXp || currentRecord?.evaluation_xp || 0;

        let newPractice = currentPractice;
        let newEvaluation = currentEvaluation;

        // Update specific bucket based on source
        if (source === 'BLOCK') {
            newPractice = Math.max(0, currentPractice + amount);
        } else if (source === 'PROF') {
            newEvaluation = Math.max(0, currentEvaluation + amount);
        }

        // Total is always the sum
        const newTotal = newPractice + newEvaluation;
        const now = timestamp || new Date().toISOString();

        if (currentRecord) {
            // Update existing record
            const updateData: any = {
                totalXp: newTotal,
                practiceXp: newPractice,
                evaluationXp: newEvaluation,
                lastUpdatedAt: now
            };

            // If source is PROF, also track manual XP separately for radar
            if (source === 'PROF') {
                updateData.lastManualXpAt = now;
                updateData.lastManualXpAmount = amount; // Store the delta
            }

            await localDataClient.entities.StudentXPTotal.update(currentRecord.id, updateData);
        } else {
            // Create new record
            const createData: any = {
                studentId,
                skill,
                totalXp: newTotal,
                practiceXp: newPractice,
                evaluationXp: newEvaluation,
                lastUpdatedAt: now
            };

            // If source is PROF, also track manual XP
            if (source === 'PROF') {
                createData.lastManualXpAt = now;
                createData.lastManualXpAmount = amount;
            }

            await localDataClient.entities.StudentXPTotal.create(createData);
        }

        console.log(`[XP] Added ${amount} XP to ${skill} for student ${studentId} (source: ${source}). New Total: ${newTotal}`);
    } catch (error) {
        console.error('Error adding XP:', error);
        throw error;
    }
}

/**
 * Get total accumulated XP for all skills for a student
 * 
 * @param studentId - Student ID
 * @returns Array of XP totals per skill
 */
export async function computeTotalXP(studentId: string): Promise<StudentXPTotal[]> {
    try {
        const totals = await localDataClient.entities.StudentXPTotal.filter({ studentId });
        return totals as StudentXPTotal[];
    } catch (error) {
        console.error('Error computing total XP:', error);
        return [];
    }
}

/**
 * Migration utility: Sync XP totals with existing block data
 * Recalculates all XP from blocks and updates student_xp_total
 * 
 * @param studentId - Optional student ID (if not provided, syncs all students)
 */
export async function syncXPWithBloques(studentId?: string): Promise<void> {
    try {
        console.log('[XP Migration] Starting sync...');

        let students: any[] = [];

        if (studentId) {
            const student = await localDataClient.entities.User.get(studentId);
            if (student) students = [student];
        } else {
            students = await localDataClient.entities.User.list();
        }

        for (const student of students) {
            console.log(`[XP Migration] Processing student ${student.id}...`);

            // Get all completed blocks for this student
            const blocks = await localDataClient.entities.RegistroBloque.list();

            const completedBlocks = blocks.filter((b: any) =>
                b.alumnoId === student.id && b.estado === 'completado' && b.completadoEn
            );

            // Accumulate XP per skill
            const xp: Record<XPSkill, number> = {
                motricidad: 0,
                articulacion: 0,
                flexibilidad: 0
            };

            completedBlocks.forEach((block: any) => {
                const earnedXP = calculateXPFromBlock(block);

                if (block.tipo === 'tecnica') {
                    xp.motricidad += earnedXP * 0.6;
                    xp.articulacion += earnedXP * 0.4;
                } else if (block.tipo === 'flexibilidad') {
                    xp.flexibilidad += earnedXP;
                } else {
                    xp.motricidad += earnedXP / 3;
                    xp.articulacion += earnedXP / 3;
                    xp.flexibilidad += earnedXP / 3;
                }
            });

            // Update totals in database
            for (const skill of ['motricidad', 'articulacion', 'flexibilidad'] as XPSkill[]) {
                await addXP(student.id, skill, xp[skill], 'BLOCK');
            }

            console.log(`[XP Migration] Completed for student ${student.id}`);
        }

        console.log('[XP Migration] Sync complete!');
    } catch (error) {
        console.error('[XP Migration] Error during sync:', error);
        throw error;
    }
}

/**
 * Cap XP values at a maximum for visualization purposes
 * 
 * @param xp - XP object to cap
 * @param max - Maximum value (default: 100)
 * @returns Capped XP object
 */
export function capXPForDisplay(xp: RecentXPResult, max: number = 100): RecentXPResult {
    return {
        motricidad: Math.min(xp.motricidad, max),
        articulacion: Math.min(xp.articulacion, max),
        flexibilidad: Math.min(xp.flexibilidad, max)
    };
}
