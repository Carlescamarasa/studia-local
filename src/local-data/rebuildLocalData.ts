/**
 * Sistema de regeneración de datos locales coherentes
 * Genera datos realistas para desarrollo y testing offline
 */

import { localUsers } from './localUsers';
import { setLocalDataRef } from '@/api/localDataClient';
import { printValidationReport } from './verifyLocalData';
import {
  LocalData,
  Asignacion,
  RegistroSesion,
  RegistroBloque,
  FeedbackSemanal,
  Usuario,
  Bloque,
  Plan,
  Pieza,
  EvaluacionTecnica
} from '@/types/data.types';

// Helper para generar IDs únicos
function generateId(prefix = 'item'): string {
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

// IDs válidos de usuarios (Supabase UUIDs)
const VALID_USER_IDS = [
  'aeb71bd6-2443-49ea-84aa-fbb7f2ab5589', // Carles +01
  '7232a445-c1cb-43c6-9df4-ff663aa77f4f', // Carles Profe
  'a1a9582f-2903-4bac-b456-08a8dd7a4d74', // Carles Camarasa Botella (Admin)
  '77dcf831-6283-462a-83bd-f5c46b3cde28', // La Trompeta Sonará
];

const DEFAULT_ESTUDIANTE_ID = 'aeb71bd6-2443-49ea-84aa-fbb7f2ab5589'; // Carles +01
const DEFAULT_PROFESOR_ID = '7232a445-c1cb-43c6-9df4-ff663aa77f4f'; // Carles Profe

/**
 * Normaliza un número, reemplazando valores inválidos por 0
 */
function safeNumber(n: any): number {
  if (n === null || n === undefined) return 0;
  if (typeof n !== 'number') {
    const parsed = parseFloat(n);
    if (isNaN(parsed)) return 0;
    n = parsed;
  }
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  // Limitar valores absurdamente grandes (más de 12 horas en segundos)
  if (n > 43200) {
    // Si parece estar en milisegundos, convertir
    if (n > 43200000) {
      return Math.floor(n / 1000);
    }
    return 43200; // Máximo 12 horas
  }
  return Math.round(n);
}

/**
 * Valida y corrige referencias de usuario
 */
function isValidUserId(id: string | null | undefined): boolean {
  return !!(id && VALID_USER_IDS.includes(id));
}

/**
 * Repara usuarios: asegura que solo existan los usuarios válidos
 */
export function fixUsers(data: LocalData): LocalData {
  const usuarios = data.usuarios || [];
  // @ts-ignore - localUsers type mismatch with Usuario interface
  const usuariosValidos = localUsers.filter(u => VALID_USER_IDS.includes(u.id));

  console.log(`🔧 Reparando usuarios: ${usuarios.length} -> ${usuariosValidos.length}`);

  return {
    ...data,
    // @ts-ignore
    usuarios: usuariosValidos,
  };
}

/**
 * Repara asignaciones: corrige referencias a usuarios inexistentes
 */
export function fixAsignaciones(data: LocalData): LocalData {
  const asignaciones = [...(data.asignaciones || [])];
  let fixed = 0;

  asignaciones.forEach(a => {
    let changed = false;

    // Corregir alumnoId
    if (!isValidUserId(a.alumnoId)) {
      a.alumnoId = DEFAULT_ESTUDIANTE_ID;
      changed = true;
    }

    // Corregir profesorId
    if (!isValidUserId(a.profesorId)) {
      a.profesorId = DEFAULT_PROFESOR_ID;
      changed = true;
    }

    if (changed) fixed++;
  });

  console.log(`🔧 Reparando asignaciones: ${fixed} referencias corregidas`);

  return {
    ...data,
    asignaciones,
  };
}

/**
 * Repara registros de sesión y bloques: corrige referencias y normaliza números
 */
export function fixRegistros(data: LocalData): LocalData {
  const registrosSesion = [...(data.registrosSesion || [])];
  const registrosBloque = [...(data.registrosBloque || [])];
  let fixedSesion = 0;
  let fixedBloque = 0;
  let removedSesion = 0;
  let removedBloque = 0;

  // Reparar registros de sesión
  const registrosSesionValidos = registrosSesion.filter(r => {
    // Corregir alumnoId
    if (!isValidUserId(r.alumnoId)) {
      r.alumnoId = DEFAULT_ESTUDIANTE_ID;
      fixedSesion++;
    }

    // Normalizar duraciones
    const duracionReal = safeNumber(r.duracionRealSeg);
    const duracionObjetivo = safeNumber(r.duracionObjetivoSeg);

    if (duracionReal !== r.duracionRealSeg || duracionObjetivo !== r.duracionObjetivoSeg) {
      r.duracionRealSeg = duracionReal;
      r.duracionObjetivoSeg = duracionObjetivo;
      fixedSesion++;
    }

    // Filtrar registros con duración inválida o muy grande
    if (duracionReal === 0 && duracionObjetivo === 0) {
      removedSesion++;
      return false;
    }

    return true;
  });

  // Reparar registros de bloques
  const registrosBloqueValidos = registrosBloque.filter(r => {
    // Corregir alumnoId
    if (!isValidUserId(r.alumnoId)) {
      r.alumnoId = DEFAULT_ESTUDIANTE_ID;
      fixedBloque++;
    }

    // Normalizar duraciones
    const duracionReal = safeNumber(r.duracionRealSeg);
    const duracionObjetivo = safeNumber(r.duracionObjetivoSeg);

    if (duracionReal !== r.duracionRealSeg || duracionObjetivo !== r.duracionObjetivoSeg) {
      r.duracionRealSeg = duracionReal;
      r.duracionObjetivoSeg = duracionObjetivo;
      fixedBloque++;
    }

    // Filtrar registros con duración inválida
    if (duracionReal === 0 && duracionObjetivo === 0) {
      removedBloque++;
      return false;
    }

    return true;
  });

  console.log(`🔧 Reparando registros:`);
  console.log(`   Sesiones: ${fixedSesion} corregidas, ${removedSesion} eliminadas`);
  console.log(`   Bloques: ${fixedBloque} corregidos, ${removedBloque} eliminados`);

  return {
    ...data,
    registrosSesion: registrosSesionValidos,
    registrosBloque: registrosBloqueValidos,
  };
}

/**
 * Repara feedbacks semanales: corrige referencias
 */
export function fixFeedbacks(data: LocalData): LocalData {
  const feedbacksSemanal = [...(data.feedbacksSemanal || [])];
  let fixed = 0;

  feedbacksSemanal.forEach(f => {
    let changed = false;

    // Corregir alumnoId
    if (!isValidUserId(f.alumnoId)) {
      f.alumnoId = DEFAULT_ESTUDIANTE_ID;
      changed = true;
    }

    // Corregir profesorId
    if (!isValidUserId(f.profesorId)) {
      f.profesorId = DEFAULT_PROFESOR_ID;
      changed = true;
    }

    if (changed) fixed++;
  });

  console.log(`🔧 Reparando feedbacks: ${fixed} referencias corregidas`);

  return {
    ...data,
    feedbacksSemanal,
  };
}

/**
 * Normaliza todos los números en el dataset
 */
export function normalizeNumbers(data: LocalData): LocalData {
  const registrosSesion = [...(data.registrosSesion || [])];
  const registrosBloque = [...(data.registrosBloque || [])];
  let normalized = 0;

  registrosSesion.forEach(r => {
    const originalReal = r.duracionRealSeg;
    const originalObj = r.duracionObjetivoSeg;

    r.duracionRealSeg = safeNumber(r.duracionRealSeg);
    r.duracionObjetivoSeg = safeNumber(r.duracionObjetivoSeg);
    r.bloquesTotales = safeNumber(r.bloquesTotales);
    r.bloquesCompletados = safeNumber(r.bloquesCompletados);
    r.bloquesOmitidos = safeNumber(r.bloquesOmitidos);
    r.calificacion = r.calificacion != null ? safeNumber(r.calificacion) : undefined;

    if (originalReal !== r.duracionRealSeg || originalObj !== r.duracionObjetivoSeg) {
      normalized++;
    }
  });

  registrosBloque.forEach(r => {
    const originalReal = r.duracionRealSeg;
    const originalObj = r.duracionObjetivoSeg;

    r.duracionRealSeg = safeNumber(r.duracionRealSeg);
    r.duracionObjetivoSeg = safeNumber(r.duracionObjetivoSeg);
    r.ordenEjecucion = safeNumber(r.ordenEjecucion);
    r.iniciosPausa = safeNumber(r.iniciosPausa);

    if (originalReal !== r.duracionRealSeg || originalObj !== r.duracionObjetivoSeg) {
      normalized++;
    }
  });

  console.log(`🔧 Normalizando números: ${normalized} valores corregidos`);

  return {
    ...data,
    registrosSesion,
    registrosBloque,
  };
}

/**
 * Regenera todos los datos locales de forma coherente
 * @param {Object} options - Opciones de regeneración
 * @param {number} options.numSemanas - Número de semanas de datos a generar (default: 4)
 * @param {boolean} options.limpiarExistente - Si true, limpia datos existentes antes de regenerar (default: true)
 * @returns {Promise<Object>} Reporte de regeneración
 */
interface RebuildOptions {
  numSemanas?: number;
  limpiarExistente?: boolean;
}

export async function rebuildAllLocalData(options: RebuildOptions = {}) {
  const {
    numSemanas = 4,
    limpiarExistente = true,
  } = options;

  console.log('🔄 Iniciando regeneración de datos locales...');
  const startTime = Date.now();

  try {
    // 1. Obtener usuarios base
    // @ts-ignore
    const usuarios = [...localUsers];
    const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
    const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF' || u.rolPersonalizado === 'ADMIN');
    // @ts-ignore
    const profesor = profesores[0] || usuarios.find(u => u.rolPersonalizado === 'ADMIN');

    if (estudiantes.length === 0) {
      throw new Error('No hay estudiantes en localUsers.js. Añade al menos un usuario con rolPersonalizado: "ESTU"');
    }

    if (!profesor) {
      throw new Error('No hay profesor o admin disponible');
    }

    // 2. Limpiar datos existentes si se solicita
    if (limpiarExistente) {
      console.log('🧹 Limpiando datos existentes...');
      ['asignaciones', 'bloques', 'feedbacksSemanal', 'piezas', 'planes', 'registrosBloque', 'registrosSesion', 'evaluacionesTecnicas'].forEach(key => {
        localStorage.removeItem(`local_${key}`);
      });
    }

    // 3. Crear pieza base si no existe
    let piezas: Pieza[] = JSON.parse(localStorage.getItem('local_piezas') || '[]');
    let piezaBase = piezas.find(p => p.nombre === 'Seed – Estudio base');

    if (!piezaBase) {
      piezaBase = {
        id: generateId('pieza'),
        nombre: 'Seed – Estudio base',
        descripcion: 'Pieza de referencia para generación de datos de prueba',
        nivel: 'intermedio',
        tiempoObjetivoSeg: 1200,
        elementos: [
          { nombre: 'Introducción', mediaLinks: ['https://www.youtube.com/embed/dQw4w9WgXcQ'] },
          { nombre: 'Tema Principal', mediaLinks: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'] },
          { nombre: 'Partitura', mediaLinks: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Music_notes.svg/800px-Music_notes.svg.png'] },
        ],
        profesorId: profesor.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      piezas.push(piezaBase);
      localStorage.setItem('local_piezas', JSON.stringify(piezas));
      console.log('✅ Pieza base creada');
    }

    // 4. Crear bloques base si no existen
    let bloques: Bloque[] = JSON.parse(localStorage.getItem('local_bloques') || '[]');
    const tiposRequeridos = ['CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD'];
    const ejerciciosBase: Record<string, Bloque> = {};

    for (const tipo of tiposRequeridos) {
      // @ts-ignore
      let ejercicio = bloques.find(b => b.tipo === tipo && b.code?.includes('SEED'));
      if (!ejercicio) {
        const configs = {
          CA: { nombre: 'Calentamiento A', duracion: 300 },
          CB: { nombre: 'Calentamiento B', duracion: 360 },
          TC: { nombre: 'Técnica Central', duracion: 480 },
          TM: { nombre: 'Técnica Mantenimiento', duracion: 360 },
          FM: { nombre: 'Fragmento Musical', duracion: 600 },
          VC: { nombre: 'Vuelta a la Calma', duracion: 240 },
          AD: { nombre: 'Advertencia', duracion: 0 },
        };

        const config = configs[tipo as keyof typeof configs];

        ejercicio = {
          id: generateId('bloque'),
          nombre: config.nombre,
          code: `${tipo}-SEED-001`,
          tipo: tipo as any,
          duracionSeg: config.duracion,
          instrucciones: `Ejercicio ${config.nombre}`,
          indicadorLogro: `Completar ${config.nombre}`,
          materialesRequeridos: [],
          mediaLinks: [],
          elementosOrdenados: [],
          profesorId: profesor.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        bloques.push(ejercicio);
        ejerciciosBase[tipo] = ejercicio;
      } else {
        ejerciciosBase[tipo] = ejercicio;
      }
    }
    localStorage.setItem('local_bloques', JSON.stringify(bloques));
    console.log('✅ Bloques base creados');

    // 5. Crear plan base si no existe
    let planes: Plan[] = JSON.parse(localStorage.getItem('local_planes') || '[]');
    let planBase = planes.find(p => p.nombre === 'Seed – Plan Base');

    if (!planBase) {
      planBase = {
        id: generateId('plan'),
        nombre: 'Seed – Plan Base',
        focoGeneral: 'GEN' as const,
        objetivoSemanalPorDefecto: 'Desarrollar técnica y musicalidad',
        piezaId: piezaBase.id,
        profesorId: profesor.id,
        semanas: [
          {
            nombre: 'Semana 1',
            foco: 'GEN',
            objetivo: 'Bases técnicas y musicales',
            sesiones: [
              {
                nombre: 'Sesión A',
                foco: 'GEN',
                bloques: [
                  { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                  { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                  { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                  { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                ],
                rondas: []
              },
              {
                nombre: 'Sesión B',
                foco: 'RIT',
                bloques: [
                  { ...ejerciciosBase.CB, code: ejerciciosBase.CB.code, nombre: ejerciciosBase.CB.nombre, tipo: 'CB', duracionSeg: 360 },
                  { ...ejerciciosBase.TM, code: ejerciciosBase.TM.code, nombre: ejerciciosBase.TM.nombre, tipo: 'TM', duracionSeg: 360 },
                  { ...ejerciciosBase.AD, code: ejerciciosBase.AD.code, nombre: ejerciciosBase.AD.nombre, tipo: 'AD', duracionSeg: 0 },
                  { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                ],
                rondas: []
              }
            ]
          },
          {
            nombre: 'Semana 2',
            foco: 'ART',
            objetivo: 'Refinar articulación',
            sesiones: [
              {
                nombre: 'Sesión A',
                foco: 'ART',
                bloques: [
                  { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                  { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                  { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                ],
                rondas: []
              }
            ]
          },
          {
            nombre: 'Semana 3',
            foco: 'S&A',
            objetivo: 'Sonido y afinación',
            sesiones: [
              {
                nombre: 'Sesión A',
                foco: 'S&A',
                bloques: [
                  { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                  { ...ejerciciosBase.CB, code: ejerciciosBase.CB.code, nombre: ejerciciosBase.CB.nombre, tipo: 'CB', duracionSeg: 360 },
                  { ...ejerciciosBase.FM, code: ejerciciosBase.FM.code, nombre: ejerciciosBase.FM.nombre, tipo: 'FM', duracionSeg: 600 },
                  { ...ejerciciosBase.VC, code: ejerciciosBase.VC.code, nombre: ejerciciosBase.VC.nombre, tipo: 'VC', duracionSeg: 240 },
                ],
                rondas: []
              }
            ]
          },
          {
            nombre: 'Semana 4',
            foco: 'LIG',
            objetivo: 'Ligaduras y fluidez',
            sesiones: [
              {
                nombre: 'Sesión A',
                foco: 'LIG',
                bloques: [
                  { ...ejerciciosBase.CA, code: ejerciciosBase.CA.code, nombre: ejerciciosBase.CA.nombre, tipo: 'CA', duracionSeg: 300 },
                  { ...ejerciciosBase.TC, code: ejerciciosBase.TC.code, nombre: ejerciciosBase.TC.nombre, tipo: 'TC', duracionSeg: 480 },
                  { ...ejerciciosBase.TM, code: ejerciciosBase.TM.code, nombre: ejerciciosBase.TM.nombre, tipo: 'TM', duracionSeg: 360 },
                ],
                rondas: []
              }
            ]
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      planes.push(planBase);
      localStorage.setItem('local_planes', JSON.stringify(planes));
      console.log('✅ Plan base creado (4 semanas)');
    }

    // 6. Generar asignaciones y registros
    const hoy = new Date();
    const lunesActual = startOfMonday(hoy);
    let asignaciones: Asignacion[] = JSON.parse(localStorage.getItem('local_asignaciones') || '[]');
    let registrosSesion: RegistroSesion[] = JSON.parse(localStorage.getItem('local_registrosSesion') || '[]');
    let registrosBloque: RegistroBloque[] = JSON.parse(localStorage.getItem('local_registrosBloque') || '[]');
    let feedbacksSemanal: FeedbackSemanal[] = JSON.parse(localStorage.getItem('local_feedbacksSemanal') || '[]');

    let totalAsignaciones = 0;
    let totalSesiones = 0;
    let totalBloques = 0;
    let totalFeedbacks = 0;

    // Para cada estudiante
    for (const estudiante of estudiantes) {
      const profesorAsignado = usuarios.find(u => u.id === estudiante.profesorAsignadoId) || profesor;

      // Para cada semana
      for (let offsetSemana = -(numSemanas - 1); offsetSemana <= 0; offsetSemana++) {
        const lunesSemana = new Date(lunesActual);
        lunesSemana.setDate(lunesSemana.getDate() + (offsetSemana * 7));
        const semanaInicioISO = formatLocalDate(lunesSemana);

        // Verificar si ya existe asignación para esta semana
        let asignacion = asignaciones.find(a =>
          a.alumnoId === estudiante.id &&
          a.semanaInicioISO === semanaInicioISO
        );

        if (!asignacion) {
          asignacion = {
            id: generateId('asignacion'),
            alumnoId: estudiante.id,
            piezaId: piezaBase.id,
            semanaInicioISO: semanaInicioISO,
            estado: 'publicada',
            foco: 'GEN',
            notas: `Asignación automática - semana del ${parseLocalDate(semanaInicioISO).toLocaleDateString('es-ES')}`,
            plan: JSON.parse(JSON.stringify(planBase!)),
            piezaSnapshot: {
              nombre: piezaBase.nombre,
              descripcion: piezaBase.descripcion,
              nivel: piezaBase.nivel,
              elementos: piezaBase.elementos,
              tiempoObjetivoSeg: piezaBase.tiempoObjetivoSeg,
            },
            profesorId: profesorAsignado.id,
            created_date: new Date().toISOString(),
          };
          asignaciones.push(asignacion);
          totalAsignaciones++;
        }

        // Generar 3-5 sesiones para esta semana
        const numSesionesEnSemana = 3 + Math.floor(Math.random() * 3); // 3-5
        const diasPracticados = new Set<number>();

        // Seleccionar días únicos (4-5 días diferentes)
        while (diasPracticados.size < Math.min(numSesionesEnSemana, 5)) {
          const diaOffset = Math.floor(Math.random() * 7); // 0-6 (lunes-domingo)
          diasPracticados.add(diaOffset);
        }

        const diasArray = Array.from(diasPracticados).sort();
        const franjas = ['manana', 'tarde', 'noche'];
        const focos = ['GEN', 'LIG', 'RIT', 'ART', 'S&A'];

        for (let i = 0; i < numSesionesEnSemana; i++) {
          const diaOffset = diasArray[i % diasArray.length];
          const franja = franjas[Math.floor(Math.random() * franjas.length)];

          let hora, minuto;
          if (franja === 'manana') {
            hora = 7 + Math.floor(Math.random() * 5); // 7-11
            minuto = Math.floor(Math.random() * 60);
          } else if (franja === 'tarde') {
            hora = 15 + Math.floor(Math.random() * 5); // 15-19
            minuto = Math.floor(Math.random() * 60);
          } else {
            hora = 20 + Math.floor(Math.random() * 3); // 20-22
            minuto = Math.floor(Math.random() * 60);
          }

          const fechaSesion = new Date(lunesSemana);
          fechaSesion.setDate(fechaSesion.getDate() + diaOffset);
          fechaSesion.setHours(hora, minuto, 0, 0);

          const duracionSesion = (20 + Math.floor(Math.random() * 41)) * 60; // 20-60 min en segundos
          const fechaFin = new Date(fechaSesion.getTime() + duracionSesion * 1000);

          // Seleccionar 2-4 bloques
          const numBloques = 2 + Math.floor(Math.random() * 3); // 2-4
          const tiposPesos = { CA: 0.2, CB: 0.2, TC: 0.3, TM: 0.15, FM: 0.25, VC: 0.08, AD: 0.02 };
          const bloquesSeleccionados: Bloque[] = [];
          const tiposUsados = new Set<string>();

          for (let b = 0; b < numBloques; b++) {
            const rand = Math.random();
            let acumulado = 0;
            let tipoSeleccionado = 'TC';

            for (const [tipo, peso] of Object.entries(tiposPesos)) {
              acumulado += peso;
              if (rand < acumulado && !tiposUsados.has(tipo)) {
                tipoSeleccionado = tipo;
                tiposUsados.add(tipo);
                break;
              }
            }

            const ejercicio = bloques.find(e => e.tipo === tipoSeleccionado && e.code?.includes('SEED'));
            if (ejercicio) {
              bloquesSeleccionados.push(ejercicio);
            }
          }

          const calificacion = 1 + Math.floor(Math.random() * 4); // 1-4
          const semanaIdx = 0;
          const sesionIdx = i;
          const foco = focos[Math.floor(Math.random() * focos.length)];

          const duracionObjetivo = bloquesSeleccionados
            .filter(b => b.tipo !== 'AD')
            .reduce((sum, b) => sum + (b.duracionSeg || 0), 0);

          const registroSesion: RegistroSesion = {
            id: generateId('registroSesion'),
            asignacionId: asignacion.id,
            alumnoId: estudiante.id,
            // @ts-ignore
            profesorAsignadoId: profesorAsignado.id,
            semanaIdx,
            sesionIdx,
            semanaIndex: offsetSemana + numSemanas, // Added for compatibility
            sesionIndex: i + 1, // Added for compatibility
            // @ts-ignore
            inicioISO: fechaSesion.toISOString(),
            // @ts-ignore
            finISO: fechaFin.toISOString(),
            fecha: formatLocalDate(fechaSesion), // Added for compatibility
            duracionRealSeg: duracionSesion,
            duracionObjetivoSeg: duracionObjetivo,
            bloquesTotales: bloquesSeleccionados.length,
            bloquesCompletados: Math.floor(bloquesSeleccionados.length * 0.85),
            bloquesOmitidos: Math.floor(bloquesSeleccionados.length * 0.15),
            completada: true, // Renamed from finalizada? Check usage.
            // finalizada: true, // Keep if needed by LocalData? No, interface uses completada
            // finAnticipado: false,
            // motivoFin: 'terminado',
            puntuacion: calificacion, // Mapped
            calificacion, // Optional in interface?
            // notas: ...Mapped to comentarios?
            comentarios: calificacion === 4 ? 'Excelente sesión' : calificacion === 3 ? 'Buena práctica' : calificacion === 2 ? 'Práctica aceptable' : 'Sesión difícil',
            // dispositivo: 'RebuildLocalData',
            // versionSchema: '1.0',
            // piezaNombre: piezaBase.nombre,
            // planNombre: planBase.nombre,
            // semanaNombre: 'Semana 1',
            // sesionNombre: `Sesión ${String.fromCharCode(65 + i)}`,
            // foco,
            created_at: new Date().toISOString(), // Use created_at
          };

          registrosSesion.push(registroSesion);
          totalSesiones++;

          // Crear registros de bloques
          let tiempoAcumulado = 0;
          for (let b = 0; b < bloquesSeleccionados.length; b++) {
            const bloque = bloquesSeleccionados[b];
            const esOmitido = Math.random() < 0.15; // 15% omitidos
            const duracionReal = esOmitido ? 0 : (bloque.duracionSeg || 0) + Math.floor((Math.random() * 60) - 30);

            const registroBloque: RegistroBloque = {
              id: generateId('registroBloque'),
              registroSesionId: registroSesion.id,
              sesionId: registroSesion.id,
              asignacionId: asignacion.id,
              alumnoId: estudiante.id,
              semanaIdx,
              sesionIdx,
              ordenEjecucion: b,
              bloqueId: bloque.id, // mapped
              tipo: bloque.tipo as any,
              code: bloque.code || '',
              nombre: bloque.nombre,
              duracionObjetivoSeg: bloque.duracionSeg,
              duracionRealSeg: Math.max(0, duracionReal),
              estado: esOmitido ? 'omitido' : 'completado',
              completado: !esOmitido, // Added for compatibility
              iniciosPausa: Math.floor(Math.random() * 2),
              // inicioISO: new Date(fechaSesion.getTime() + tiempoAcumulado * 1000).toISOString(),
              // finISO: new Date(fechaSesion.getTime() + (tiempoAcumulado + duracionReal) * 1000).toISOString(),
              created_at: new Date().toISOString(),
            };

            registrosBloque.push(registroBloque);
            tiempoAcumulado += duracionReal;
            totalBloques++;
          }
        }

        // Crear feedback semanal
        const notasProfesor = [
          'Excelente progreso esta semana. Sigue mejorando la técnica de respiración.',
          'Buen trabajo general. Recomiendo enfocarte más en la articulación.',
          'Mejora la consistencia en la práctica diaria. Intenta practicar al menos 4 días por semana.',
          'Se nota avance en el control del sonido. Trabaja más en la afinación en el registro agudo.',
          'Práctica sólida esta semana. Continúa con el trabajo de ligaduras.',
          'Necesitas mayor dedicación. Ajusta la embocadura y practica escalas con metrónomo.'
        ];

        const feedback: FeedbackSemanal = {
          id: generateId('feedback'),
          asignacionId: asignacion.id, // Added
          alumnoId: estudiante.id,
          profesorId: profesorAsignado.id,
          semanaIndex: offsetSemana + numSemanas, // Added
          fecha: formatLocalDate(new Date(lunesSemana.getTime() + (5 * 24 * 3600 * 1000))), // Mapped
          // semanaInicioISO,
          // notaProfesor: notasProfesor[Math.floor(Math.random() * notasProfesor.length)],
          respuestaProfesor: notasProfesor[Math.floor(Math.random() * notasProfesor.length)], // Mapped
          estado: 'completado', // Added
          // mediaLinks: [],
          created_at: new Date().toISOString(),
        };

        feedbacksSemanal.push(feedback);
        totalFeedbacks++;
      }
    }

    // 7. Guardar todos los datos en localStorage
    localStorage.setItem('local_asignaciones', JSON.stringify(asignaciones));
    localStorage.setItem('local_registrosSesion', JSON.stringify(registrosSesion));
    localStorage.setItem('local_registrosBloque', JSON.stringify(registrosBloque));
    localStorage.setItem('local_feedbacksSemanal', JSON.stringify(feedbacksSemanal));

    // 8. Actualizar referencia global (para que la app use los nuevos datos)
    const loadedData: LocalData = {
      asignaciones,
      bloques,
      feedbacksSemanal,
      piezas,
      planes,
      registrosBloque,
      registrosSesion,
      usuarios: localUsers as any, // Cast if needed
      evaluacionesTecnicas: []
    };
    // @ts-ignore
    setLocalDataRef({ ...loadedData, loading: false });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = {
      success: true,
      stats: {
        asignaciones: totalAsignaciones,
        sesiones: totalSesiones,
        bloques: totalBloques,
        feedbacks: totalFeedbacks,
        piezas: piezas.length,
        planes: planes.length,
        bloquesBase: bloques.length,
      },
      elapsed,
    };

    console.log('✅ Regeneración completada:', report);
    console.log(`   - ${totalAsignaciones} asignaciones`);
    console.log(`   - ${totalSesiones} sesiones`);
    console.log(`   - ${totalBloques} bloques`);
    console.log(`   - ${totalFeedbacks} feedbacks`);
    console.log(`   - Tiempo: ${elapsed}s`);

    // 9. Ejecutar validación automática
    console.log('\n🔍 Ejecutando validación automática...\n');
    printValidationReport();

    return report;
  } catch (error) {
    console.error('❌ Error en rebuildAllLocalData:', error);
    throw error;
  }
}

/**
 * Función principal de limpieza y reparación de datos
 * Carga datos existentes, los repara y los guarda de nuevo
 */
export async function rebuildLocalData() {
  console.log('🔄 Iniciando limpieza y reparación de datos locales...');
  const startTime = Date.now();

  try {
    // Cargar datos existentes desde localStorage
    const data = {
      usuarios: localUsers,
      asignaciones: JSON.parse(localStorage.getItem('local_asignaciones') || '[]'),
      bloques: JSON.parse(localStorage.getItem('local_bloques') || '[]'),
      feedbacksSemanal: JSON.parse(localStorage.getItem('local_feedbacksSemanal') || '[]'),
      piezas: JSON.parse(localStorage.getItem('local_piezas') || '[]'),
      planes: JSON.parse(localStorage.getItem('local_planes') || '[]'),
      registrosBloque: JSON.parse(localStorage.getItem('local_registrosBloque') || '[]'),
      registrosSesion: JSON.parse(localStorage.getItem('local_registrosSesion') || '[]'),
      evaluacionesTecnicas: JSON.parse(localStorage.getItem('local_evaluacionesTecnicas') || '[]'),
    };

    console.log(`📊 Datos cargados:`);
    console.log(`   - ${data.usuarios.length} usuarios`);
    console.log(`   - ${data.asignaciones.length} asignaciones`);
    console.log(`   - ${data.registrosSesion.length} registros de sesión`);
    console.log(`   - ${data.registrosBloque.length} registros de bloques`);
    console.log(`   - ${data.feedbacksSemanal.length} feedbacks`);

    // Aplicar todas las funciones de reparación
    let repaired = fixUsers(data);
    repaired = fixAsignaciones(repaired);
    repaired = fixRegistros(repaired);
    repaired = fixFeedbacks(repaired);
    repaired = normalizeNumbers(repaired);

    // Guardar datos reparados
    localStorage.setItem('local_asignaciones', JSON.stringify(repaired.asignaciones));
    localStorage.setItem('local_registrosSesion', JSON.stringify(repaired.registrosSesion));
    localStorage.setItem('local_registrosBloque', JSON.stringify(repaired.registrosBloque));
    localStorage.setItem('local_feedbacksSemanal', JSON.stringify(repaired.feedbacksSemanal));
    localStorage.setItem('local_evaluacionesTecnicas', JSON.stringify(repaired.evaluacionesTecnicas || []));

    // Actualizar referencia global
    setLocalDataRef({
      ...repaired,
      loading: false,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Limpieza completada en ${elapsed}s`);
    console.log(`📊 Datos reparados:`);
    console.log(`   - ${repaired.usuarios.length} usuarios`);
    console.log(`   - ${repaired.asignaciones.length} asignaciones`);
    console.log(`   - ${repaired.registrosSesion.length} registros de sesión`);
    console.log(`   - ${repaired.registrosBloque.length} registros de bloques`);
    console.log(`   - ${repaired.feedbacksSemanal.length} feedbacks`);

    // Ejecutar validación automática
    console.log('\n🔍 Ejecutando validación automática...\n');
    printValidationReport();

    return {
      success: true,
      elapsed,
      stats: {
        usuarios: repaired.usuarios.length,
        asignaciones: repaired.asignaciones.length,
        registrosSesion: repaired.registrosSesion.length,
        registrosBloque: repaired.registrosBloque.length,
        feedbacks: repaired.feedbacksSemanal.length,
      },
    };
  } catch (error) {
    console.error('❌ Error en rebuildLocalData:', error);
    throw error;
  }
}
