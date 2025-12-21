/**
 * Synthetic School Year 2025-26 Generator
 * 
 * Generates complete synthetic data for a school year with:
 * - 2 professors + 5 students
 * - Realistic schedules, sessions, feedback, and progress
 * - All data tagged for easy deletion
 */

import { supabase } from '@/lib/supabaseClient';
import {
    SeededRandom,
    generateId,
    generateUUID,
    generateName,
    generateEmail,
    formatDate,
    formatDateTime,
    addDays,
    addWeeks,
    getMonday,
    generateSchedule,
    generateNotes,
    generateMediaUrl,
    generateProgressMetrics,
    type TimeSlot,
    type ScheduleConstraints
} from '../syntheticDataGenerator';

// ============================================================================
// Constants
// ============================================================================

const BATCH_ID = '2025-26_v1';
const TAG_PREFIX = 'SYNTH_25_26__';
const SEED_STRING = 'studia-synthetic-2025-26-v1';

const COURSE_START = new Date('2025-09-01');
const COURSE_END = new Date('2026-06-30');

const EXERCISE_TYPES = ['CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD'];
const FOCOS = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];
const NIVELES = ['principiante', 'intermedio', 'avanzado'];

// ============================================================================
// Types
// ============================================================================

interface SyntheticUser {
    id: string;
    email: string;
    fullName: string;
    role: 'PROF' | 'ESTU';
    nivel?: 'principiante' | 'intermedio' | 'avanzado';
    nivelTecnico?: number;
}

interface SyntheticReport {
    batch: string;
    timestamp: string;
    users: SyntheticUser[];
    counts: {
        users: number;
        bloques: number;
        piezas: number;
        planes: number;
        asignaciones: number;
        sesiones: number;
        registrosBloque: number;
        feedbacks: number;
        evaluaciones: number;
        mediaAssets: number;
        xpRecords: number;
        backpackItems: number;
    };
    conflicts?: string[];
    sqlStatements?: string[];
}

// ============================================================================
// Dry Run - Preview without creating data
// ============================================================================

export async function dryRunSyntheticSchoolYear2025_26(): Promise<SyntheticReport> {
    const rng = new SeededRandom(SEED_STRING);

    console.log('🔍 Dry Run: Synthetic School Year 2025-26');

    // Generate user data
    const users = generateUsers(rng);

    // Calculate expected counts
    const professors = users.filter(u => u.role === 'PROF');
    const students = users.filter(u => u.role === 'ESTU');

    // Bloques: will use existing ones (not create)
    const bloquesCount = 0; // Will use existing bloques
    const piezasCount = rng.int(10, 15);
    const planesCount = students.length; // 1 per student

    // Calculate sessions (4-6 per week for ~40 weeks)
    const avgSessionsPerWeek = 5;
    const totalWeeks = 40;
    const sesionesCount = students.length * avgSessionsPerWeek * totalWeeks;

    // Bloques per session (5-8)
    const avgBloquesPerSesion = 6;
    const registrosBloquesCount = sesionesCount * avgBloquesPerSesion;

    // Feedbacks (2-4 per month per student, ~10 months)
    const feedbacksCount = students.length * 3 * 10;

    // Evaluaciones (2 per student: initial + final)
    const evaluacionesCount = students.length * 2;

    // Media assets (1 per month per student)
    const mediaAssetsCount = students.length * 10;

    // XP records (3 skills per student)
    const xpRecordsCount = students.length * 3;

    // Backpack items (5-10 per student)
    const backpackItemsCount = students.length * rng.int(5, 10);

    const report: SyntheticReport = {
        batch: BATCH_ID,
        timestamp: new Date().toISOString(),
        users,
        counts: {
            users: users.length,
            bloques: bloquesCount,
            piezas: piezasCount,
            planes: planesCount,
            asignaciones: students.length * totalWeeks,
            sesiones: sesionesCount,
            registrosBloque: registrosBloquesCount,
            feedbacks: feedbacksCount,
            evaluaciones: evaluacionesCount,
            mediaAssets: mediaAssetsCount,
            xpRecords: xpRecordsCount,
            backpackItems: backpackItemsCount
        },
        conflicts: []
    };

    console.log('✅ Dry run complete');
    console.log('📊 Expected counts:', report.counts);

    return report;
}

// ============================================================================
// Seed - Create all synthetic data
// ============================================================================

export async function seedSyntheticSchoolYear2025_26(): Promise<SyntheticReport> {
    const rng = new SeededRandom(SEED_STRING);

    console.log('🌱 Seeding Synthetic School Year 2025-26...');

    try {
        // 1. Generate users (with deterministic UUIDs)
        const users = generateUsers(rng);
        const professors = users.filter(u => u.role === 'PROF');
        const students = users.filter(u => u.role === 'ESTU');

        // Assign students to professors in profiles table (for SQL generation)
        console.log('Preparing student-professor relationships...');
        const relationships = assignStudentsToProfessors(students, professors, rng);

        // 2. Check if users already exist
        console.log('Checking if synthetic users already exist...');
        const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('id')
            .in('id', users.map(u => u.id));

        const existingCount = existingProfiles?.length || 0;
        const allUsersExist = existingCount === users.length;

        if (!allUsersExist) {
            // Users don't exist yet, so we need to generate SQL for manual creation
            console.log(`⚠️ Only ${existingCount}/${users.length} users found. Generating SQL for manual creation.`);
            console.log('📝 Execute the SQL in Supabase Dashboard → SQL Editor before seeding data');

            // Generate SQL statements for user creation
            const sqlStatements = generateUserCreationSQL(users, relationships);

            console.log('');
            console.log('🛑 IMPORTANT: Users must be created first before seeding data!');
            console.log('');
            console.log('📋 Steps to complete:');
            console.log('1. Copy the SQL from the report');
            console.log('2. Execute it in Supabase Dashboard → SQL Editor');
            console.log('3. Click "Generar" again to create the remaining data');
            console.log('');

            const report: SyntheticReport = {
                batch: BATCH_ID,
                timestamp: new Date().toISOString(),
                users,
                counts: {
                    users: existingCount,
                    bloques: 0,
                    piezas: 0,
                    planes: 0,
                    asignaciones: 0,
                    sesiones: 0,
                    registrosBloque: 0,
                    feedbacks: 0,
                    evaluaciones: 0,
                    mediaAssets: 0,
                    xpRecords: 0,
                    backpackItems: 0
                },
                sqlStatements
            };

            console.log('');
            console.log('📄 SQL generated for ' + users.length + ' users');

            return report;
        }

        console.log('✅ All synthetic users exist. Proceeding with data generation...');
        // Users exist, so we can use the relationships map
        // Note: relationships are already assigned in the DB by the SQL update, 
        // but we need the map for local logic (e.g. creating feedbacks)
        // The 'relationships' variable is already defined above.

        // 3. Fetch existing bloques (DO NOT CREATE - use existing ones)
        console.log('Fetching existing bloques...');
        const { data: bloques, error: bloquesError } = await supabase
            .from('bloques')
            .select('*')
            .limit(30);

        if (bloquesError || !bloques || bloques.length === 0) {
            throw new Error('No hay bloques existentes. Crea algunos bloques primero desde la UI.');
        }

        console.log(`✅ Using ${bloques.length} existing bloques`);

        // 4. Create piezas
        const piezas = await createPiezas(rng, professors[0].id);

        // 5. Create plans
        const planes = await createPlanes(rng, students, piezas, bloques);

        // 6. Create asignaciones
        const asignaciones = await createAsignaciones(rng, students, professors, piezas, planes);

        // 7. Create sessions
        const { sesiones, registrosBloques } = await createSessions(rng, students, asignaciones, bloques);

        // 8. Create feedbacks
        const feedbacks = await createFeedbacks(rng, students, relationships);

        // 9. Create evaluaciones
        const evaluaciones = await createEvaluaciones(rng, students, relationships);

        // 10. Create media assets
        const mediaAssets = await createMediaAssets(rng, students);

        // 11. Create XP records
        const xpRecords = await createXPRecords(rng, students);

        // 12. Create backpack items
        const backpackItems = await createBackpackItems(rng, students, bloques);

        // Still provide SQL as backup just in case
        const sqlStatements = generateUserCreationSQL(users, relationships);

        const report: SyntheticReport = {
            batch: BATCH_ID,
            timestamp: new Date().toISOString(),
            users,
            counts: {
                users: users.length,
                bloques: bloques.length, // Using existing, not creating
                piezas: piezas.length,
                planes: planes.length,
                asignaciones: asignaciones.length,
                sesiones: sesiones.length,
                registrosBloque: registrosBloques.length,
                feedbacks: feedbacks.length,
                evaluaciones: evaluaciones.length,
                mediaAssets: mediaAssets.length,
                xpRecords: xpRecords.length,
                backpackItems: backpackItems.length
            },
            sqlStatements
        };

        console.log('✅ Seeding complete!');
        console.log('📊 Created:', report.counts);
        console.log('👥 Users:', users.map(u => `${u.email} (${u.role})`).join(', '));

        return report;
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        throw error;
    }
}

// ============================================================================
// Delete - Remove all synthetic data
// ============================================================================

export async function deleteSyntheticSchoolYear2025_26(): Promise<{ deleted: Record<string, number> }> {
    console.log('🗑️  Deleting Synthetic School Year 2025-26...');

    const deleted: Record<string, number> = {};

    try {
        // Get all synthetic user IDs first
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .ilike('full_name', `%[${TAG_PREFIX.slice(0, -2)}]%`);

        const syntheticUserIds = profiles?.map(p => p.id) || [];

        // Delete in reverse FK order

        // 1. student_backpack
        const { count: backpackCount } = await supabase
            .from('student_backpack')
            .delete()
            .in('student_id', syntheticUserIds.map(id => id.toString()));
        deleted.student_backpack = backpackCount || 0;

        // 2. student_xp_total
        const { count: xpCount } = await supabase
            .from('student_xp_total')
            .delete()
            .in('student_id', syntheticUserIds.map(id => id.toString()));
        deleted.student_xp_total = xpCount || 0;

        // 3. evaluaciones_tecnicas
        const { count: evalCount } = await supabase
            .from('evaluaciones_tecnicas')
            .delete()
            .in('alumno_id', syntheticUserIds.map(id => id.toString()));
        deleted.evaluaciones_tecnicas = evalCount || 0;

        // 4. media_assets
        const { count: mediaCount } = await supabase
            .from('media_assets')
            .delete()
            .in('origin_id', syntheticUserIds.map(id => id.toString()));
        deleted.media_assets = mediaCount || 0;

        // 5. registros_bloque
        const { count: rbCount } = await supabase
            .from('registros_bloque')
            .delete()
            .in('alumno_id', syntheticUserIds.map(id => id.toString()));
        deleted.registros_bloque = rbCount || 0;

        // 6. registros_sesion
        const { count: rsCount } = await supabase
            .from('registros_sesion')
            .delete()
            .in('alumno_id', syntheticUserIds.map(id => id.toString()));
        deleted.registros_sesion = rsCount || 0;

        // 7. feedbacks_semanal
        const { count: fbCount } = await supabase
            .from('feedbacks_semanal')
            .delete()
            .in('alumno_id', syntheticUserIds.map(id => id.toString()));
        deleted.feedbacks_semanal = fbCount || 0;

        // 8. asignaciones
        const { count: asigCount } = await supabase
            .from('asignaciones')
            .delete()
            .in('alumno_id', syntheticUserIds.map(id => id.toString()));
        deleted.asignaciones = asigCount || 0;

        // 9. planes
        const { count: planesCount } = await supabase
            .from('planes')
            .delete()
            .ilike('nombre', `%[${TAG_PREFIX.slice(0, -2)}]%`);
        deleted.planes = planesCount || 0;

        // 10. piezas
        const { count: piezasCount } = await supabase
            .from('piezas')
            .delete()
            .in('profesor_id', syntheticUserIds.map(id => id.toString()));
        deleted.piezas = piezasCount || 0;

        // 11. bloques
        const { count: bloquesCount } = await supabase
            .from('bloques')
            .delete()
            .like('code', `${TAG_PREFIX}%`);
        deleted.bloques = bloquesCount || 0;

        // 3. auth users (Removed: Cannot delete auth users from client-side due to security restrictions)
        // Users must be deleted manually from Supabase Dashboard or via Edge Function if available.
        console.warn('⚠️ Skipping auth user deletion (requires Admin API). Please delete users manually in Supabase Dashboard if needed.');
        // deleted.auth_users = 0; // Skipped

        console.log('✅ Deletion complete!');
        console.log('🗑️  Deleted:', deleted);

        return { deleted };
    } catch (error) {
        console.error('❌ Error deleting data:', error);
        throw error;
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

// function createUsersInAuth removed as it is no longer used (replaced by SQL generation)

function generateUsers(rng: SeededRandom): SyntheticUser[] {
    const users: SyntheticUser[] = [];
    let userNumber = 1;  // Start at 01

    // 2 Professors (01, 02)
    for (let i = 0; i < 2; i++) {
        const name = generateName(rng);
        const id = generateUUID(new SeededRandom(`${SEED_STRING}_prof_${i}`));
        const emailNumber = String(userNumber++).padStart(2, '0');
        users.push({
            id,
            email: `trompetasonara+${emailNumber}@gmail.com`,
            fullName: `${name} [${TAG_PREFIX.slice(0, -2)}]`,
            role: 'PROF'
        });
    }

    // 5 Students (03, 04, 05, 06, 07)
    for (let i = 0; i < 5; i++) {
        const name = generateName(rng);
        const nivel = rng.pick(NIVELES) as 'principiante' | 'intermedio' | 'avanzado';
        const nivelTecnico = nivel === 'principiante' ? 1 : nivel === 'intermedio' ? 2 : 3;
        const id = generateUUID(new SeededRandom(`${SEED_STRING}_estu_${i}`));
        const emailNumber = String(userNumber++).padStart(2, '0');

        users.push({
            id,
            email: `trompetasonara+${emailNumber}@gmail.com`,
            fullName: `${name} [${TAG_PREFIX.slice(0, -2)}]`,
            role: 'ESTU',
            nivel,
            nivelTecnico
        });
    }

    return users;
}

function assignStudentsToProfessors(
    students: SyntheticUser[],
    professors: SyntheticUser[],
    rng: SeededRandom
): Map<string, string> {
    const relationships = new Map<string, string>();

    // Distribute students: 3 to first prof, 2 to second
    const shuffled = rng.shuffle(students);
    shuffled.forEach((student, idx) => {
        const profId = idx < 3 ? professors[0].id : professors[1].id;
        relationships.set(student.id, profId);
    });

    return relationships;
}

async function createBloques(rng: SeededRandom, profesorId: string): Promise<any[]> {
    const count = rng.int(20, 30);
    const bloques = [];

    for (let i = 0; i < count; i++) {
        const tipo = rng.pick(EXERCISE_TYPES);
        const bloque = {
            id: generateId('bloque', rng),
            code: `${TAG_PREFIX}${tipo}_${String(i + 1).padStart(4, '0')}`,
            nombre: `Ejercicio ${tipo} ${i + 1}`,
            tipo,
            duracion_seg: rng.int(3, 15) * 60, // 3-15 minutes
            instrucciones: generateNotes(rng, 'técnica'),
            indicador_logro: 'Ejecución fluida y precisa',
            materiales_requeridos: [],
            media_links: [],
            elementos_ordenados: [],
            pieza_ref_id: null,
            profesor_id: profesorId,
            skill_tags: [],
            target_ppms: []
        };

        bloques.push(bloque);
    }

    const { error } = await supabase.from('bloques').insert(bloques);
    if (error) throw error;

    console.log(`✅ Created ${bloques.length} bloques`);
    return bloques;
}

async function createPiezas(rng: SeededRandom, profesorId: string): Promise<any[]> {
    const count = rng.int(10, 15);
    const piezas = [];

    for (let i = 0; i < count; i++) {
        const nivel = rng.pick(NIVELES);
        const pieza = {
            id: generateId('pieza', rng),
            nombre: `Pieza ${i + 1}`,
            descripcion: `Pieza de nivel ${nivel}`,
            nivel,
            tiempo_objetivo_seg: rng.int(10, 30) * 60,
            elementos: [],
            profesor_id: profesorId
        };

        piezas.push(pieza);
    }

    const { error } = await supabase.from('piezas').insert(piezas);
    if (error) throw error;

    console.log(`✅ Created ${piezas.length} piezas`);
    return piezas;
}

async function createPlanes(
    rng: SeededRandom,
    students: SyntheticUser[],
    piezas: any[],
    bloques: any[]
): Promise<any[]> {
    const planes = [];

    for (const student of students) {
        const pieza = rng.pick(piezas);
        const foco = rng.pick(FOCOS);

        // Create 4 weeks of plan
        const semanas = [];
        for (let w = 0; w < 4; w++) {
            const sesiones = [];
            for (let s = 0; s < 3; s++) {
                const sesionBloques = rng.shuffle(bloques).slice(0, rng.int(5, 8));
                sesiones.push({
                    id: generateId('sesion', rng),
                    nombre: `Sesión ${s + 1}`,
                    objetivo: generateNotes(rng, 'sesión'),
                    bloques: sesionBloques,
                    rondas: [],
                    secuencia: sesionBloques.map(b => ({ kind: 'BLOQUE', code: b.code }))
                });
            }

            semanas.push({
                id: generateId('semana', rng),
                nombre: `Semana ${w + 1}`,
                objetivo: generateNotes(rng, 'semana'),
                foco,
                sesiones
            });
        }

        const plan = {
            id: generateId('plan', rng),
            nombre: `Plan ${student.fullName}`,
            foco_general: foco,
            objetivo_semanal_por_defecto: generateNotes(rng, 'plan'),
            pieza_id: pieza.id,
            profesor_id: student.id, // Will be updated with actual prof
            semanas
        };

        planes.push(plan);
    }

    const { error } = await supabase.from('planes').insert(planes);
    if (error) throw error;

    console.log(`✅ Created ${planes.length} planes`);
    return planes;
}

async function createAsignaciones(
    rng: SeededRandom,
    students: SyntheticUser[],
    professors: SyntheticUser[],
    piezas: any[],
    planes: any[]
): Promise<any[]> {
    const asignaciones = [];
    const totalWeeks = 40;

    // Get current user (ADMIN) to use as profesor_id for RLS
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    if (!currentUserId) {
        throw new Error('No hay usuario autenticado');
    }

    for (let weekIdx = 0; weekIdx < totalWeeks; weekIdx++) {
        const weekStart = addWeeks(COURSE_START, weekIdx);

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const plan = planes[i];
            const pieza = rng.pick(piezas);

            const weekPlan = plan.semanas[weekIdx % 4];

            if (!weekPlan) {
                console.warn(`⚠️ Missing plan for student ${student.email} week ${weekIdx}`);
                continue;
            }

            const asignacion = {
                id: generateId('asig', rng),
                alumno_id: student.id,
                profesor_id: currentUserId, // Use current ADMIN user for RLS
                pieza_id: pieza.id,
                semana_inicio_iso: formatDate(weekStart),
                estado: 'publicada',
                foco: rng.pick(FOCOS),
                notas: generateNotes(rng, 'asignación'),
                plan: weekPlan,            // Legacy field
                plan_adaptado: weekPlan,   // New field (satisfies constraint check_plan_reference_or_snapshot)
                pieza_snapshot: pieza
            };

            asignaciones.push(asignacion);
        }
    }

    const { error } = await supabase.from('asignaciones').insert(asignaciones);
    if (error) throw error;

    console.log(`✅ Created ${asignaciones.length} asignaciones`);
    return asignaciones;
}

async function createSessions(
    rng: SeededRandom,
    students: SyntheticUser[],
    asignaciones: any[],
    bloques: any[]
): Promise<{ sesiones: any[]; registrosBloques: any[] }> {
    const sesiones = [];
    const registrosBloques = [];
    const allSlots: TimeSlot[] = [];

    // Get current user (ADMIN) for RLS
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    for (const student of students) {
        const sessionsPerWeek = student.nivel === 'principiante' ? 4 : student.nivel === 'intermedio' ? 5 : 6;

        const constraints: ScheduleConstraints = {
            startDate: COURSE_START,
            endDate: COURSE_END,
            weekdayHours: { start: 16, end: 21 },
            saturdayHours: { start: 10, end: 14 },
            bufferMinutes: rng.int(10, 15),
            sessionsPerWeek
        };

        const studentSlots = generateSchedule(constraints, rng, allSlots);
        allSlots.push(...studentSlots);

        // Create session records
        for (const slot of studentSlots) {
            const asignacion = rng.pick(asignaciones.filter(a => a.alumno_id === student.id));
            const sessionBloques = rng.shuffle(bloques).slice(0, rng.int(5, 8));

            const sesion = {
                id: generateId('sesion', rng),
                asignacion_id: asignacion.id,
                alumno_id: student.id,
                profesor_asignado_id: currentUserId, // Use current ADMIN user for RLS
                semana_idx: 0,
                sesion_idx: 0,
                inicio_iso: formatDateTime(slot.date),
                fin_iso: formatDateTime(addDays(slot.date, 0)),
                duracion_real_seg: slot.durationMinutes * 60,
                duracion_objetivo_seg: slot.durationMinutes * 60,
                bloques_totales: sessionBloques.length,
                bloques_completados: sessionBloques.length,
                bloques_omitidos: 0,
                finalizada: true,
                fin_anticipado: false,
                calificacion: rng.int(2, 4),
                notas: generateNotes(rng, 'sesión'),
                media_links: []
            };

            sesiones.push(sesion);

            // Create bloque records
            sessionBloques.forEach((bloque, idx) => {
                registrosBloques.push({
                    id: generateId('reg_bloque', rng),
                    registro_sesion_id: sesion.id,
                    asignacion_id: asignacion.id,
                    alumno_id: student.id,
                    semana_idx: 0,
                    sesion_idx: 0,
                    orden_ejecucion: idx,
                    tipo: bloque.tipo,
                    code: bloque.code,
                    nombre: bloque.nombre,
                    duracion_objetivo_seg: bloque.duracion_seg,
                    duracion_real_seg: bloque.duracion_seg + rng.int(-30, 30),
                    estado: 'completado',
                    inicios_pausa: rng.int(0, 2),
                    inicio_iso: formatDateTime(slot.date),
                    fin_iso: formatDateTime(slot.date)
                });
            });
        }
    }

    const { error: sesionesError } = await supabase.from('registros_sesion').insert(sesiones);
    if (sesionesError) throw sesionesError;

    const { error: bloquesError } = await supabase.from('registros_bloque').insert(registrosBloques);
    if (bloquesError) throw bloquesError;

    console.log(`✅ Created ${sesiones.length} sesiones and ${registrosBloques.length} registros_bloque`);
    return { sesiones, registrosBloques };
}

async function createFeedbacks(
    rng: SeededRandom,
    students: SyntheticUser[],
    relationships: Map<string, string>
): Promise<any[]> {
    const feedbacks = [];
    const totalMonths = 10;

    // Get current user (ADMIN) for RLS
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    for (const student of students) {
        const feedbacksPerMonth = rng.int(2, 4);

        for (let month = 0; month < totalMonths; month++) {
            for (let f = 0; f < feedbacksPerMonth; f++) {
                const weekOffset = month * 4 + f;
                const weekStart = addWeeks(COURSE_START, weekOffset);

                feedbacks.push({
                    id: generateId('feedback', rng),
                    alumno_id: student.id,
                    profesor_id: currentUserId, // Use current ADMIN user for RLS
                    semana_inicio_iso: formatDate(getMonday(weekStart)),
                    nota_profesor: generateNotes(rng, 'progreso'),
                    media_links: [],
                    habilidades: {}
                });
            }
        }
    }

    const { error } = await supabase
        .from('feedbacks_semanal')
        .upsert(feedbacks, { onConflict: 'alumno_id, profesor_id, semana_inicio_iso' });
    if (error) throw error;

    console.log(`✅ Created ${feedbacks.length} feedbacks`);
    return feedbacks;
}

async function createEvaluaciones(
    rng: SeededRandom,
    students: SyntheticUser[],
    relationships: Map<string, string>
): Promise<any[]> {
    const evaluaciones = [];

    // Get current user (ADMIN) for RLS
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    for (const student of students) {
        // Initial evaluation
        evaluaciones.push({
            alumno_id: student.id,
            profesor_id: currentUserId, // Use current ADMIN user for RLS
            fecha: formatDate(COURSE_START),
            habilidades: {
                sonido: rng.int(4, 6),
                flexibilidad: rng.int(3, 5),
                motricidad: rng.int(60, 80),
                articulacion: { t: rng.int(70, 90), tk: rng.int(50, 70), ttk: rng.int(30, 50) },
                cognitivo: rng.int(5, 7)
            },
            notas: 'Evaluación inicial'
        });

        // Final evaluation (improved)
        evaluaciones.push({
            alumno_id: student.id,
            profesor_id: currentUserId, // Use current ADMIN user for RLS
            fecha: formatDate(COURSE_END),
            habilidades: {
                sonido: rng.int(6, 8),
                flexibilidad: rng.int(5, 7),
                motricidad: rng.int(80, 100),
                articulacion: { t: rng.int(90, 110), tk: rng.int(70, 90), ttk: rng.int(50, 70) },
                cognitivo: rng.int(7, 9)
            },
            notas: 'Evaluación final - Progreso notable'
        });
    }

    const { error } = await supabase.from('evaluaciones_tecnicas').insert(evaluaciones);
    if (error) throw error;

    console.log(`✅ Created ${evaluaciones.length} evaluaciones`);
    return evaluaciones;
}

async function createMediaAssets(rng: SeededRandom, students: SyntheticUser[]): Promise<any[]> {
    const assets = [];
    const totalMonths = 10;

    for (const student of students) {
        for (let month = 0; month < totalMonths; month++) {
            const typeRoll = rng.next();
            const type = typeRoll < 0.6 ? 'youtube' : typeRoll < 0.9 ? 'pdf' : 'image';
            const fileType = type === 'youtube' ? 'video' : type === 'pdf' ? 'document' : 'image';

            assets.push({
                url: generateMediaUrl(rng, type),
                name: `${student.fullName} - Mes ${month + 1}`,
                file_type: fileType,
                state: 'external',
                origin_type: 'student_practice',
                origin_id: student.id,
                origin_label: `Práctica mes ${month + 1}`,
                origin_context: { synthetic: true, batch: BATCH_ID }
            });
        }
    }

    // Use insert instead of upsert because there is no unique constraint on origin_id + name
    const { error } = await supabase.from('media_assets').insert(assets);

    if (error) {
        if (error.code === '42501') {
            console.warn('⚠️ Could not create media_assets due to RLS policy. Skipping this step.');
            console.warn('To fix, add an RLS policy allowing Admins to insert to media_assets.');
            return []; // Return empty but don't throw to allow continuation
        }
        throw error;
    }

    console.log(`✅ Created ${assets.length} media assets`);
    return assets;
}

async function createXPRecords(rng: SeededRandom, students: SyntheticUser[]): Promise<any[]> {
    const records = [];
    const skills = ['motricidad', 'articulacion', 'flexibilidad'];

    for (const student of students) {
        for (const skill of skills) {
            const baseXP = rng.int(1000, 5000);
            const practiceXP = baseXP * 0.7;
            const evaluationXP = baseXP * 0.3;

            records.push({
                student_id: student.id,
                skill,
                total_xp: baseXP,
                practice_xp: practiceXP,
                evaluation_xp: evaluationXP,
                last_manual_xp_amount: 0
            });
        }
    }

    // Use insert - verify if unique constraint exists before using upsert
    const { error } = await supabase.from('student_xp_total').insert(records);
    if (error) throw error;

    console.log(`✅ Created ${records.length} XP records`);
    return records;
}

async function createBackpackItems(
    rng: SeededRandom,
    students: SyntheticUser[],
    bloques: any[]
): Promise<any[]> {
    const items = [];

    for (const student of students) {
        const itemCount = rng.int(5, 10);
        const selectedBloques = rng.shuffle(bloques).slice(0, itemCount);

        for (const bloque of selectedBloques) {
            const status = rng.pick(['nuevo', 'en_progreso', 'dominado', 'dominado', 'dominado']); // Bias towards dominado
            const masteryScore = status === 'dominado' ? rng.int(80, 100) : status === 'en_progreso' ? rng.int(40, 79) : rng.int(0, 39);

            items.push({
                student_id: student.id,
                backpack_key: bloque.code,
                status,
                mastery_score: masteryScore,
                last_practiced_at: formatDateTime(addDays(COURSE_END, -rng.int(1, 30))),
                mastered_weeks: status === 'dominado' ? [formatDate(addWeeks(COURSE_END, -rng.int(1, 4)))] : []
            });
        }
    }

    // Use insert - verify if unique constraint exists before using upsert
    const { error } = await supabase.from('student_backpack').insert(items);
    if (error) throw error;

    console.log(`✅ Created ${items.length} backpack items`);
    return items;
}

function generateUserCreationSQL(users: SyntheticUser[], relationships?: Map<string, string>): string[] {
    const statements: string[] = [];

    statements.push('-- ============================================================================');
    statements.push('-- SQL para crear usuarios sintéticos en Supabase');
    statements.push('-- Ejecutar en Supabase Dashboard → SQL Editor');
    statements.push('-- ============================================================================');
    statements.push('--');
    statements.push('-- IMPORTANTE: Este SQL crea usuarios en auth.users y profiles.');
    statements.push('-- Password para todos: 12345678');
    statements.push('--');
    statements.push('-- ============================================================================\n');

    for (const user of users) {
        const password = '12345678';

        statements.push(`-- ${user.fullName} (${user.role})`);
        statements.push(`INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)`);
        statements.push(`VALUES (`);
        statements.push(`  '${user.id}',`);
        statements.push(`  '${user.email}',`);
        statements.push(`  crypt('${password}', gen_salt('bf')),`);
        statements.push(`  NOW(),`);
        statements.push(`  '{"full_name": "${user.fullName}", "role": "${user.role}"}'::jsonb,`);
        statements.push(`  'authenticated',`);
        statements.push(`  'authenticated',`);
        statements.push(`  NOW(),`);
        statements.push(`  NOW()`);
        statements.push(`) ON CONFLICT (id) DO NOTHING;\n`);

        statements.push(`INSERT INTO public.profiles (id, full_name, role, nivel_tecnico, nivel, is_active, created_at, updated_at)`);
        statements.push(`VALUES (`);
        statements.push(`  '${user.id}',`);
        statements.push(`  '${user.fullName}',`);
        statements.push(`  '${user.role}',`);
        statements.push(`  ${user.nivelTecnico || 1},`);
        statements.push(`  ${user.nivel ? `'${user.nivel}'` : 'NULL'},`);
        statements.push(`  true,`);
        statements.push(`  NOW(),`);
        statements.push(`  NOW()`);
        statements.push(`) ON CONFLICT (id) DO UPDATE SET`);
        statements.push(`  full_name = EXCLUDED.full_name,`);
        statements.push(`  role = EXCLUDED.role,`);
        statements.push(`  nivel_tecnico = EXCLUDED.nivel_tecnico,`);
        statements.push(`  nivel = EXCLUDED.nivel;`);
        statements.push(``);
    }

    // Add updates for profesor_asignado_id if relationships provided
    if (relationships && relationships.size > 0) {
        statements.push('-- ============================================================================');
        statements.push('-- Asignación de profesores a estudiantes');
        statements.push('-- ============================================================================');

        for (const [studentId, profesorId] of Array.from(relationships.entries())) {
            statements.push(`UPDATE public.profiles SET profesor_asignado_id = '${profesorId}' WHERE id = '${studentId}';`);
        }
        statements.push(``);
    }

    return statements;
}
