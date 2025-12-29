/**
 * Generador de datos locales desde cero
 * Crea una base de datos local completa y coherente para desarrollo
 */

import { localUsers } from './localUsers';
import { calcularTiempoSesion } from '@/features/shared/utils/helpers';

// IDs válidos de usuarios (fuente de verdad)
const VALID_USER_IDS = [
  '6913f9c07890d136d35d0a77', // Carles Estudiante
  '6913ff6688f046f7e7eb3f3b', // Carles Profe
  '6913f837bb2b72a49b9d25d2', // Carles Camarasa Botella (Admin)
  '77dcf831-6283-462a-83bd-f5c46b3cde28', // La Trompeta Sonará (Supabase UUID)
];

const DEFAULT_ESTUDIANTE_ID = '6913f9c07890d136d35d0a77';
const DEFAULT_PROFESOR_ID = '6913ff6688f046f7e7eb3f3b';

// Helper para generar IDs únicos
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper para formatear fechas
function formatLocalDate(date: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + (weeks * 7));
  return result;
}

interface LocalData {
  usuarios: any[];
  asignaciones: any[];
  bloques: any[];
  feedbacksSemanal: any[];
  piezas: any[];
  planes: any[];
  registrosBloque: any[];
  registrosSesion: any[];
  evaluacionesTecnicas: any[];
}

/**
 * Genera bloques de ejemplo
 */
function generateBloques(): any[] {
  return [
    {
      id: 'bloque_ca_1',
      code: 'CA_01',
      nombre: 'Respiración Profunda',
      tipo: 'CA',
      duracionSeg: 180,
      piezaId: null,
    },
    {
      id: 'bloque_cb_1',
      code: 'CB_01',
      nombre: 'Escalas Básicas',
      tipo: 'CB',
      duracionSeg: 600,
      piezaId: null,
    },
    {
      id: 'bloque_tc_1',
      code: 'TC_01',
      nombre: 'Ejercicio Técnico de Ligaduras',
      tipo: 'TC',
      duracionSeg: 420,
      piezaId: null,
    },
    {
      id: 'bloque_tm_1',
      code: 'TM_01',
      nombre: 'Metrónomo Gradual',
      tipo: 'TM',
      duracionSeg: 300,
      piezaId: null,
    },
    {
      id: 'bloque_fm_1',
      code: 'FM_01',
      nombre: 'Fragmento Principal',
      tipo: 'FM',
      duracionSeg: 900,
      piezaId: null,
    },
    {
      id: 'bloque_vc_1',
      code: 'VC_01',
      nombre: 'Vuelta a la Calma',
      tipo: 'VC',
      duracionSeg: 180,
      piezaId: null,
    },
    {
      id: 'bloque_ad_1',
      code: 'AD_01',
      nombre: 'Recordatorio Postura',
      tipo: 'AD',
      duracionSeg: 0,
      piezaId: null,
    },
  ];
}

/**
 * Genera una pieza de ejemplo
 */
function generatePieza(): any {
  return {
    id: 'pieza_ejemplo_1',
    nombre: 'Pieza de Ejemplo',
    compositor: 'Anónimo',
    instrumento: 'Trompeta',
    dificultad: 'media',
    duracionAprox: 1800,
    created_date: new Date().toISOString(),
  };
}

/**
 * Genera un plan de ejemplo con semanas y sesiones
 */
function generatePlan(piezaId: string, bloques: any[]): any {
  const semanas = [];

  for (let semanaIdx = 0; semanaIdx < 4; semanaIdx++) {
    const sesiones = [];

    for (let sesionIdx = 0; sesionIdx < 3; sesionIdx++) {
      const sesionBloques = [
        { ...bloques[0], code: `CA_${semanaIdx}_${sesionIdx}` }, // Calentamiento
        { ...bloques[1], code: `CB_${semanaIdx}_${sesionIdx}` }, // Cuerpo
        { ...bloques[2], code: `TC_${semanaIdx}_${sesionIdx}` }, // Técnica
        { ...bloques[6], code: `AD_${semanaIdx}_${sesionIdx}` }, // Advertencia
        { ...bloques[4], code: `FM_${semanaIdx}_${sesionIdx}` }, // Fragmento
        { ...bloques[5], code: `VC_${semanaIdx}_${sesionIdx}` }, // Vuelta a calma
      ].map(b => ({
        ...b,
        id: generateId('bloque'),
      }));

      const sesion = {
        id: generateId('sesion'),
        nombre: `Sesión ${sesionIdx + 1}`,
        objetivo: `Objetivo de sesión ${sesionIdx + 1} semana ${semanaIdx + 1}`,
        bloques: sesionBloques,
        rondas: [],
        secuencia: sesionBloques.filter(b => b.tipo !== 'AD').map(b => ({ kind: 'BLOQUE', code: b.code })),
      };

      // Calcular tiempo estimado usando la función unificada
      sesion.tiempoEstimado = calcularTiempoSesion(sesion);

      sesiones.push(sesion);
    }

    semanas.push({
      id: generateId('semana'),
      nombre: `Semana ${semanaIdx + 1}`,
      objetivo: `Objetivo de semana ${semanaIdx + 1}`,
      foco: ['GEN', 'LIG', 'RIT', 'ART'][semanaIdx % 4],
      sesiones,
    });
  }

  return {
    id: generateId('plan'),
    nombre: 'Plan de Ejemplo - 4 Semanas',
    focoGeneral: 'GEN',
    objetivoSemanalPorDefecto: 'Mejorar técnica y musicalidad',
    piezaId,
    semanas,
    created_date: new Date().toISOString(),
  };
}

/**
 * Genera asignaciones para los estudiantes
 */
function generateAsignaciones(planes: any[], pieza: any, estudiantes: any[], profesores: any[]): any[] {
  const asignaciones = [];
  const hoy = new Date();
  const lunesSemana = startOfMonday(hoy);

  estudiantes.forEach((estudiante, idx) => {
    const plan = planes[idx % planes.length];
    const profesor = profesores[0];

    // Crear snapshot del plan para la asignación
    const planSnapshot = JSON.parse(JSON.stringify(plan));

    const asignacion = {
      id: generateId('asignacion'),
      alumnoId: estudiante.id,
      profesorId: profesor.id,
      piezaId: pieza.id,
      estado: idx === 0 ? 'publicada' : 'borrador',
      semanaInicioISO: formatLocalDate(lunesSemana),
      plan: planSnapshot,
      piezaSnapshot: JSON.parse(JSON.stringify(pieza)),
      created_date: new Date().toISOString(),
    };

    asignaciones.push(asignacion);
  });

  return asignaciones;
}

/**
 * Genera registros de sesión de ejemplo
 */
function generateRegistrosSesion(asignaciones: any[], estudiantes: any[]): any[] {
  const registros = [];
  const hoy = new Date();

  asignaciones.forEach((asignacion) => {
    if (asignacion.estado !== 'publicada') return;

    const plan = asignacion.plan;
    if (!plan || !plan.semanas || !Array.isArray(plan.semanas)) return;

    // Generar algunos registros para la primera semana
    const primeraSemana = plan.semanas[0];
    if (!primeraSemana || !primeraSemana.sesiones || !Array.isArray(primeraSemana.sesiones)) return;

    primeraSemana.sesiones.slice(0, 2).forEach((sesion, sesionIdx) => {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - (2 - sesionIdx));

      const registro = {
        id: generateId('registro_sesion'),
        asignacionId: asignacion.id,
        alumnoId: asignacion.alumnoId,
        inicioISO: formatLocalDate(fecha),
        finISO: formatLocalDate(fecha),
        duracionSeg: sesion.tiempoEstimado || 1800,
        estado: 'completada',
        created_date: new Date().toISOString(),
      };

      registros.push(registro);
    });
  });

  return registros;
}

/**
 * Genera registros de bloque basados en registros de sesión
 */
function generateRegistrosBloque(registrosSesion: any[], asignaciones: any[]): any[] {
  const registros = [];

  registrosSesion.forEach((registroSesion) => {
    const asignacion = asignaciones.find(a => a.id === registroSesion.asignacionId);
    if (!asignacion || !asignacion.plan) return;

    const plan = asignacion.plan;
    if (!plan.semanas || !Array.isArray(plan.semanas)) return;

    // Encontrar la sesión correspondiente (simplificado)
    const primeraSemana = plan.semanas[0];
    if (!primeraSemana || !primeraSemana.sesiones || !Array.isArray(primeraSemana.sesiones)) return;

    const sesion = primeraSemana.sesiones[0];
    if (!sesion || !sesion.bloques || !Array.isArray(sesion.bloques)) return;

    // Generar registros para bloques no-AD
    sesion.bloques
      .filter((b: any) => b && b.tipo !== 'AD' && b.tipo !== 'ad')
      .forEach((bloque: any) => {
        const registro = {
          id: generateId('registro_bloque'),
          registroSesionId: registroSesion.id,
          bloqueId: bloque.id || bloque.code,
          duracionSeg: bloque.duracionSeg || 0,
          estado: 'completado',
          orden: sesion.bloques.indexOf(bloque),
          created_date: new Date().toISOString(),
        };

        registros.push(registro);
      });
  });

  return registros;
}

/**
 * Genera feedbacks semanales
 */
function generateFeedbacks(asignaciones: any[], estudiantes: any[], profesores: any[]): any[] {
  const feedbacks = [];
  const hoy = new Date();

  asignaciones.forEach((asignacion) => {
    if (asignacion.estado !== 'publicada') return;

    const semanaInicio = parseLocalDate(asignacion.semanaInicioISO);
    const lunesPasado = startOfMonday(new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000));

    const feedback = {
      id: generateId('feedback'),
      alumnoId: asignacion.alumnoId,
      profesorId: asignacion.profesorId,
      semanaISO: formatLocalDate(lunesPasado),
      comentarios: `Feedback semanal para ${estudiantes.find(e => e.id === asignacion.alumnoId)?.nombreCompleto || 'estudiante'}`,
      progreso: 'bueno',
      created_date: new Date().toISOString(),
    };

    feedbacks.push(feedback);
  });

  return feedbacks;
}

/**
 * Genera evaluaciones técnicas de ejemplo
 */
function generateEvaluacionesTecnicas(estudiantes: any[], profesores: any[]): any[] {
  const evaluaciones = [];
  const hoy = new Date();
  const profesor = profesores[0];

  estudiantes.forEach((estudiante, idx) => {
    // Evaluación 1: Hace 1 mes (Inicial)
    const fecha1 = new Date(hoy);
    fecha1.setMonth(fecha1.getMonth() - 1);

    evaluaciones.push({
      id: generateId('eval_tec'),
      alumnoId: estudiante.id,
      profesorId: profesor.id,
      fecha: formatLocalDate(fecha1),
      habilidades: {
        sonido: 5 + idx, // Variación por estudiante
        flexibilidad: 4,
        motricidad: 60 + (idx * 5),
        articulacion: { t: 80, tk: 60, ttk: 40 },
        cognitivo: 6
      },
      notas: 'Evaluación inicial. Buen punto de partida.',
      created_at: fecha1.toISOString(),
      updated_at: fecha1.toISOString(),
    });

    // Evaluación 2: Actual (Progreso)
    evaluaciones.push({
      id: generateId('eval_tec'),
      alumnoId: estudiante.id,
      profesorId: profesor.id,
      fecha: formatLocalDate(hoy),
      habilidades: {
        sonido: 6 + idx, // Mejora
        flexibilidad: 6, // Mejora notable
        motricidad: 72 + (idx * 5), // Mejora BPM
        articulacion: { t: 90, tk: 75, ttk: 55 },
        cognitivo: 7
      },
      notas: 'Progreso sólido en flexibilidad. Reforzar TTK.',
      created_at: hoy.toISOString(),
      updated_at: hoy.toISOString(),
    });
  });

  return evaluaciones;
}

/**
 * Función principal para generar todos los datos desde cero
 */
export function seedLocalData(): LocalData {
  console.log('🌱 Generando datos locales desde cero...');

  // 1. Usuarios (siempre desde localUsers)
  const usuarios = localUsers.filter(u => VALID_USER_IDS.includes(u.id));

  // 2. Bloques
  const bloques = generateBloques();

  // 3. Pieza
  const pieza = generatePieza();
  const piezas = [pieza];

  // 4. Planes
  const plan = generatePlan(pieza.id, bloques);
  const planes = [plan];

  // 5. Asignaciones
  const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
  const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');
  const asignaciones = generateAsignaciones(planes, pieza, estudiantes, profesores);

  // 6. Registros de sesión
  const registrosSesion = generateRegistrosSesion(asignaciones, estudiantes);

  // 7. Registros de bloque
  const registrosBloque = generateRegistrosBloque(registrosSesion, asignaciones);

  // 8. Feedbacks
  const feedbacksSemanal = generateFeedbacks(asignaciones, estudiantes, profesores);

  // 9. Evaluaciones Técnicas
  const evaluacionesTecnicas = generateEvaluacionesTecnicas(estudiantes, profesores);

  const data: LocalData = {
    usuarios,
    asignaciones,
    bloques,
    feedbacksSemanal,
    piezas,
    planes,
    registrosBloque,
    registrosSesion,
    evaluacionesTecnicas,
  };

  console.log('✅ Datos generados:');
  console.log(`   - ${data.usuarios.length} usuarios`);
  console.log(`   - ${data.asignaciones.length} asignaciones`);
  console.log(`   - ${data.bloques.length} bloques`);
  console.log(`   - ${data.piezas.length} piezas`);
  console.log(`   - ${data.planes.length} planes`);
  console.log(`   - ${data.registrosSesion.length} registros de sesión`);
  console.log(`   - ${data.registrosBloque.length} registros de bloque`);
  console.log(`   - ${data.feedbacksSemanal.length} feedbacks`);
  console.log(`   - ${data.evaluacionesTecnicas.length} evaluaciones técnicas`);

  return data;
}

/**
 * Guarda los datos generados en localStorage
 */
export function saveSeedDataToLocalStorage(data: LocalData): void {
  console.log('💾 Guardando datos en localStorage...');

  localStorage.setItem('local_asignaciones', JSON.stringify(data.asignaciones));
  localStorage.setItem('local_bloques', JSON.stringify(data.bloques));
  localStorage.setItem('local_feedbacksSemanal', JSON.stringify(data.feedbacksSemanal));
  localStorage.setItem('local_piezas', JSON.stringify(data.piezas));
  localStorage.setItem('local_planes', JSON.stringify(data.planes));
  localStorage.setItem('local_registrosBloque', JSON.stringify(data.registrosBloque));
  localStorage.setItem('local_registrosSesion', JSON.stringify(data.registrosSesion));
  localStorage.setItem('local_evaluacionesTecnicas', JSON.stringify(data.evaluacionesTecnicas));

  console.log('✅ Datos guardados en localStorage');
}

/**
 * Función completa: generar y guardar datos
 */
export function seedAndSaveLocalData(): LocalData {
  const data = seedLocalData();
  saveSeedDataToLocalStorage(data);
  return data;
}

