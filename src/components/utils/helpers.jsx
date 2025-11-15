/**
 * Obtiene el nombre visible de un usuario según la jerarquía:
 * 1. nombreCompleto (campo personalizado)
 * 2. full_name (nombre completo del sistema, fallback)
 * 3. first_name + last_name
 * 4. name
 * 5. email (parte local antes de @)
 * 6. "Sin nombre" (fallback final)
 */
export function displayName(u) {
  if (!u) return 'Sin nombre';
  
  // Prioridad 1: nombreCompleto (campo personalizado)
  if (u.nombreCompleto && u.nombreCompleto.trim()) {
    return u.nombreCompleto.trim();
  }
  
  // Prioridad 2: full_name del sistema (fallback)
  if (u.full_name && u.full_name.trim()) {
    return u.full_name.trim();
  }
  
  // Prioridad 3: first_name + last_name
  const combined = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  
  // Prioridad 4: name genérico
  if (u.name && u.name.trim()) {
    return u.name.trim();
  }
  
  // Prioridad 5: email (parte local)
  if (u.email) {
    const parteLocal = u.email.split('@')[0];
    if (parteLocal) return parteLocal;
  }
  
  return 'Sin nombre';
}

// Alias para compatibilidad con código existente
export const getNombreVisible = displayName;

/**
 * Normaliza texto para búsquedas (minúsculas, sin espacios extras)
 */
export function normalizarTexto(str) {
  if (!str) return '';
  return str.toLowerCase().trim();
}

// --- Helpers de fechas locales (sin UTC, sin saltos DST) ---
const pad2 = (n) => String(n).padStart(2, "0");

export const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

export const parseLocalDate = (s) => { 
  const [y,m,d] = s.split("-").map(Number); 
  return new Date(y, m-1, d); 
};

export const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

export const isoWeekNumberLocal = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay()+6) % 7)) / 7);
};

/**
 * Calcula el lunes de la semana ISO para una fecha dada (versión local, sin UTC)
 */
export function calcularLunesSemanaISO(fecha) {
  if (typeof fecha === 'string') {
    const d = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(d));
  } else {
    return formatLocalDate(startOfMonday(fecha));
  }
}

/**
 * Calcula el offset de semanas entre dos fechas ISO (versión local)
 */
export function calcularOffsetSemanas(semanaInicioISO, semanaActualISO) {
  const inicio = parseLocalDate(semanaInicioISO);
  const actual = parseLocalDate(semanaActualISO);
  const diffTime = actual - inicio;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

/**
 * Calcula el tiempo total de una sesión (ejercicios + rondas, excluyendo AD)
 */
export function calcularTiempoSesion(sesion) {
  if (!sesion || !sesion.bloques) return 0;
  
  const tiempoEjercicios = sesion.bloques
    .filter(b => b.tipo !== 'AD')
    .reduce((total, b) => total + (b.duracionSeg || 0), 0);
  
  const tiempoRondas = (sesion.rondas || []).reduce((total, ronda) => {
    const tiempoRonda = ronda.bloques.reduce((sum, code) => {
      const bloque = sesion.bloques.find(b => b.code === code);
      if (bloque && bloque.tipo !== 'AD') {
        return sum + (bloque.duracionSeg || 0);
      }
      return sum;
    }, 0);
    return total + (tiempoRonda * ronda.repeticiones);
  }, 0);
  
  return tiempoEjercicios + tiempoRondas;
}

/**
 * Aplana las rondas de una sesión en una lista de ejecución secuencial
 */
export function aplanarSesion(sesion) {
  if (!sesion || !sesion.bloques) return [];
  
  const listaEjecucion = [];
  
  // Primero añadir ejercicios normales (no en rondas)
  const codigosEnRondas = new Set();
  (sesion.rondas || []).forEach(ronda => {
    ronda.bloques.forEach(code => codigosEnRondas.add(code));
  });
  
  sesion.bloques.forEach((ejercicio, idx) => {
    if (!codigosEnRondas.has(ejercicio.code)) {
      listaEjecucion.push({
        ...ejercicio,
        indiceOriginal: idx,
        esRonda: false,
      });
    }
  });
  
  // Luego añadir rondas aplanadas
  (sesion.rondas || []).forEach((ronda, rondaIdx) => {
    for (let rep = 0; rep < ronda.repeticiones; rep++) {
      ronda.bloques.forEach((code) => {
        const ejercicio = sesion.bloques.find(b => b.code === code);
        if (ejercicio) {
          listaEjecucion.push({
            ...ejercicio,
            esRonda: true,
            rondaIdx,
            repeticion: rep + 1,
            totalRepeticiones: ronda.repeticiones,
          });
        }
      });
    }
  });
  
  return listaEjecucion;
}