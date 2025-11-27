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
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

/**
 * Parsea un string YYYY-MM-DD a Date
 */
export function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
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

