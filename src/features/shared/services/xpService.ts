import { localDataClient } from '@/api/localDataClient';
import { QUERY_KEYS } from '@/lib/queryKeys';

/**
 * XP Service - Manages student experience points (XP) for skill tracking
 */

import { StudentXPTotal, XPSkill, XPSource, RecentXPResult } from '@/features/shared/types/domain';

/**
 * Compute XP from recent practice blocks (last N days)
 * Returns XP per skill based on blocks completed in the time window
 * 
 * @param studentId - Student ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns Object with XP per skill (uncapped)
 */
/**
 * computePracticeXP returns SCORED values (0-100).
 * This function returns the RAW values (earned / max) for aggregation.
 */
export async function computePracticeXPDetails(
    studentId: string,
    windowDays: number = 30
): Promise<BlockXPBreakdown> {
    try {
        const allBlocks = await localDataClient.entities.RegistroBloque.filter({ alumnoId: studentId });
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - windowDays);
        const cutoffISO = cutoffDate.toISOString();

        const recentBlocks = allBlocks.filter((block: any) => {
            const blockDate = block.created_at || block.createdAt || block.inicioISO;
            if (!blockDate) return false;
            return blockDate >= cutoffISO;
        });

        const acc = {
            motricidad: { earned: 0, max: 0 },
            articulacion: { earned: 0, max: 0 },
            flexibilidad: { earned: 0, max: 0 }
        };

        recentBlocks.forEach((block: any) => {
            const breakdown = calculateXPFromBlock(block);
            acc.motricidad.earned += breakdown.motricidad.earned;
            acc.motricidad.max += breakdown.motricidad.max;

            acc.articulacion.earned += breakdown.articulacion.earned;
            acc.articulacion.max += breakdown.articulacion.max;

            acc.flexibilidad.earned += breakdown.flexibilidad.earned;
            acc.flexibilidad.max += breakdown.flexibilidad.max;
        });

        return acc;
    } catch (error) {
        console.error('Error computing practice XP details:', error);
        return {
            motricidad: { earned: 0, max: 0 },
            articulacion: { earned: 0, max: 0 },
            flexibilidad: { earned: 0, max: 0 }
        };
    }
}

export async function computePracticeXP(
    studentId: string,
    windowDays: number = 30
): Promise<RecentXPResult> {
    const details = await computePracticeXPDetails(studentId, windowDays);

    const calculateScore = (earned: number, max: number) => {
        if (max === 0) return 0;
        return (earned / max) * 100;
    };

    return {
        motricidad: calculateScore(details.motricidad.earned, details.motricidad.max),
        articulacion: calculateScore(details.articulacion.earned, details.articulacion.max),
        flexibilidad: calculateScore(details.flexibilidad.earned, details.flexibilidad.max)
    };
}

/**
 * Compute lifetime practice XP (all time)
 * Wrapper around computePracticeXP with a large window
 * 
 * NOTE: This is a data processor function (not a React hook).
 * Direct API calls are appropriate here. For UI components/hooks,
 * use useAllStudentXPTotals() or derived hooks to leverage React Query cache.
 * 
 * @param studentId - Student ID
 * @returns Object with XP per skill (uncapped)
 */
export async function computeLifetimePracticeXP(
    studentId: string
): Promise<RecentXPResult> {
    try {
        // Direct API call is OK in service functions (not React hooks)
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
 * Breakdown of XP earned per skill
 */
export interface BlockXPBreakdown {
    motricidad: { earned: number; max: number };
    articulacion: { earned: number; max: number };
    flexibilidad: { earned: number; max: number };
}

/**
 * Calculate XP earned from a single block based on performance
 * Returns breakdown of earned vs max points per skill
 */
export function calculateXPFromBlock(block: any): BlockXPBreakdown {
    const result: BlockXPBreakdown = {
        motricidad: { earned: 0, max: 0 },
        articulacion: { earned: 0, max: 0 },
        flexibilidad: { earned: 0, max: 0 }
    };

    if (block.estado !== 'completado') return result;

    // 1. Calculate Raw Ratio (0.0 - 1.0)
    // Support both snake_case (from DB) and camelCase (from code)
    const targetRaw = block.ppm_objetivo ?? block.ppmObjetivo;
    const reachedRaw = block.ppm_alcanzado ?? block.ppmAlcanzado;

    const target = typeof targetRaw === 'object' ? (targetRaw?.bpm || 0) : Number(targetRaw);
    const reached = typeof reachedRaw === 'object' ? (reachedRaw?.bpm || 0) : Number(reachedRaw);

    if (!target || target === 0) return result; // Avoid division by zero

    let ratio = reached / target;
    // Cap at 1.0 (100%)
    if (ratio > 1) ratio = 1;

    // 2. Identify Skills involved (support both snake_case and camelCase)
    const skills = (block.skills || block.skill_tags || block.skillTags || []) as string[];

    // Normalize skills to our 3 main categories
    const relevantSkills: ('motricidad' | 'articulacion' | 'flexibilidad')[] = [];

    skills.forEach(tag => {
        const t = tag.toLowerCase();
        if (t.includes('motricidad')) relevantSkills.push('motricidad');
        if (t.includes('articulaci')) relevantSkills.push('articulacion'); // Matches Articulación, Articulacion
        if (t.includes('flexibilidad')) relevantSkills.push('flexibilidad');
    });

    // If no relevant skills found, do not award stats (or maybe fallback? User said others don't count)
    if (relevantSkills.length === 0) return result;

    // 3. Distribute Weight
    // If multiple skills, split the "Max Point" (1.0) among them?
    // OR does each skill get the full ratio?
    // User said: "50% motricidad, 50% articulacion". This implies the TOTAL value of the block is shared.
    // Let's assume the block represents "1 unit of work". 
    // If it's pure Motricidad, then Motricidad Max = 1, Earned = ratio.
    // If it's 50/50, then Motricidad Max = 0.5, Earned = 0.5 * ratio.

    const weightPerSkill = 1.0 / relevantSkills.length; // Normalized to 1.0 total per block

    // However, for "Rango" (Volume), usually you want the SUM of work. 
    // If I practice 10 mins of Mot+Art, did I do 5 mins Mot and 5 mins Art? Yes, logically.
    // So splitting the weight makes sense for Volume aggregation.

    relevantSkills.forEach(skill => {
        result[skill].max += weightPerSkill;
        result[skill].earned += ratio * weightPerSkill;
    });

    return result;
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
        const allFeedbacks = await localDataClient.entities.FeedbackSemanal.list();

        // Filter for this student in the last N days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - windowDays);

        // 1. Process Evaluations
        const relevantEvaluations = allEvaluations
            .filter((e: any) => e.alumnoId === studentId && e.fecha && new Date(e.fecha) >= cutoffDate)
            .map((e: any) => ({
                date: new Date(e.fecha),
                sonido: e.habilidades?.sonido,
                cognicion: e.habilidades?.cognitivo
            }));

        // 2. Process Feedbacks
        const relevantFeedbacks = allFeedbacks
            .filter((f: any) => f.alumnoId === studentId && (f.semanaInicioISO || f.created_at))
            .filter((f: any) => {
                const d = new Date(f.semanaInicioISO || f.created_at || f.createdAt);
                return d >= cutoffDate;
            })
            .map((f: any) => ({
                date: new Date(f.semanaInicioISO || f.created_at || f.createdAt),
                sonido: f.sonido,
                cognicion: f.cognicion
            }));

        // 3. Merge and Sort Descending
        const combined = [...relevantEvaluations, ...relevantFeedbacks].sort((a, b) => b.date.getTime() - a.date.getTime());

        if (combined.length === 0) {
            return { sonido: 0, cognicion: 0 };
        }

        // 4. Find latest non-null values
        // Note: Logic here is 0-10 scale. If XP Service expects 0-100, we multiply by 10.
        // Previous code: (latest.habilidades.sonido || 0) * 10;
        // So we keep the *10 scaling here for XP Service compatibility.

        const latestSonido = combined.find(r => r.sonido != null)?.sonido || 0;
        const latestCognicion = combined.find(r => r.cognicion != null)?.cognicion || 0;

        return {
            sonido: latestSonido * 10,
            cognicion: latestCognicion * 10
        };
    } catch (error) {
        console.error('Error computing evaluation XP:', error);
        return { sonido: 0, cognicion: 0 };
    }
}


/**
 * Compute manual XP adjustments from professor evaluations (last N days)
 * Returns XP for Mot/Art/Flex that was manually awarded by professors
 * 
 * NOTE: This is a data processor function (not a React hook).
 * Direct API calls are appropriate here. For UI components/hooks,
 * use useAllStudentXPTotals() or derived hooks to leverage React Query cache.
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

        // Direct API call is OK in service functions (not React hooks)
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

/**
 * Add XP to a student's skill total (mutation)
 * 
 * NOTE: Direct API calls for CREATE/UPDATE operations are appropriate
 * because this is a mutation, not a query. Mutations should invalidate
 * the React Query cache (which this function does automatically).
 */
export async function addXP(
    studentId: string,
    skill: XPSkill,
    amount: number,
    source: XPSource,
    timestamp?: string
): Promise<void> {
    try {
        // Direct API call is OK for mutations (CREATE/UPDATE operations)
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

        // Automatically invalidate relevant caches
        if (typeof window !== 'undefined' && (window as any).__queryClient) {
            const queryClient = (window as any).__queryClient;

            // Invalidate XP data (both global and student-specific)
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_XP_ALL });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_XP(studentId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_XP(studentId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECENT_XP(studentId, 30) });

            // Invalidate processed skills data (radar, stats)
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDENT_SKILLS_PROCESSED(studentId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HABILIDADES_STATS(studentId) });
        }
    } catch (error) {
        console.error('Error adding XP:', error);
        throw error;
    }
}

/**
 * Get total accumulated XP for all skills for a student
 * 
 * NOTE: This is a data processor function (not a React hook).
 * Direct API calls are appropriate here. For UI components/hooks,
 * use useTotalXP() to leverage React Query cache.
 * 
 * @param studentId - Student ID
 * @returns Array of XP totals per skill
 */
export async function computeTotalXP(studentId: string): Promise<StudentXPTotal[]> {
    try {
        // Direct API call is OK in service functions (not React hooks)
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

            // Get all completed blocks for this student - Filtered to avoid N+1/Full scan
            const blocks = await localDataClient.entities.RegistroBloque.filter({ alumnoId: student.id });

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
                const breakdown = calculateXPFromBlock(block);

                // For lifetime XP, we simply sum the earned component
                xp.motricidad += breakdown.motricidad.earned;
                xp.articulacion += breakdown.articulacion.earned;
                xp.flexibilidad += breakdown.flexibilidad.earned;
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
