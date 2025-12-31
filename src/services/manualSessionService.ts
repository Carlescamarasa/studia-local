import { localDataClient } from "@/api/localDataClient";
import { remoteDataAPI } from "@/api/remote/api";
import { calcularLunesSemanaISO } from "@/features/shared/utils/helpers";
import { supabase } from "@/lib/supabaseClient";
import { getCachedAuthUser } from "@/auth/authUserCache";

interface CreateManualSessionParams {
    studentId: string;
    exerciseCodes: string[];
    source?: string;
}

/**
 * Creates a manual "draft" session for the given student and exercises.
 * If an existing draft Asignacion exists for the same student/week, adds a new session to it.
 * Otherwise, creates a new 'Asignacion' record.
 * 
 * @param {Object} params
 * @param {string} params.studentId - The ID of the student
 * @param {string[]} params.exerciseCodes - Array of exercise codes to include
 * @param {string} params.source - Origin of the session: 'mochila' | 'hoy' | 'biblioteca' etc.
 * @returns {Promise<{ sessionId: string, asignacionId: string, semanaIdx: number, sesionIdx: number }>}
 */
export async function createManualSessionDraft({ studentId, exerciseCodes, source = 'manual' }: CreateManualSessionParams) {
    if (!studentId) throw new Error("Student ID is required");
    if (!exerciseCodes || exerciseCodes.length === 0) throw new Error("At least one exercise code is required");



    // ... Deduplicate codes ...
    const uniqueCodes = [...new Set(exerciseCodes)];

    // Current week ISO
    const semanaInicioISO = calcularLunesSemanaISO(new Date());

    // Get the current authenticated user's ID for RLS compliance
    const authUser = await getCachedAuthUser();
    const currentAuthId = authUser?.id || null;

    // Check if there's an existing draft Asignacion for this student in this week
    // Using centralized remoteDataAPI.asignaciones.filter() instead of localDataClient
    const existingDrafts = await remoteDataAPI.asignaciones.filter({
        alumnoId: studentId,
        isDraft: true,
        modo: 'manual',
        semanaInicioISO: semanaInicioISO
    });

    // Construct the blocks for the new session
    const bloques = uniqueCodes.map((code, index) => ({
        tipo: 'AD' as const, // Ad-hoc practice - must be valid SesionBloque tipo
        code: code,
        nombre: `Ejercicio ${index + 1}`, // Placeholder, real name loaded by StudiaPage
        duracionSeg: 300, // Default 5 min per exercise for draft
        modo: 'estudio', // Default mode
        backpack_key: code, // Assuming 1:1 map for mochila
    }));

    // Create the new session object
    const nuevaSesion = {
        nombre: `Práctica Manual - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        foco: 'GEN',
        bloques: bloques,
        rondas: [] // Required by PlanSesion interface
    };

    if (existingDrafts.length > 0) {
        // Reuse existing draft: add new session to it
        const existingDraft = existingDrafts[0];
        const updatedPlan = { ...existingDraft.plan };

        // Add new session to the first (and only) week
        if (updatedPlan.semanas && updatedPlan.semanas[0] && updatedPlan.semanas[0].sesiones) {
            updatedPlan.semanas[0].sesiones.push(nuevaSesion);
        } else {
            // Fallback: create the structure if missing
            updatedPlan.semanas = [{
                nombre: "Semana Única",
                sesiones: [nuevaSesion]
            }];
        }

        // Update the existing Asignacion
        await localDataClient.entities.Asignacion.update(existingDraft.id, {
            plan: updatedPlan,
            planAdaptado: updatedPlan // Also update planAdaptado for consistency
        });

        const newSesionIdx = updatedPlan.semanas[0].sesiones.length - 1;

        return {
            sessionId: existingDraft.id,
            asignacionId: existingDraft.id,
            semanaIdx: 0,
            sesionIdx: newSesionIdx
        };
    } else {
        // Create new draft Asignacion
        const planDraft = {
            nombre: `Sesión Manual (${source})`,
            semanas: [
                {
                    nombre: "Semana Única",
                    sesiones: [nuevaSesion]
                }
            ]
        };

        const asignacionData = {
            alumnoId: studentId,
            profesorId: currentAuthId, // Use auth.uid() for RLS policy compliance
            plan: planDraft,
            semanaInicioISO: semanaInicioISO,
            estado: 'publicada', // Use valid enum status
            modo: 'manual', // Student-initiated
            isDraft: true, // Temporary session
            piezaSnapshot: {
                nombre: 'Sin pieza asignada',
                descripcion: '',
                nivel: 'N/A',
                tiempoObjetivoSeg: 0,
                elementos: [],
            }
        };

        const nuevaAsignacion = await localDataClient.entities.Asignacion.create(asignacionData);

        return {
            sessionId: nuevaAsignacion.id,
            asignacionId: nuevaAsignacion.id,
            semanaIdx: 0,
            sesionIdx: 0
        };
    }
}
