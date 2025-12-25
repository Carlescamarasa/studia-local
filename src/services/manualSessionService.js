import { localDataClient } from "@/api/localDataClient";
import { calcularLunesSemanaISO } from "@/components/utils/helpers";
import { supabase } from "@/lib/supabaseClient";

/**
 * Creates a manual "draft" session for the given student and exercises.
 * It generates a temporary 'Asignacion' record to reuse the existing StudiaPage logic.
 * 
 * @param {Object} params
 * @param {string} params.studentId - The ID of the student
 * @param {string[]} params.exerciseCodes - Array of exercise codes to include
 * @param {string} params.source - Origin of the session: 'mochila' | 'hoy' | 'biblioteca' etc.
 * @returns {Promise<{ sessionId: string, asignacionId: string, semanaIdx: number, sesionIdx: number }>}
 */
export async function createManualSessionDraft({ studentId, exerciseCodes, source = 'manual' }) {
    if (!studentId) throw new Error("Student ID is required");
    if (!exerciseCodes || exerciseCodes.length === 0) throw new Error("At least one exercise code is required");

    // Deduplicate codes
    const uniqueCodes = [...new Set(exerciseCodes)];

    // Fetch block details for the codes (optional, but good for names if possible, 
    // though StudiaPage re-fetches. We just need valid structure).
    // For manual draft, we can minimalistically create the structure.
    // StudiaPage will look up the full Block details by code.

    // Construct the blocks for the session
    const bloques = uniqueCodes.map((code, index) => ({
        tipo: 'PR', // Practice
        code: code,
        nombre: `Ejercicio ${index + 1}`, // Placeholder, real name loaded by StudiaPage
        duracionSeg: 300, // Default 5 min per exercise for draft
        modo: 'estudio', // Default mode
        backpack_key: code, // Assuming 1:1 map for mochila
    }));

    // Current week ISO
    const semanaInicioISO = calcularLunesSemanaISO(new Date());

    // Create a temporary Plan structure
    const planDraft = {
        nombre: `Sesión Manual (${source})`,
        semanas: [
            {
                nombre: "Semana Única",
                sesiones: [
                    {
                        nombre: `Práctica Manual - ${new Date().toLocaleDateString()}`,
                        foco: 'GEN',
                        bloques: bloques
                    }
                ]
            }
        ]
    };

    // Get the current authenticated user's ID for RLS compliance
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentAuthId = authUser?.id || null;

    // Create the Asignacion
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
        sessionId: nuevaAsignacion.id, // For legacy comp, though usually distinct
        asignacionId: nuevaAsignacion.id,
        semanaIdx: 0,
        sesionIdx: 0
    };
}
