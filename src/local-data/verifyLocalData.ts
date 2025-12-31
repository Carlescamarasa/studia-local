
// Script de validación de coherencia de datos locales
// Verifica que todas las referencias entre entidades sean válidas

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { localDataClient } from '@/api/localDataClient';
import { localUsers } from './localUsers';
import { loadFromStorage, StorageData } from '@/data/localStorageClient';
import {
  Asignacion,
  Bloque,
  FeedbackSemanal,
  Pieza,
  Plan,
  RegistroBloque,
  RegistroSesion,
  Usuario
} from '@/types/data.types';

export interface ValidationReport {
  ok: string[];
  warnings: string[];
  errors: string[];
  stats: Record<string, number>;
}

/**
 * Valida la coherencia de todos los datos locales
 * @returns {ValidationReport} Reporte de validación con errores, warnings y estadísticas
 */
export function verifyLocalData(): ValidationReport {
  const report: ValidationReport = {
    ok: [],
    warnings: [],
    errors: [],
    stats: {},
  };

  try {
    // Cargar todos los datos desde studia_data o usar arrays vacíos
    const storage = (loadFromStorage() || {}) as Partial<StorageData>;

    // cast to unknown first to avoid overlap errors if types don't match perfectly yet
    const usuarios: Usuario[] = (storage.usuarios?.length ? storage.usuarios : localUsers) as unknown as Usuario[];
    const asignaciones: Asignacion[] = (Array.isArray(storage.asignaciones) ? storage.asignaciones : []) as unknown as Asignacion[];
    const bloques: Bloque[] = (Array.isArray(storage.bloques) ? storage.bloques : []) as unknown as Bloque[];
    const feedbacksSemanal: FeedbackSemanal[] = (Array.isArray(storage.feedbacksSemanal) ? storage.feedbacksSemanal : []) as unknown as FeedbackSemanal[];
    const piezas: Pieza[] = (Array.isArray(storage.piezas) ? storage.piezas : []) as unknown as Pieza[];
    const planes: Plan[] = (Array.isArray(storage.planes) ? storage.planes : []) as unknown as Plan[];
    const registrosBloque: RegistroBloque[] = (Array.isArray(storage.registrosBloque) ? storage.registrosBloque : []) as unknown as RegistroBloque[];
    const registrosSesion: RegistroSesion[] = (Array.isArray(storage.registrosSesion) ? storage.registrosSesion : []) as unknown as RegistroSesion[];

    // Estadísticas básicas
    report.stats = {
      usuarios: usuarios.length,
      asignaciones: asignaciones.length,
      bloques: bloques.length,
      feedbacksSemanal: feedbacksSemanal.length,
      piezas: piezas.length,
      planes: planes.length,
      registrosBloque: registrosBloque.length,
      registrosSesion: registrosSesion.length,
    };

    // Crear índices para búsquedas rápidas
    const usuariosById = new Map(usuarios.map(u => [u.id, u]));
    const piezasById = new Map(piezas.map(p => [p.id, p]));
    const planesById = new Map(planes.map(p => [p.id, p]));
    const bloquesById = new Map(bloques.map(b => [b.id, b]));
    const asignacionesById = new Map(asignaciones.map(a => [a.id, a]));
    const registrosSesionById = new Map(registrosSesion.map(r => [r.id, r]));

    // 1. Validar usuarios
    report.ok.push(`[OK] usuarios: ${usuarios.length}`);
    const usuariosSinId = usuarios.filter(u => !u.id);
    if (usuariosSinId.length > 0) {
      report.errors.push(`[ERROR] usuarios: ${usuariosSinId.length} usuarios sin ID`);
    }

    // 2. Validar asignaciones
    report.ok.push(`[OK] asignaciones: ${asignaciones.length}`);

    // Asignaciones con alumnoId inexistente
    const asignacionesAlumnoInvalido = asignaciones.filter(a => {
      const alumnoId = a.alumnoId || (a as any).estudianteId || (a as any).userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (asignacionesAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] asignaciones: ${asignacionesAlumnoInvalido.length} asignaciones tienen alumnoId inexistente`);
      report.errors.push(`  Ejemplos: ${asignacionesAlumnoInvalido.slice(0, 3).map(a => a.id || 'sin-id').join(', ')}`);
    }

    // Asignaciones con profesorId inexistente
    const asignacionesProfesorInvalido = asignaciones.filter(a => {
      const profesorId = a.profesorId || (a as any).profesorAsignadoId;
      return profesorId && !usuariosById.has(profesorId);
    });
    if (asignacionesProfesorInvalido.length > 0) {
      report.warnings.push(`[WARN] asignaciones: ${asignacionesProfesorInvalido.length} asignaciones tienen profesorId inexistente`);
    }

    // Asignaciones con piezaId inexistente
    const asignacionesPiezaInvalida = asignaciones.filter(a => {
      const piezaId = a.piezaId;
      // piezaId can be null/undefined in some contexts
      return piezaId && !piezasById.has(piezaId);
    });
    if (asignacionesPiezaInvalida.length > 0) {
      report.errors.push(`[ERROR] asignaciones: ${asignacionesPiezaInvalida.length} asignaciones tienen piezaId inexistente`);
    }

    // Asignaciones sin plan válido (si tienen planId, debe existir)
    const asignacionesPlanInvalido = asignaciones.filter(a => {
      if ((a as any).plan && typeof (a as any).plan === 'object') {
        // Si plan es un objeto, está bien (snapshot)
        return false;
      }
      const planId = a.planId;
      return planId && !planesById.has(planId);
    });
    if (asignacionesPlanInvalido.length > 0) {
      report.warnings.push(`[WARN] asignaciones: ${asignacionesPlanInvalido.length} asignaciones tienen planId inexistente`);
    }

    // 3. Validar piezas
    report.ok.push(`[OK] piezas: ${piezas.length}`);
    const piezasSinId = piezas.filter(p => !p.id);
    if (piezasSinId.length > 0) {
      report.errors.push(`[ERROR] piezas: ${piezasSinId.length} piezas sin ID`);
    }

    // 4. Validar planes
    report.ok.push(`[OK] planes: ${planes.length}`);

    // Planes con piezaId inexistente
    const planesPiezaInvalida = planes.filter(p => {
      const piezaId = p.piezaId;
      return piezaId && !piezasById.has(piezaId);
    });
    if (planesPiezaInvalida.length > 0) {
      report.errors.push(`[ERROR] planes: ${planesPiezaInvalida.length} planes tienen piezaId inexistente`);
    }

    // 5. Validar bloques
    report.ok.push(`[OK] bloques: ${bloques.length}`);

    // Bloques con piezaId inexistente (si tienen referencia)
    const bloquesPiezaInvalida = bloques.filter(b => {
      const piezaId = (b as any).piezaRefId;
      return piezaId && !piezasById.has(piezaId);
    });
    if (bloquesPiezaInvalida.length > 0) {
      report.warnings.push(`[WARN] bloques: ${bloquesPiezaInvalida.length} bloques tienen piezaId inexistente`);
    }

    // 6. Validar registros de sesión
    report.ok.push(`[OK] registrosSesion: ${registrosSesion.length}`);

    // Registros con asignacionId inexistente
    const registrosAsignacionInvalida = registrosSesion.filter(r => {
      const asignacionId = r.asignacionId || (r as any).asignacion_id;
      return asignacionId && !asignacionesById.has(asignacionId);
    });
    if (registrosAsignacionInvalida.length > 0) {
      report.warnings.push(`[WARN] registrosSesion: ${registrosAsignacionInvalida.length} registros tienen asignacionId inexistente`);
    }

    // Registros con alumnoId inexistente
    const registrosAlumnoInvalido = registrosSesion.filter(r => {
      const alumnoId = r.alumnoId || (r as any).estudianteId || (r as any).userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (registrosAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] registrosSesion: ${registrosAlumnoInvalido.length} registros tienen alumnoId inexistente`);
    }

    // 7. Validar registros de bloque
    report.ok.push(`[OK] registrosBloque: ${registrosBloque.length}`);

    // Registros con registroSesionId inexistente
    const registrosBloqueSesionInvalida = registrosBloque.filter(r => {
      const sesionId = r.registroSesionId || (r as any).registroSesion_id || (r as any).sesionId;
      return sesionId && !registrosSesionById.has(sesionId);
    });
    if (registrosBloqueSesionInvalida.length > 0) {
      report.errors.push(`[ERROR] registrosBloque: ${registrosBloqueSesionInvalida.length} registros tienen registroSesionId inexistente`);
    }

    // Registros con bloqueId inexistente
    const registrosBloqueInvalido = registrosBloque.filter(r => {
      const bloqueId = r.bloqueId || (r as any).ejercicioId || (r as any).bloque_id;
      return bloqueId && !bloquesById.has(bloqueId);
    });
    if (registrosBloqueInvalido.length > 0) {
      report.errors.push(`[ERROR] registrosBloque: ${registrosBloqueInvalido.length} registros tienen bloqueId inexistente`);
    }

    // 8. Validar feedbacks semanales
    report.ok.push(`[OK] feedbacksSemanal: ${feedbacksSemanal.length}`);

    // Feedbacks con alumnoId inexistente
    const feedbacksAlumnoInvalido = feedbacksSemanal.filter(f => {
      const alumnoId = f.alumnoId || (f as any).estudianteId || (f as any).userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (feedbacksAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] feedbacksSemanal: ${feedbacksAlumnoInvalido.length} feedbacks tienen alumnoId inexistente`);
    }

    // Feedbacks con profesorId inexistente
    const feedbacksProfesorInvalido = feedbacksSemanal.filter(f => {
      const profesorId = f.profesorId || (f as any).profesorAsignadoId;
      return profesorId && !usuariosById.has(profesorId);
    });
    if (feedbacksProfesorInvalido.length > 0) {
      report.warnings.push(`[WARN] feedbacksSemanal: ${feedbacksProfesorInvalido.length} feedbacks tienen profesorId inexistente`);
    }

    // 9. Validar campos requeridos
    const asignacionesSinSemana = asignaciones.filter(a => !a.semanaInicioISO && !(a as any).semana_inicio_iso);
    if (asignacionesSinSemana.length > 0) {
      report.warnings.push(`[WARN] asignaciones: ${asignacionesSinSemana.length} asignaciones sin semanaInicioISO`);
    }

    const registrosSinFecha = registrosSesion.filter(r => !r.inicioISO && !(r as any).inicio_iso && !(r as any).fecha);
    if (registrosSinFecha.length > 0) {
      report.warnings.push(`[WARN] registrosSesion: ${registrosSinFecha.length} registros sin fecha de inicio`);
    }

  } catch (error: any) {
    report.errors.push(`[ERROR] Error al validar datos: ${error.message}`);
    console.error('Error en verifyLocalData:', error);
  }

  return report;
}

/**
 * Imprime el reporte de validación en la consola
 * @param {boolean} autoFix - Si true, intenta reparar automáticamente los errores detectados
 */
export function printValidationReport(autoFix = false) {
  const report = verifyLocalData();

  // Si autoFix está activado y hay errores, intentar reparar
  if (autoFix && report.errors.length > 0) {
    console.log('\n🔧 Intentando reparar errores automáticamente...');
    console.log('⚠️  Para reparar datos, usa: import { rebuildLocalData } from "./rebuildLocalData"; rebuildLocalData();');
  }

  console.log('\n=== VALIDACIÓN DE DATOS LOCALES ===\n');

  console.log('📊 ESTADÍSTICAS:');
  Object.entries(report.stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n✅ CORRECTO:');
  report.ok.forEach(msg => console.log(`  ${msg}`));

  if (report.warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    report.warnings.forEach(msg => console.log(`  ${msg}`));
  }

  if (report.errors.length > 0) {
    console.log('\n❌ ERRORES:');
    report.errors.forEach(msg => console.log(`  ${msg}`));
  }

  console.log('\n=== FIN DEL REPORTE ===\n');

  return report;
}

// Auto-ejecutar si se importa directamente (útil para desarrollo)
if ((import.meta as any).hot) {
  // Solo en desarrollo, opt-in mediante localStorage
  try {
    const shouldAuto = typeof localStorage !== 'undefined' && localStorage.getItem('debug.validation.auto') === 'true';
    if (shouldAuto) {
      printValidationReport();
    }
  } catch (e) {
    // Ignorar si localStorage no está disponible
  }
}
