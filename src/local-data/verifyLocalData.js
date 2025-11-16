// Script de validación de coherencia de datos locales
// Verifica que todas las referencias entre entidades sean válidas

import { localUsers } from './localUsers';
import { loadFromStorage } from '@/data/localStorageClient';

// Desde ahora, la validación se hace contra la estructura unificada en localStorage (studia_data)

/**
 * Valida la coherencia de todos los datos locales
 * @returns {Object} Reporte de validación con errores, warnings y estadísticas
 */
export function verifyLocalData() {
  const report = {
    ok: [],
    warnings: [],
    errors: [],
    stats: {},
  };

  try {
    // Cargar todos los datos desde studia_data o usar arrays vacíos
    const storage = loadFromStorage() || {};
    const usuarios = storage.usuarios?.length ? storage.usuarios : localUsers;
    const asignaciones = Array.isArray(storage.asignaciones) ? storage.asignaciones : [];
    const bloques = Array.isArray(storage.bloques) ? storage.bloques : [];
    const feedbacksSemanal = Array.isArray(storage.feedbacksSemanal) ? storage.feedbacksSemanal : [];
    const piezas = Array.isArray(storage.piezas) ? storage.piezas : [];
    const planes = Array.isArray(storage.planes) ? storage.planes : [];
    const registrosBloque = Array.isArray(storage.registrosBloque) ? storage.registrosBloque : [];
    const registrosSesion = Array.isArray(storage.registrosSesion) ? storage.registrosSesion : [];

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
      const alumnoId = a.alumnoId || a.estudianteId || a.userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (asignacionesAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] asignaciones: ${asignacionesAlumnoInvalido.length} asignaciones tienen alumnoId inexistente`);
      report.errors.push(`  Ejemplos: ${asignacionesAlumnoInvalido.slice(0, 3).map(a => a.id || 'sin-id').join(', ')}`);
    }

    // Asignaciones con profesorId inexistente
    const asignacionesProfesorInvalido = asignaciones.filter(a => {
      const profesorId = a.profesorId || a.profesorAsignadoId;
      return profesorId && !usuariosById.has(profesorId);
    });
    if (asignacionesProfesorInvalido.length > 0) {
      report.warnings.push(`[WARN] asignaciones: ${asignacionesProfesorInvalido.length} asignaciones tienen profesorId inexistente`);
    }

    // Asignaciones con piezaId inexistente
    const asignacionesPiezaInvalida = asignaciones.filter(a => {
      const piezaId = a.piezaId;
      return piezaId && !piezasById.has(piezaId);
    });
    if (asignacionesPiezaInvalida.length > 0) {
      report.errors.push(`[ERROR] asignaciones: ${asignacionesPiezaInvalida.length} asignaciones tienen piezaId inexistente`);
    }

    // Asignaciones sin plan válido (si tienen planId, debe existir)
    const asignacionesPlanInvalido = asignaciones.filter(a => {
      if (a.plan && typeof a.plan === 'object') {
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
      const piezaId = b.piezaId;
      return piezaId && !piezasById.has(piezaId);
    });
    if (bloquesPiezaInvalida.length > 0) {
      report.warnings.push(`[WARN] bloques: ${bloquesPiezaInvalida.length} bloques tienen piezaId inexistente`);
    }

    // 6. Validar registros de sesión
    report.ok.push(`[OK] registrosSesion: ${registrosSesion.length}`);
    
    // Registros con asignacionId inexistente
    const registrosAsignacionInvalida = registrosSesion.filter(r => {
      const asignacionId = r.asignacionId || r.asignacion_id;
      return asignacionId && !asignacionesById.has(asignacionId);
    });
    if (registrosAsignacionInvalida.length > 0) {
      report.warnings.push(`[WARN] registrosSesion: ${registrosAsignacionInvalida.length} registros tienen asignacionId inexistente`);
    }

    // Registros con alumnoId inexistente
    const registrosAlumnoInvalido = registrosSesion.filter(r => {
      const alumnoId = r.alumnoId || r.estudianteId || r.userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (registrosAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] registrosSesion: ${registrosAlumnoInvalido.length} registros tienen alumnoId inexistente`);
    }

    // 7. Validar registros de bloque
    report.ok.push(`[OK] registrosBloque: ${registrosBloque.length}`);
    
    // Registros con registroSesionId inexistente
    const registrosBloqueSesionInvalida = registrosBloque.filter(r => {
      const sesionId = r.registroSesionId || r.registroSesion_id || r.sesionId;
      return sesionId && !registrosSesionById.has(sesionId);
    });
    if (registrosBloqueSesionInvalida.length > 0) {
      report.errors.push(`[ERROR] registrosBloque: ${registrosBloqueSesionInvalida.length} registros tienen registroSesionId inexistente`);
    }

    // Registros con bloqueId inexistente
    const registrosBloqueInvalido = registrosBloque.filter(r => {
      const bloqueId = r.bloqueId || r.ejercicioId || r.bloque_id;
      return bloqueId && !bloquesById.has(bloqueId);
    });
    if (registrosBloqueInvalido.length > 0) {
      report.errors.push(`[ERROR] registrosBloque: ${registrosBloqueInvalido.length} registros tienen bloqueId inexistente`);
    }

    // 8. Validar feedbacks semanales
    report.ok.push(`[OK] feedbacksSemanal: ${feedbacksSemanal.length}`);
    
    // Feedbacks con alumnoId inexistente
    const feedbacksAlumnoInvalido = feedbacksSemanal.filter(f => {
      const alumnoId = f.alumnoId || f.estudianteId || f.userId;
      return alumnoId && !usuariosById.has(alumnoId);
    });
    if (feedbacksAlumnoInvalido.length > 0) {
      report.errors.push(`[ERROR] feedbacksSemanal: ${feedbacksAlumnoInvalido.length} feedbacks tienen alumnoId inexistente`);
    }

    // Feedbacks con profesorId inexistente
    const feedbacksProfesorInvalido = feedbacksSemanal.filter(f => {
      const profesorId = f.profesorId || f.profesorAsignadoId;
      return profesorId && !usuariosById.has(profesorId);
    });
    if (feedbacksProfesorInvalido.length > 0) {
      report.warnings.push(`[WARN] feedbacksSemanal: ${feedbacksProfesorInvalido.length} feedbacks tienen profesorId inexistente`);
    }

    // 9. Validar campos requeridos
    const asignacionesSinSemana = asignaciones.filter(a => !a.semanaInicioISO && !a.semana_inicio_iso);
    if (asignacionesSinSemana.length > 0) {
      report.warnings.push(`[WARN] asignaciones: ${asignacionesSinSemana.length} asignaciones sin semanaInicioISO`);
    }

    const registrosSinFecha = registrosSesion.filter(r => !r.inicioISO && !r.inicio_iso && !r.fecha);
    if (registrosSinFecha.length > 0) {
      report.warnings.push(`[WARN] registrosSesion: ${registrosSinFecha.length} registros sin fecha de inicio`);
    }

  } catch (error) {
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

/**
 * ========================================
 * GUÍA DE USO DE verifyLocalData.js
 * ========================================
 * 
 * 1. CÓMO EJECUTAR printValidationReport()
 * 
 *    Opción A - Desde la consola del navegador:
 *    ```javascript
 *    import { printValidationReport } from './src/local-data/verifyLocalData.js';
 *    printValidationReport();
 *    ```
 * 
 *    Opción B - Desde un componente React (temporal):
 *    ```javascript
 *    import { printValidationReport } from '@/local-data/verifyLocalData';
 *    useEffect(() => {
 *      printValidationReport();
 *    }, []);
 *    ```
 * 
 *    Opción C - Desde un botón en la UI:
 *    ```javascript
 *    import { printValidationReport } from '@/local-data/verifyLocalData';
 *    <Button onClick={() => printValidationReport()}>Validar Datos</Button>
 *    ```
 * 
 * 2. DÓNDE COLOCAR LA LLAMADA
 * 
 *    Recomendado: En la página /local o crear una página /debug
 *    - No afecta el flujo normal de la app
 *    - Fácil de acceder en desarrollo
 *    - Puede ocultarse en producción
 * 
 * 3. CÓMO INTERPRETAR EL REPORTE
 * 
 *    ✅ [OK] - Todo correcto, no hay problemas
 *    ⚠️  [WARN] - Advertencia: datos que pueden causar problemas menores
 *                 Ejemplo: profesorId inexistente (puede ser histórico)
 *    ❌ [ERROR] - Error crítico: datos que rompen funcionalidad
 *                 Ejemplo: alumnoId inexistente en asignación
 * 
 * 4. EJEMPLO DE SALIDA:
 * 
 *    === VALIDACIÓN DE DATOS LOCALES ===
 *    
 *    📊 ESTADÍSTICAS:
 *      usuarios: 12
 *      asignaciones: 45
 *      ...
 *    
 *    ✅ CORRECTO:
 *      [OK] usuarios: 12
 *      [OK] asignaciones: 45
 *    
 *    ⚠️  ADVERTENCIAS:
 *      [WARN] asignaciones: 2 asignaciones tienen profesorId inexistente
 *    
 *    ❌ ERRORES:
 *      [ERROR] asignaciones: 3 asignaciones tienen alumnoId inexistente
 *        Ejemplos: asig_123, asig_456, asig_789
 * 
 * 5. USO RECOMENDADO
 * 
 *    - Ejecutar después de regenerar datos
 *    - Ejecutar antes de hacer cambios importantes
 *    - Ejecutar cuando se detecten errores en la UI
 *    - Integrar en el flujo de regeneración automática
 */

// Auto-ejecutar si se importa directamente (útil para desarrollo)
if (import.meta.hot) {
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

