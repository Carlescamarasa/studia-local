/**
 * Utilidades para componentes de estadísticas
 */

/**
 * Formatea una duración en segundos a "H h M min" o "D d H h M min" si >= 24h
 */
export function formatDuracionHM(duracionSeg) {
  const totalSeg = normalizeAggregate(duracionSeg);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);

  // Si las horas son >= 24, mostrar formato con días
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    if (dias > 0 && horasRestantes > 0 && minutos > 0) {
      return `${dias} d ${horasRestantes} h ${minutos} min`;
    }
    if (dias > 0 && horasRestantes > 0) {
      return `${dias} d ${horasRestantes} h`;
    }
    if (dias > 0 && minutos > 0) {
      return `${dias} d ${minutos} min`;
    }
    if (dias > 0) {
      return `${dias} d`;
    }
  }

  // Formato normal para < 24h
  if (horas > 0 && minutos > 0) return `${horas} h ${minutos} min`;
  if (horas > 0) return `${horas} h`;
  return `${minutos} min`;
}

/**
 * Formatea una duración a formato legible: "Xm", "Xh Ym", "Xd Yh Zm"
 * Oculta partes con valor 0 excepto cuando todo es 0.
 * 
 * @param {number} value - Valor numérico de duración
 * @param {'min'|'sec'} unit - Unidad del valor ('min' = minutos, 'sec' = segundos)
 * @returns {string} Duración formateada (ej: "45 min", "6h 23m", "1d 2h 5m")
 * 
 * Ejemplos:
 *   formatDurationDDHHMM(45, 'min')   → "45 min"
 *   formatDurationDDHHMM(383, 'min')  → "6h 23m"
 *   formatDurationDDHHMM(1565, 'min') → "1d 2h 5m"
 *   formatDurationDDHHMM(2700, 'sec') → "45 min"
 */
export function formatDurationDDHHMM(value, unit = 'sec') {
  const n = normalizeAggregate(value);

  // Convert to minutes
  const totalMinutes = unit === 'min' ? n : Math.floor(n / 60);

  if (totalMinutes === 0) return '0 min';

  const days = Math.floor(totalMinutes / 1440); // 1440 min = 24h
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  // Special case: only minutes and < 60 → use "X min" format
  if (days === 0 && hours === 0 && minutes > 0) {
    return `${minutes} min`;
  }

  return parts.join(' ') || '0 min';
}

/**
 * Normaliza valores agregados (sin límite superior de 12h)
 */
function normalizeAggregate(n) {
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
 * Formatea una fecha local a string YYYY-MM-DD
 */
export function formatLocalDate(d) {
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Parsea un string YYYY-MM-DD a Date
 */
export function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calcula el inicio de la semana (lunes) para una fecha dada
 */
export function startOfMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Determina la granularidad óptima (día/semana/mes) dado un rango de fechas.
 * Reglas:
 * <= 14 días -> 'dia'
 * <= 90 días -> 'semana'
 * > 90 días -> 'mes'
 * 
 * @param {string|Date} start fecha inicio (YYYY-MM-DD o Date)
 * @param {string|Date} end fecha fin (YYYY-MM-DD o Date)
 * @returns {string} 'dia' | 'semana' | 'mes'
 */
export function getBucketSpec(start, end) {
  if (!start || !end) return 'dia';

  const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
  const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;

  if (!dStart || !dEnd) return 'dia';

  // Diferencia en días
  const diffTime = Math.abs(dEnd - dStart);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 14) return 'dia';
  if (diffDays <= 90) return 'semana';
  return 'mes';
}


/**
 * Formateo estricto para gráficas y KPIs (input: segundos).
 * Formato: DD HH MM (ocultando partes vacías, excepto fallbacks).
 * Reglas:
 * - 0s -> "0m"
 * - <60s -> "<1m"
 * - >=60s -> "Xd Xh Xm" (ocultando partes 0)
 *   Ej: 345600 -> "4d", 92000 -> "25h 33m", 3660 -> "1h 1m", 60 -> "1m"
 */
export function formatDurationChart(segundos) {
  const s = normalizeAggregate(segundos);
  if (s === 0) return "0m";
  if (s < 60) return "<1m";

  const totalHoras = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);

  // Si >= 24 horas, mostrar días
  if (totalHoras >= 24) {
    const dias = Math.floor(totalHoras / 24);
    const horasRestantes = totalHoras % 24;

    let parts = [];
    if (dias > 0) parts.push(`${dias}d`);
    if (horasRestantes > 0) parts.push(`${horasRestantes}h`);
    if (minutos > 0) parts.push(`${minutos}m`);

    return parts.join(' ') || "0m";
  }

  // < 24 horas
  let parts = [];
  if (totalHoras > 0) parts.push(`${totalHoras}h`);
  if (minutos > 0) parts.push(`${minutos}m`);

  return parts.join(' ') || "0m";
}
