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

  // Agrupar asignaciones por semana (mostrar toda la semana)
  eventos.asignaciones.forEach(asignacion => {
    if (asignacion.semanaInicioISO) {
      const lunesAsignacion = startOfMonday(parseLocalDate(asignacion.semanaInicioISO));
      for (let i = 0; i < 7; i++) {
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
 * Obtiene el color según el tipo de evento
 */
export const obtenerColorEvento = (tipo) => {
  const colores = {
    sesion: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
    },
    feedback: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: 'text-green-600',
    },
    asignacion: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      icon: 'text-purple-600',
    },
    evento: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      icon: 'text-orange-600',
    },
  };
  return colores[tipo] || colores.evento;
};

/**
 * Obtiene el color según el tipo de evento importante
 */
export const obtenerColorTipoEvento = (tipo) => {
  const colores = {
    encuentro: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
    },
    masterclass: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
    },
    colectiva: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-900',
    },
    otro: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-900',
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

