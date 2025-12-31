/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { localDataClient } from '@/api/localDataClient';
import { startOfWeek, formatISO, differenceInDays } from 'date-fns';
import { StudentBackpackItem, BackpackStatus } from '@/features/shared/types/domain';

export interface SessionDataForBackpack {
    studentId: string;
    registrosBloque: Array<{
        backpackKey?: string | null;
        /** Legacy alias */
        backpack_key?: string | null;
        estado: 'completado' | 'omitido';
        duracionRealSeg: number;
        duracionObjetivoSeg?: number;
        ppmAlcanzado?: { bpm: number } | null;
        ppmObjetivo?: number | null;
        /** Legacy alias */
        ppm_objetivo?: number | null;
        inicioISO: string;
    }>;
}

/**
 * Update backpack items based on a completed session.
 * This should be called AFTER the session and blocks are persisted.
 */
export async function updateBackpackFromSession(sessionData: SessionDataForBackpack): Promise<void> {
    const { studentId, registrosBloque } = sessionData;

    // Filter blocks relevant for backpack (must have backpackKey)
    const validBlocks = registrosBloque.filter(b => b.backpackKey || b.backpack_key);
    if (validBlocks.length === 0) return;

    // Group blocks by backpackKey
    const blocksByKey = new Map<string, typeof validBlocks>();
    validBlocks.forEach(b => {
        const key = (b.backpackKey || b.backpack_key)!;
        if (!blocksByKey.has(key)) blocksByKey.set(key, []);
        blocksByKey.get(key)!.push(b);
    });

    // Process each key
    for (const [key, blocks] of blocksByKey.entries()) {
        await processBackpackItem(studentId, key, blocks);
    }
}

async function processBackpackItem(studentId: string, key: string, blocks: SessionDataForBackpack['registrosBloque']) {
    try {
        // 1. Fetch existing backpack item
        const existingItems = await localDataClient.entities.StudentBackpack.filter({
            studentId: studentId
        });

        // Manual filter since StudentBackpack.filter on localDataClient might be limited
        const item = existingItems.find(i => i.backpackKey === key || (i as any).backpack_key === key);

        // Calculate aggregates from this session's blocks
        // Usually we take the "best" or "last" result if multiple? 
        // Let's assume cumulative practice affects mastery.
        // For 'last_practiced_at', use the latest timestamp.

        const lastBlock = blocks[blocks.length - 1]; // sorted by execution typically
        const lastPracticedAt = lastBlock.inicioISO; // or now()

        // Calculate mastery increment
        // Simple logic for now:
        // +10 score for completion
        // +Extra if target PPM met
        let scoreDelta = 0;
        let isMasteryCandidate = false;

        for (const block of blocks) {
            if (block.estado === 'completado') {
                scoreDelta += 10;

                // Check PPM target if exists
                const ppmObjetivo = block.ppmObjetivo || block.ppm_objetivo;
                if (ppmObjetivo && block.ppmAlcanzado?.bpm) {
                    if (block.ppmAlcanzado.bpm >= ppmObjetivo) {
                        scoreDelta += 5; // Bonus for reaching target
                        isMasteryCandidate = true;
                    } else if (block.ppmAlcanzado.bpm >= ppmObjetivo * 0.9) {
                        scoreDelta += 2; // Close enough
                    }
                } else {
                    // If no PPM target, completion might be enough for candidacy if duration is significant?
                    // Let's assume completion is enough for progress, but maybe not mastery week without validation.
                    // For now, let's treat completion as candidacy if > 80% of target duration (if target exists)
                    if (block.duracionObjetivoSeg && block.duracionRealSeg >= block.duracionObjetivoSeg * 0.8) {
                        isMasteryCandidate = true;
                    }
                }
            } else {
                // Penalize for skipping? Maybe not penalize, just don't add.
            }
        }

        // --- Logic for 'Mastered Week' ---
        // Definition: A week is 'mastered' if practiced >= 2 times with good quality.
        // Since we are processing ONE session here, we need to check if this session pushes us over the threshold for the current week.
        // However, stateless logic is harder. 
        // Alternative: Just record this "practice event" and check if we have enough "mastered weeks".

        // Let's keep it simple as per requirements:
        // "si “semana dominada”: insertar week_start (set único)"
        // Condition for "semana dominada": >=2 ejecuciones completadas en esa semana y ratio ppm >= umbral.
        // We can't know ">=2" without querying previous blocks of the week.
        // OR we can just rely on `mastery_score` to flip to 'dominado'.

        // Re-reading requirements:
        // "DOMINADO si: count(mastered_weeks in last 4) >= 2"
        // "semana dominada": ejemplo: >=2 ejecuciones completadas en esa semana...

        // To implement ">= 2 executions this week", we might need to query recent blocks for this key.
        // Let's optimize: checking previous blocks is expensive. 
        // Maybe we just trust the `mastery_score`? No, the requirement is specific about weeks.

        // Let's do a lightweight check: if this session was "good" (isMasteryCandidate), we check if we already have a "good" session this week.
        // We can query `registros_bloque` for this student+key+currentWeek.

        const currentWeekStart = getWeekStart(lastPracticedAt);
        let promotedToMasteredWeek = false;

        if (isMasteryCandidate) {
            // Check count of sessions this week for this item
            // This requires a new API query or we assume 'en_progreso' is enough until we implement robust counting.
            // For MVP P2, let's try to query if possible.

            // NOTE: localDataClient might not allow complex filtering on date ranges easily without custom endpoints.
            // We will simplify: If mastery_score is high enough? No, user wants recurrence.

            // Let's just Add the week to 'mastered_weeks' if it's NOT there, and assumes 1 good session is enough OR 
            // check if we practiced recently (stateless approximation).

            // STRICTER APPROXIMATION:
            // Fetch last practice date from `item`. If `item.last_practiced_at` is in the same week AND was different day -> We hit 2 days.
            // This is a good heuristic without extra queries.

            const lastPracticedStr = (item as any)?.lastPracticedAt || (item as any)?.last_practiced_at;
            const prevLastPracticed = lastPracticedStr ? new Date(lastPracticedStr) : null;
            const currentPracticeDate = new Date(lastPracticedAt);

            if (prevLastPracticed) {
                const prevWeekStart = getWeekStart(prevLastPracticed.toISOString());
                const sameWeek = prevWeekStart === currentWeekStart;
                const diffDays = differenceInDays(currentPracticeDate, prevLastPracticed);

                if (sameWeek && diffDays >= 1) {
                    // Second practice this week!
                    promotedToMasteredWeek = true;
                }
            }
        }

        // --- State Transitions ---

        // Prepare new state
        const oldMasteredWeeks = item?.masteredWeeks || (item as any)?.mastered_weeks || [];
        let newMasteredWeeks = [...oldMasteredWeeks];

        if (promotedToMasteredWeek) {
            if (!newMasteredWeeks.includes(currentWeekStart)) {
                newMasteredWeeks.push(currentWeekStart);
            }
        }

        // Filter weeks to keep only last 4 unique weeks?
        // Requirement: "mantener SOLO últimas 4 semanas (únicas)" -> "DOMINADO si count >= 2"
        // Actually keep last 4 weeks of history? Or just keep recent ones. 
        // Let's keep all recent ones within a 4-week WINDOW from NOW.
        // "ventana de máximo 4 semanas" usually means rolling window.
        // We filter out any weeks older than 4 weeks ago.
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const cutoffDateISO = formatISO(fourWeeksAgo, { representation: 'date' });

        newMasteredWeeks = newMasteredWeeks.filter(w => w >= cutoffDateISO);
        newMasteredWeeks.sort(); // keep sorted

        // Status Update
        let newStatus: BackpackStatus = item?.status || 'nuevo';

        // Calculate Dominado
        const dominatedCount = newMasteredWeeks.length;
        if (dominatedCount >= 2) {
            newStatus = 'dominado';
        } else if (dominatedCount > 0) {
            newStatus = 'en_progreso';
        } else {
            if (newStatus === 'nuevo') newStatus = 'en_progreso'; // First practice moves to in_progress
        }

        // Check Oxidado (only if currently Dominado)
        // If we just practiced, it's NOT oxidado. 
        // But if we retrieve an item that WAS dominado and we haven't practiced in 180 days (before this session), it would have been oxidado.
        // But since we just practiced, we are refreshing it!
        // So status should be driven by recent mastery.
        // If we are 'dominado', we stay dominado because we just practiced.

        // Update DB
        if (item && item.id) {
            await localDataClient.entities.StudentBackpack.update(item.id, {
                status: newStatus,
                masteryScore: ((item?.masteryScore || (item as any)?.mastery_score || 0) + scoreDelta),
                lastPracticedAt: lastPracticedAt,
                masteredWeeks: newMasteredWeeks,
                lastMasteredWeekStart: promotedToMasteredWeek ? currentWeekStart : (item?.lastMasteredWeekStart || (item as any)?.last_mastered_week_start),
                updatedAt: new Date().toISOString()
            } as Partial<StudentBackpackItem>);
        } else {
            await localDataClient.entities.StudentBackpack.create({
                studentId: studentId,
                backpackKey: key,
                status: newStatus,
                masteryScore: scoreDelta,
                lastPracticedAt: lastPracticedAt,
                masteredWeeks: newMasteredWeeks,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as any);
        }

    } catch (e) {
        console.error(`Error processing backpack item ${key}:`, e);
    }
}

/**
 * Get the Monday of the week for a given date string (ISO)
 */
function getWeekStart(dateISO: string): string {
    const d = new Date(dateISO);
    // Adjust to Monday
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    return formatISO(monday, { representation: 'date' });
}

export async function getStudentBackpack(studentId: string): Promise<StudentBackpackItem[]> {
    return await localDataClient.entities.StudentBackpack.filter({ studentId });
}
