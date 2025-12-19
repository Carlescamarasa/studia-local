import { localDataClient } from "@/api/localDataClient";
import {
    LevelConfig,
    LevelKeyCriteria,
    StudentCriteriaStatus,
    StudentLevelHistory,
    RegistroSesion,
    RegistroBloque
} from "@/types/domain";

// --- XP Calculation ---

/**
 * Calculates XP for Flex, Motr, Art based on recent practice.
 * 
 * @param studentId The ID of the student.
 * @param windowDays The number of days to look back for practice data.
 * @returns An object with XP values (0-100) for each skill.
 */
import { computeTotalXP } from "@/services/xpService";

/**
 * Calculates XP for Flex, Motr, Art based on total accumulated XP.
 * 
 * @param studentId The ID of the student.
 * @param windowDays Ignored for now as we use total accumulated XP.
 * @returns An object with XP values for each skill.
 */
export async function computePracticeXP(studentId: string, windowDays: number = 30): Promise<{ flex: number; motr: number; art: number }> {
    const totals = await computeTotalXP(studentId);

    const xp = {
        flex: 0,
        motr: 0,
        art: 0
    };

    totals.forEach(t => {
        if (t.skill === 'motricidad') xp.motr = t.totalXp;
        if (t.skill === 'articulacion') xp.art = t.totalXp;
        if (t.skill === 'flexibilidad') xp.flex = t.totalXp;
    });

    return xp;
}

// --- Criteria Status ---

export interface CriteriaStatusResult {
    criterion: LevelKeyCriteria;
    status: 'PASSED' | 'FAILED' | 'PENDING';
}

/**
 * Computes the status of key criteria for a specific level.
 */
export async function computeKeyCriteriaStatus(studentId: string, level: number): Promise<CriteriaStatusResult[]> {
    // 1. Fetch criteria for the level
    const allCriteria = await localDataClient.entities.LevelKeyCriteria.list();
    const levelCriteria = allCriteria.filter((c: LevelKeyCriteria) => c.level === level);

    // 2. Fetch student status overrides
    const allStatus = await localDataClient.entities.StudentCriteriaStatus.list();
    const studentStatus = allStatus.filter((s: any) => s.studentId === studentId);

    const results: CriteriaStatusResult[] = [];

    for (const criterion of levelCriteria) {
        let status: 'PASSED' | 'FAILED' | 'PENDING' = 'PENDING';

        if (criterion.source === 'PROF') {
            // Check for manual override
            const record = studentStatus.find((s: any) => s.criterionId === criterion.id);
            if (record) {
                status = record.status;
            }
        } else if (criterion.source === 'PRACTICA') {
            // TODO: Implement automatic practice criteria check
            // For now, default to PENDING or check if manually overridden (optional feature)
            status = 'PENDING';
        }

        results.push({ criterion, status });
    }

    return results;
}

// --- Promotion Logic ---

export interface PromotionCheckResult {
    allowed: boolean;
    missing: string[];
    xp: { flex: number; motr: number; art: number };
    criteria: CriteriaStatusResult[];
    config?: LevelConfig;
}

/**
 * Checks if a student can be promoted to the next level.
 */
export async function canPromote(studentId: string, currentLevel: number): Promise<PromotionCheckResult> {
    const nextLevel = currentLevel + 1;

    // 1. Get Config for CURRENT level (requirements to EXIT current level)
    const allConfigs = await localDataClient.entities.LevelConfig.list();
    const config = allConfigs.find((c: any) => c.level === currentLevel);

    if (!config) {
        // No config for current level means we can promote freely (or it's level 0)
        return { allowed: true, missing: [], xp: { flex: 0, motr: 0, art: 0 }, criteria: [] };
    }

    // 2. Check XP against CURRENT level requirements
    // Use camelCase for evidenceWindowDays
    const xp = await computePracticeXP(studentId, config.evidenceWindowDays || 30);
    const missing: string[] = [];

    // Use camelCase for minXp...
    if (xp.flex < (config.minXpFlex || 0)) missing.push(`Flexibilidad XP: ${xp.flex}/${config.minXpFlex}`);
    if (xp.motr < (config.minXpMotr || 0)) missing.push(`Motricidad XP: ${xp.motr}/${config.minXpMotr}`);
    if (xp.art < (config.minXpArt || 0)) missing.push(`Articulación XP: ${xp.art}/${config.minXpArt}`);

    // 3. Check Criteria for CURRENT level (criteria needed to EXIT current level)
    const criteria = await computeKeyCriteriaStatus(studentId, currentLevel);
    const failedRequired = criteria.filter(c => c.criterion.required && c.status !== 'PASSED');

    if (failedRequired.length > 0) {
        failedRequired.forEach(c => missing.push(`Criterio no cumplido: ${c.criterion.description}`));
    }

    return {
        allowed: missing.length === 0,
        missing,
        xp,
        criteria,
        config
    };
}

/**
 * Executes the promotion of a student.
 */
export async function promoteLevel(studentId: string, newLevel: number, reason: string, authorId: string): Promise<void> {
    // 1. Update User Profile
    // We need to fetch the user first to get current data
    const user = await localDataClient.entities.User.get(studentId);
    if (!user) throw new Error('User not found');

    const oldLevel = user.nivelTecnico || 0;

    await localDataClient.entities.User.update(studentId, {
        nivelTecnico: newLevel,
        // Update legacy string level if needed, or keep it synced
        // nivel: `Nivel ${newLevel}` 
    });

    // 2. Log History
    const historyEntry: any = { // Type casting to avoid strict type issues with ID generation if not handled by client
        studentId: studentId,
        fromLevel: oldLevel,
        toLevel: newLevel,
        changedAt: new Date().toISOString(),
        changedBy: authorId,
        reason: reason
    };

    console.log('DEBUG: Creating StudentLevelHistory with:', historyEntry);
    console.log('DEBUG: studentId type:', typeof studentId, 'value:', studentId);
    console.log('DEBUG: authorId type:', typeof authorId, 'value:', authorId);

    await localDataClient.entities.StudentLevelHistory.create(historyEntry);
}
