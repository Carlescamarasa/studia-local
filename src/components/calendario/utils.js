/**
 * Utilidades para el calendario
 */

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Formatea una fecha a formato ISO (YYYY-MM-DD)
 */
export const formatLocalDate = (d) => {
  if (typeof d === 'string') {
    return d.split('T')[0]; // Si ya es string ISO, tomar solo la fecha
  }
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};

/**
 * Parsea una fecha ISO (YYYY-MM-DD) a objeto Date
 */
export const parseLocalDate = (s) => {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
};

/**
 * Obtiene el lunes de la semana ISO para una fecha dada
 */
export const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Obtiene el domingo de la semana ISO para una fecha dada
 */
export const endOfSunday = (date) => {
  const lunes = startOfMonday(date);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return domingo;
};

/**
 * Agrupa eventos por día (fecha ISO)
 */
export const agruparEventosPorDia = (eventos, fechaInicio, fechaFin) => {
  const eventosPorDia = {};
  
  // Inicializar todos los días en el rango
  const fechaActual = new Date(fechaInicio);
  while (fechaActual <= fechaFin) {
    const fechaISO = formatLocalDate(fechaActual);
    eventosPorDia[fechaISO] = {
      sesiones: [],
      feedbacks: [],
      asignaciones: [],
      eventos: [],
    };
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  // Agrupar sesiones por fecha
  eventos.sesiones.forEach(sesion => {
    if (sesion.inicioISO) {
      const fechaSesion = sesion.inicioISO.split('T')[0];
      if (eventosPorDia[fechaSesion]) {
        eventosPorDia[fechaSesion].sesiones.push(sesion);
      }
    }
  });

  // Agrupar feedbacks por semana (mostrar toda la semana)
  eventos.feedbacks.forEach(feedback => {
    if (feedback.semanaInicioISO) {
      const lunesFeedback = startOfMonday(parseLocalDate(feedback.semanaInicioISO));
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(lunesFeedback);
        fecha.setDate(lunesFeedback.getDate() + i);
        const fechaISO = formatLocalDate(fecha);
        if (eventosPorDia[fechaISO]) {
          eventosPorDia[fechaISO].feedbacks.push(feedback);
        }
      }
    }
  });

  // Agrupar asignaciones por todas las semanas del plan
  eventos.asignaciones.forEach(asignacion => {
    if (asignacion.semanaInicioISO && asignacion.plan && Array.isArray(asignacion.plan.semanas)) {
      const lunesAsignacion = startOfMonday(parseLocalDate(asignacion.semanaInicioISO));
      const totalSemanas = Math.max(1, asignacion.plan.semanas.length); // Mínimo 1 semana
      const totalDias = totalSemanas * 7; // Total de días del plan
      
      // Generar eventos para todas las semanas del plan
      for (let i = 0; i < totalDias; i++) {
        const fecha = new Date(lunesAsignacion);
        fecha.setDate(lunesAsignacion.getDate() + i);
        const fechaISO = formatLocalDate(fecha);
        if (eventosPorDia[fechaISO]) {
          eventosPorDia[fechaISO].asignaciones.push(asignacion);
        }
      }
    }
  });

  // Agrupar eventos importantes (pueden ser de un día o rango)
  eventos.eventosImportantes.forEach(evento => {
    const fechaInicio = parseLocalDate(evento.fechaInicio);
    const fechaFin = evento.fechaFin ? parseLocalDate(evento.fechaFin) : fechaInicio;
    
    for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
      const fechaISO = formatLocalDate(fecha);
      if (eventosPorDia[fechaISO]) {
        eventosPorDia[fechaISO].eventos.push(evento);
      }
    }
  });

  return eventosPorDia;
};

/**
 * Formatea una fecha para mostrar en eventos
 */
export const formatearFechaEvento = (fechaISO) => {
  const fecha = parseLocalDate(fechaISO);
  return fecha.toLocaleDateString('es-ES', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });
};

/**
 * Formatea hora de un timestamp ISO
 */
export const formatearHora = (isoString) => {
  if (!isoString) return '';
  const fecha = new Date(isoString);
  return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Calcula el índice de semana actual dentro de una asignación
 * 
 * @param {Date|string} startDate - Fecha de inicio de la asignación (lunes de la primera semana)
 * @param {number} totalWeeks - Número total de semanas del plan
 * @param {Date|string} currentDate - Fecha del evento que se está pintando
 * @returns {number} - Índice de semana (0-based), o -1 si está fuera del rango
 */
export const getAsignacionWeekIndex = (startDate, totalWeeks, currentDate) => {
  const start = startDate instanceof Date ? startDate : parseLocalDate(startDate);
  const current = currentDate instanceof Date ? currentDate : parseLocalDate(currentDate);
  
  // Normalizar a inicio del día
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  
  // Calcular diferencia en días
  const diffTime = currentDay - startDay;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Si está antes del inicio, retornar -1
  if (diffDays < 0) return -1;
  
  // Calcular índice de semana (0-based)
  // La semana empieza en lunes, así que dividimos por 7
  const weekIndex = Math.floor(diffDays / 7);
  
  // Clamp entre 0 y totalWeeks - 1
  if (weekIndex >= totalWeeks) return -1;
  
  return weekIndex;
};

/**
 * Calcula el patrón de semanas de una asignación mostrando la semana actual
 * 
 * @param {Object} asignacion - La asignación con plan.semanas y semanaInicioISO
 * @param {Date|string} currentDate - Fecha del evento que se está pintando (opcional, por defecto hoy)
 * @returns {string|null} - Patrón de semanas (ej: "● ○ ○" o "○ ● ○") o null si no hay plan
 */
export const calcularPatronSemanasAsignacion = (asignacion, currentDate = null) => {
  if (!asignacion?.plan || !Array.isArray(asignacion.plan.semanas)) return null;
  const totalSemanas = asignacion.plan.semanas.length;
  if (totalSemanas === 0) return null;
  if (!asignacion.semanaInicioISO) return null;

  // Si no se proporciona currentDate, usar la fecha de inicio (mostrar primera semana activa)
  const fechaActual = currentDate || asignacion.semanaInicioISO;
  
  // Calcular índice de semana actual
  const weekIndex = getAsignacionWeekIndex(asignacion.semanaInicioISO, totalSemanas, fechaActual);
  
  // Si está fuera del rango, no mostrar patrón
  if (weekIndex < 0) return null;

  // Generar patrón: ● para la semana actual, ○ para las demás
  const patron = Array.from({ length: Math.min(totalSemanas, 8) }, (_, i) => 
    i === weekIndex ? '●' : '○'
  );
  
  return patron.join(' ');
};

/**
 * Obtiene el color según el tipo de evento (compatible con modo claro/oscuro)
 */
export const obtenerColorEvento = (tipo) => {
  const colores = {
    sesion: {
      bg: 'bg-emerald-500/8 dark:bg-emerald-500/10',
      border: 'border-emerald-500/40 dark:border-emerald-500/50',
      text: 'text-emerald-900 dark:text-emerald-100',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    feedback: {
      bg: 'bg-sky-500/8 dark:bg-sky-500/10',
      border: 'border-sky-500/40 dark:border-sky-500/50',
      text: 'text-sky-900 dark:text-sky-100',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    asignacion: {
      bg: 'bg-violet-500/8 dark:bg-violet-500/10',
      border: 'border-violet-500/40 dark:border-violet-500/50',
      text: 'text-violet-900 dark:text-violet-100',
      icon: 'text-violet-600 dark:text-violet-400',
    },
    evento: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/12',
      border: 'border-amber-500/40 dark:border-amber-500/50',
      text: 'text-amber-900 dark:text-amber-100',
      icon: 'text-amber-600 dark:text-amber-400',
    },
  };
  return colores[tipo] || colores.evento;
};

/**
 * Obtiene el color según el tipo de evento importante (compatible con modo claro/oscuro)
 */
export const obtenerColorTipoEvento = (tipo) => {
  const colores = {
    encuentro: {
      bg: 'bg-blue-500/8 dark:bg-blue-500/10',
      border: 'border-blue-500/40 dark:border-blue-500/50',
      text: 'text-blue-900 dark:text-blue-100',
    },
    masterclass: {
      bg: 'bg-purple-500/8 dark:bg-purple-500/10',
      border: 'border-purple-500/40 dark:border-purple-500/50',
      text: 'text-purple-900 dark:text-purple-100',
    },
    colectiva: {
      bg: 'bg-pink-500/8 dark:bg-pink-500/10',
      border: 'border-pink-500/40 dark:border-pink-500/50',
      text: 'text-pink-900 dark:text-pink-100',
    },
    otro: {
      bg: 'bg-gray-500/8 dark:bg-gray-500/10',
      border: 'border-gray-500/40 dark:border-gray-500/50',
      text: 'text-gray-900 dark:text-gray-100',
    },
  };
  return colores[tipo] || colores.otro;
};

/**
 * Obtiene el label del tipo de evento
 */
export const obtenerLabelTipoEvento = (tipo) => {
  const labels = {
    encuentro: 'Encuentro',
    masterclass: 'Masterclass',
    colectiva: 'Colectiva',
    otro: 'Otro',
  };
  return labels[tipo] || tipo;
};

/**
 * Obtiene el label del estado de asignación
 */
export const obtenerLabelEstadoAsignacion = (estado) => {
  const labels = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    archivada: 'Archivada',
  };
  return labels[estado] || estado;
};

