import { useMemo } from "react";
import { formatLocalDate, parseLocalDate, startOfMonday } from "../utils/progresoUtils";
import { buildDailySeries, aggregateData } from "../utils/chartHelpers";
import { RegistroSesion, RegistroBloque } from "@/features/shared/types/domain";

/**
 * Normaliza un número, reemplazando valores inválidos por 0
 */
function safeNumber(n: any): number {
  if (n === null || n === undefined) return 0;
  if (typeof n !== 'number') {
    const parsed = parseFloat(n);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    n = parsed;
  }
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 43200) {
    if (n > 43200000) {
      return Math.floor(n / 1000);
    }
    return 43200;
  }
  return Math.round(n);
}

/**
 * Valida y corrige duración (detecta si está en milisegundos)
 */
function validarDuracion(duracionSeg: any): number {
  return safeNumber(duracionSeg);
}

/**
 * Normaliza valores agregados (sin límite superior de 12h)
 */
function normalizeAggregate(n: any): number {
  if (n === null || n === undefined) return 0;
  if (typeof n !== 'number') {
    const parsed = parseFloat(n);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    n = parsed;
  }
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.round(n);
}

/**
 * Calcula la racha de días consecutivos
 */
function calcularRacha(registros: RegistroSesion[], userIdActual: string | null) {
  const diasSet = new Set<string>();
  registros.forEach((r: RegistroSesion) => {
    if (r.inicioISO) {
      const fecha = new Date(r.inicioISO);
      const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const diaISO = formatLocalDate(fechaLocal);
      diasSet.add(diaISO);
    }
  });

  const diasArraySortedAsc = Array.from(diasSet).sort((a: string, b: string) => a.localeCompare(b));
  if (diasArraySortedAsc.length === 0) return { actual: 0, maxima: 0 };

  const hoy = formatLocalDate(new Date());
  let rachaActual = 0;
  let fechaActual = hoy;

  while (diasSet.has(fechaActual)) {
    rachaActual++;
    const fechaDate = parseLocalDate(fechaActual);
    fechaDate.setDate(fechaDate.getDate() - 1);
    fechaActual = formatLocalDate(fechaDate);
  }

  let rachaMaxima = 1;
  if (diasArraySortedAsc.length > 0) {
    let currentMaxStreak = 1;
    for (let i = 1; i < diasArraySortedAsc.length; i++) {
      const currentDate = parseLocalDate(diasArraySortedAsc[i] as string);
      const previousDate = parseLocalDate(diasArraySortedAsc[i - 1] as string);
      const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentMaxStreak++;
      } else if (diffDays > 1) {
        currentMaxStreak = 1;
      }
      rachaMaxima = Math.max(rachaMaxima, currentMaxStreak);
    }
  }

  return { actual: rachaActual, maxima: rachaMaxima };
}

/**
 * Calcula semanas distintas
 */
function calcularSemanasDistintas(registrosFiltrados: RegistroSesion[]) {
  const semanasSet = new Set<string>();
  registrosFiltrados.forEach((r: RegistroSesion) => {
    if (r.inicioISO) {
      const monday = startOfMonday(new Date(r.inicioISO));
      semanasSet.add(formatLocalDate(monday));
    }
  });
  return semanasSet.size;
}

/**
 * Calcula calidad promedio
 */
function calcularCalidadPromedio(registrosFiltrados: RegistroSesion[]) {
  const conCalificacion = registrosFiltrados.filter(r => {
    const cal = safeNumber(r.calificacion);
    return cal > 0 && cal <= 4;
  });
  if (conCalificacion.length === 0) return null;
  const suma = conCalificacion.reduce((acc, r) => acc + safeNumber(r.calificacion), 0);
  const promedio = suma / conCalificacion.length;
  return Number(promedio.toFixed(1));
}

export interface UseEstadisticasProps {
  registrosFiltradosUnicos: RegistroSesion[];
  bloquesFiltrados: RegistroBloque[];
  periodoInicio: string | null;
  periodoFin: string | null;
  granularidad: string;
  isEstu: boolean;
  userIdActual: string;
}

/**
 * Hook principal para cálculos de estadísticas
 */
export function useEstadisticas({
  registrosFiltradosUnicos,
  bloquesFiltrados = [],
  periodoInicio,
  periodoFin,
  granularidad,
  isEstu,
  userIdActual,
}: UseEstadisticasProps) {
  // KPIs principales
  const kpis = useMemo(() => {
    const tiempoTotal = registrosFiltradosUnicos.reduce((sum, r) => {
      const duracion = validarDuracion(r.duracionRealSeg);
      return sum + duracion;
    }, 0);

    const racha = calcularRacha(registrosFiltradosUnicos, isEstu ? userIdActual : null);
    const calidadPromedio = calcularCalidadPromedio(registrosFiltradosUnicos);
    const semanasDistintas = calcularSemanasDistintas(registrosFiltradosUnicos);

    const numSesiones = registrosFiltradosUnicos.length;
    const tiempoPromedioPorSesion = numSesiones > 0 ? tiempoTotal / numSesiones : 0;

    let mediaSemanalSesiones = 0;
    if (periodoInicio && periodoFin) {
      const inicio = parseLocalDate(periodoInicio);
      const fin = parseLocalDate(periodoFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const numDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      mediaSemanalSesiones = numDias > 0 ? (numSesiones / numDias) * 7 : 0;
    }

    let semanasPeriodo = 0;
    if (periodoInicio && periodoFin) {
      const inicio = parseLocalDate(periodoInicio);
      const fin = parseLocalDate(periodoFin);
      const diffMs = fin.getTime() - inicio.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
      semanasPeriodo = diffDias > 0 ? Math.ceil(diffDias / 7) : 0;
    }

    // Nuevas métricas
    const sesionesCompletadas = registrosFiltradosUnicos.filter(r =>
      (r.bloquesOmitidos || 0) === 0 && (r.bloquesCompletados || 0) > 0
    ).length;
    const porcentajeCompletadas = numSesiones > 0
      ? Number(((sesionesCompletadas / numSesiones) * 100).toFixed(1))
      : 0;

    // Calcular bloques completados y omitidos desde registros_sesion
    let totalCompletados = registrosFiltradosUnicos.reduce((sum, r) =>
      sum + safeNumber(r.bloquesCompletados), 0
    );
    let totalOmitidos = registrosFiltradosUnicos.reduce((sum, r) =>
      sum + safeNumber(r.bloquesOmitidos), 0
    );

    // Si no hay datos en registros_sesion, calcular desde bloques_filtrados como respaldo
    // Esto asegura que siempre tengamos datos precisos
    // Solo usar el respaldo si realmente no hay datos (puede ser que los valores sean 0 pero válidos)
    if (totalCompletados === 0 && totalOmitidos === 0 && bloquesFiltrados.length > 0) {
      const completadosDesdeBloques = bloquesFiltrados.filter((b: RegistroBloque) =>
        b.estado === 'completado'
      ).length;
      const omitidosDesdeBloques = bloquesFiltrados.filter((b: RegistroBloque) =>
        b.estado === 'omitido'
      ).length;

      // Solo usar los datos de bloques si hay al menos algunos bloques
      if (completadosDesdeBloques > 0 || omitidosDesdeBloques > 0) {
        totalCompletados = completadosDesdeBloques;
        totalOmitidos = omitidosDesdeBloques;
      }
    }

    const ratioCompletado = (totalCompletados + totalOmitidos) > 0
      ? Number(((totalCompletados / (totalCompletados + totalOmitidos)) * 100).toFixed(1))
      : 0;

    return {
      tiempoTotal,
      racha,
      calidadPromedio,
      semanasDistintas,
      tiempoPromedioPorSesion,
      semanasPeriodo,
      mediaSemanalSesiones,
      numSesiones,
      sesionesCompletadas,
      porcentajeCompletadas,
      totalCompletados,
      totalOmitidos,
      ratioCompletado,
    };
  }, [registrosFiltradosUnicos, bloquesFiltrados, periodoInicio, periodoFin, isEstu, userIdActual]);

  // Datos para gráfico de línea
  const datosLinea = useMemo(() => {
    // Inferir fechas si no existen (Modo Todo)
    let dStart = periodoInicio ? parseLocalDate(periodoInicio) : null;
    let dEnd = periodoFin ? parseLocalDate(periodoFin) : null;

    if ((!dStart || !dEnd) && registrosFiltradosUnicos.length > 0) {
      const timestamps = registrosFiltradosUnicos
        .map(r => r.inicioISO ? new Date(r.inicioISO).getTime() : null)
        .filter(t => t !== null && !isNaN(t));

      if (timestamps.length > 0) {
        if (!dStart) dStart = new Date(Math.min(...(timestamps as number[])));
        if (!dEnd) dEnd = new Date(Math.max(...(timestamps as number[])));
      }
    }

    // Convertir de vuelta a string para buildDailySeries si es necesario, 
    // o asegurar que buildDailySeries maneje nulls (ya lo hace, pero quizás aggregateData no)

    // 1. Construir serie diaria completa (normalized)
    // buildDailySeries ya infiere, pero pasémosle lo que tenemos por coherencia
    const startStr = dStart ? formatLocalDate(dStart) : periodoInicio;
    const endStr = dEnd ? formatLocalDate(dEnd) : periodoFin;

    const dailySeries = buildDailySeries(registrosFiltradosUnicos, startStr || undefined, endStr || undefined);

    // 2. Agregar según granularidad seleccionada
    const aggregated = aggregateData(dailySeries, granularidad);

    return aggregated;
  }, [registrosFiltradosUnicos, periodoInicio, periodoFin, granularidad]);

  // Tipos de bloques
  const tiposBloques = useMemo(() => {
    const agrupado: Record<string, any> = {};
    bloquesFiltrados.forEach((b: any) => {
      if (!agrupado[b.tipo]) {
        agrupado[b.tipo] = { tipo: b.tipo, tiempoReal: 0, count: 0 };
      }
      const duracion = validarDuracion(b.duracionRealSeg);
      agrupado[b.tipo].tiempoReal += duracion;
      agrupado[b.tipo].count += 1;
    });
    return Object.values(agrupado).map(t => ({
      ...t,
      tiempoReal: normalizeAggregate(t.tiempoReal),
      tiempoMedio: t.count > 0 ? normalizeAggregate(t.tiempoReal / t.count) : 0,
    }));
  }, [bloquesFiltrados]);

  // Top ejercicios
  const topEjercicios = useMemo(() => {
    const ejerciciosMap: Record<string, any> = {};

    bloquesFiltrados.forEach((b: any) => {
      const key = `${b.code}_${b.nombre}_${b.tipo}`;
      if (!ejerciciosMap[key]) {
        ejerciciosMap[key] = {
          code: b.code,
          nombre: b.nombre,
          tipo: b.tipo,
          tiempoTotal: 0,
          sesiones: new Set(),
          ultimaPractica: null,
        };
      }

      const duracion = validarDuracion(b.duracionRealSeg);
      ejerciciosMap[key].tiempoTotal += duracion;
      if (b.registroSesionId) {
        ejerciciosMap[key].sesiones.add(b.registroSesionId);
      }
      if (b.inicioISO) {
        const fechaActual = new Date(b.inicioISO);
        if (!ejerciciosMap[key].ultimaPractica || fechaActual > new Date(ejerciciosMap[key].ultimaPractica)) {
          ejerciciosMap[key].ultimaPractica = b.inicioISO;
        }
      }
    });

    return Object.values(ejerciciosMap)
      .map(e => ({
        ...e,
        tiempoTotal: normalizeAggregate(e.tiempoTotal),
        sesionesCount: e.sesiones.size,
      }))
      .sort((a, b) => b.tiempoTotal - a.tiempoTotal)
      .map((e, index) => ({ ...e, ranking: index + 1 })); // Añadir ranking para mobile
  }, [bloquesFiltrados]);

  // Progreso por pieza
  const progresoPorPieza = useMemo(() => {
    const piezasMap: Record<string, any> = {};

    registrosFiltradosUnicos.forEach((r: any) => {
      const piezaNombre = r.piezaNombre || 'Sin pieza';
      if (!piezasMap[piezaNombre]) {
        piezasMap[piezaNombre] = {
          piezaNombre,
          tiempoTotal: 0,
          sesiones: 0,
          calificaciones: [],
          bloquesCompletados: 0,
          bloquesOmitidos: 0,
        };
      }

      const duracion = validarDuracion(r.duracionRealSeg);
      piezasMap[piezaNombre].tiempoTotal += duracion;
      piezasMap[piezaNombre].sesiones += 1;
      piezasMap[piezaNombre].bloquesCompletados += safeNumber(r.bloquesCompletados);
      piezasMap[piezaNombre].bloquesOmitidos += safeNumber(r.bloquesOmitidos);

      if (r.calificacion !== undefined && r.calificacion !== null) {
        const cal = safeNumber(r.calificacion);
        if (cal > 0 && cal <= 4) {
          piezasMap[piezaNombre].calificaciones.push(cal);
        }
      }
    });

    return Object.values(piezasMap).map(p => {
      const calPromedio = p.calificaciones.length > 0
        ? (p.calificaciones.reduce((sum: number, c: number) => sum + c, 0) / p.calificaciones.length).toFixed(1)
        : null;

      return {
        ...p,
        tiempoTotal: normalizeAggregate(p.tiempoTotal),
        calificacionPromedio: calPromedio,
        ratioCompletado: (p.bloquesCompletados + p.bloquesOmitidos) > 0
          ? ((p.bloquesCompletados / (p.bloquesCompletados + p.bloquesOmitidos)) * 100).toFixed(1)
          : 0,
      };
    }).sort((a, b) => b.tiempoTotal - a.tiempoTotal);
  }, [registrosFiltradosUnicos]);

  // Heatmap de actividad
  const heatmapData = useMemo(() => {
    const actividadPorDia: Record<string, any> = {};

    registrosFiltradosUnicos.forEach((r: any) => {
      if (!r.inicioISO) return;
      const fecha = new Date(r.inicioISO);
      const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const diaISO = formatLocalDate(fechaLocal);

      if (!actividadPorDia[diaISO]) {
        actividadPorDia[diaISO] = {
          fecha: diaISO,
          sesiones: 0,
          tiempo: 0,
        };
      }

      actividadPorDia[diaISO].sesiones += 1;
      const duracion = validarDuracion(r.duracionRealSeg);
      actividadPorDia[diaISO].tiempo += duracion;
    });

    return Object.values(actividadPorDia).map(d => ({
      ...d,
      tiempo: normalizeAggregate(d.tiempo),
    }));
  }, [registrosFiltradosUnicos]);

  // Tiempo real vs objetivo
  const tiempoRealVsObjetivo = useMemo(() => {
    const sesionesConObjetivo = registrosFiltradosUnicos.filter(r =>
      r.duracionObjetivoSeg > 0
    );

    const totalReal = sesionesConObjetivo.reduce((sum: number, r: RegistroSesion) =>
      sum + validarDuracion(r.duracionRealSeg), 0
    );
    const totalObjetivo = sesionesConObjetivo.reduce((sum: number, r: RegistroSesion) =>
      sum + validarDuracion(r.duracionObjetivoSeg), 0
    );

    const sesionesCumplenObjetivo = sesionesConObjetivo.filter(r => {
      const real = validarDuracion(r.duracionRealSeg);
      const objetivo = validarDuracion(r.duracionObjetivoSeg);
      return real >= objetivo * 0.9; // 90% del objetivo
    }).length;

    return {
      totalReal: normalizeAggregate(totalReal),
      totalObjetivo: normalizeAggregate(totalObjetivo),
      diferencia: normalizeAggregate(totalReal - totalObjetivo),
      porcentajeCumplimiento: totalObjetivo > 0
        ? Number(((totalReal / totalObjetivo) * 100).toFixed(1))
        : 0,
      sesionesCumplenObjetivo,
      totalSesiones: sesionesConObjetivo.length,
      porcentajeSesionesCumplen: sesionesConObjetivo.length > 0
        ? Number(((sesionesCumplenObjetivo / sesionesConObjetivo.length) * 100).toFixed(1))
        : 0,
    };
  }, [registrosFiltradosUnicos]);

  // Días sin práctica (inactividad)
  const diasSinPractica = useMemo(() => {
    if (registrosFiltradosUnicos.length === 0) return null;

    const ultimaSesion = registrosFiltradosUnicos
      .filter(r => r.inicioISO)
      .sort((a, b) => new Date(b.inicioISO || '').getTime() - new Date(a.inicioISO || '').getTime())[0];

    if (!ultimaSesion) return null;

    const ultimaFecha = new Date(ultimaSesion.inicioISO);
    const hoy = new Date();
    const diffMs = hoy.getTime() - ultimaFecha.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      dias: diffDias,
      esInactivo: diffDias > 7,
      ultimaFecha: formatLocalDate(ultimaFecha),
    };
  }, [registrosFiltradosUnicos]);

  return {
    kpis,
    datosLinea,
    tiposBloques,
    topEjercicios,
    progresoPorPieza,
    heatmapData,
    tiempoRealVsObjetivo,
    diasSinPractica,
  };
}

// Exportar funciones auxiliares para uso en otros componentes
export { safeNumber, validarDuracion, normalizeAggregate };

