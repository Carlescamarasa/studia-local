/**
 * Utilidades para componentes de estadísticas
 */

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
 * Formatea una duración en segundos a "H h M min" o "D d H h M min" si >= 24h
 */
export function formatDuracionHM(duracionSeg: number): string {
  const totalSeg = normalizeAggregate(duracionSeg);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);

  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const hRestantes = horas % 24;
    return `${dias}d ${hRestantes}h ${minutos}m`;
  }

  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}min`;
}

/**
 * Formatea una duración a formato legible: "Xm", "Xh Ym", "Xd Yh Zm"
 * Oculta partes con valor 0 excepto cuando todo es 0.
 */
export function formatDurationDDHHMM(value: number, unit: 'min' | 'sec' = 'sec'): string {
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
 * Formatea una fecha a string ISO local YYYY-MM-DD
 */
export function formatLocalDate(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea un string YYYY-MM-DD a objeto Date local
 */
export function parseLocalDate(dateStr: string | null): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formateador para porcentajes
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Retorna el lunes de la semana de una fecha dada
 */
export function startOfMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Determina la granularidad óptima (día/semana/mes) dado un rango de fechas.
 */
export function getBucketSpec(start: string | Date, end: string | Date): string {
  if (!start || !end) return 'dia';

  const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
  const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;

  if (!dStart || !dEnd) return 'dia';

  // Diferencia en días
  const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 14) return 'dia';
  if (diffDays <= 90) return 'semana';
  return 'mes';
}

/**
 * Formateo estricto para gráficas y KPIs (input: segundos).
 */
export function formatDurationChart(segundos: number): string {
  const s = normalizeAggregate(segundos);
  if (s === 0) return "0m";
  if (s < 60) return "<1m";

  const totalHoras = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);

  // Si >= 24 horas, mostrar días
  if (totalHoras >= 24) {
    const dias = Math.floor(totalHoras / 24);
    const horasRestantes = totalHoras % 24;

    const parts = [];
    if (dias > 0) parts.push(`${dias}d`);
    if (horasRestantes > 0) parts.push(`${horasRestantes}h`);
    if (minutos > 0) parts.push(`${minutos}m`);

    return parts.join(' ') || "0m";
  }

  // < 24 horas
  const parts = [];
  if (totalHoras > 0) parts.push(`${totalHoras}h`);
  if (minutos > 0) parts.push(`${minutos}m`);

  return parts.join(' ') || "0m";
}

/**
 * Retorna true si una fecha está entre start y end (inclusive)
 */
export function isBetween(date: Date, start: string | Date | null, end: string | Date | null): boolean {
  if (!start || !end) return true;
  const dStart = typeof start === 'string' ? parseLocalDate(start) : start;
  const dEnd = typeof end === 'string' ? parseLocalDate(end) : end;
  return date >= dStart && date <= dEnd;
}
