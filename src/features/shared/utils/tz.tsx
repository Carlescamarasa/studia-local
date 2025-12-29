/**
 * FASE 2: Helpers de zona horaria con Luxon (preparatorio)
 * 
 * Este archivo está listo para ser usado cuando se instale Luxon.
 * Para activar FASE 2:
 * 1. Instalar: npm install luxon
 * 2. Descomentar la importación de DateTime
 * 3. Añadir campo User.timeZone en la entidad
 * 4. Usar estos helpers en lugar de los locales
 */

// import { DateTime } from 'luxon';
import { formatLocalDate, parseLocalDate, startOfMonday, isoWeekNumberLocal } from "@/features/shared/utils/helpers";

// Zona horaria canónica para planificación (España)
export const ADMIN_TZ = 'Europe/Madrid';

/**
 * Obtiene el lunes ISO de una fecha en una zona horaria específica
 * @param {Date} dateLike - Fecha de referencia
 * @param {string} tz - Zona horaria IANA (default: Europe/Madrid)
 * @returns {string} - Fecha ISO del lunes (YYYY-MM-DD)
 */
export const mondayISO = (dateLike, tz = ADMIN_TZ) => {
  // Uncomment when Luxon is installed:
  // return DateTime.fromJSDate(dateLike instanceof Date ? dateLike : new Date(), { zone: tz })
  //   .startOf('week')
  //   .plus({ days: 1 })
  //   .toISODate();
  
  // Fallback temporal (local):
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return formatLocalDate(startOfMonday(d));
};

/**
 * Añade semanas a una fecha ISO en una zona horaria
 * @param {string} iso - Fecha ISO inicial (YYYY-MM-DD)
 * @param {number} n - Número de semanas a sumar/restar
 * @param {string} tz - Zona horaria IANA
 * @returns {string} - Nueva fecha ISO (YYYY-MM-DD)
 */
export const addWeeksISO = (iso, n, tz = ADMIN_TZ) => {
  // Uncomment when Luxon is installed:
  // return DateTime.fromISO(iso, { zone: tz }).plus({ weeks: n }).toISODate();
  
  // Fallback temporal (local):
  const base = parseLocalDate(iso);
  base.setDate(base.getDate() + (n * 7));
  return formatLocalDate(startOfMonday(base));
};

/**
 * Obtiene el label de una semana (número y rango) en zona horaria del usuario
 * @param {string} isoMonday - Fecha ISO del lunes (YYYY-MM-DD)
 * @param {string} tz - Zona horaria IANA del usuario
 * @returns {object} - { numero: number, rango: string }
 */
export const weekLabel = (isoMonday, tz = ADMIN_TZ) => {
  // Uncomment when Luxon is installed:
  // const mon = DateTime.fromISO(isoMonday, { zone: tz });
  // const sun = mon.plus({ days: 6 });
  // return {
  //   numero: mon.weekNumber,
  //   rango: `${mon.day} ${mon.toFormat('LLL')} - ${sun.day} ${sun.toFormat('LLL')}`
  // };
  
  // Fallback temporal (local):
  const lunes = parseLocalDate(isoMonday);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  
  const numeroSemana = isoWeekNumberLocal(lunes);
  
  const formatoFecha = (fecha) => {
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
    return `${dia} ${mes}`;
  };
  
  return {
    numero: numeroSemana,
    rango: `${formatoFecha(lunes)} - ${formatoFecha(domingo)}`,
  };
};

/**
 * Convierte un timestamp UTC a zona horaria local del usuario para visualización
 * @param {string} utcISO - Timestamp ISO en UTC
 * @param {string} tz - Zona horaria IANA del usuario
 * @returns {string} - Timestamp formateado en zona local
 */
export const formatInUserTZ = (utcISO, tz = ADMIN_TZ) => {
  // Uncomment when Luxon is installed:
  // return DateTime.fromISO(utcISO, { zone: 'utc' })
  //   .setZone(tz)
  //   .toLocaleString(DateTime.DATETIME_MED);
  
  // Fallback temporal:
  return new Date(utcISO).toLocaleString('es-ES', { timeZone: tz });
};

/**
 * Obtiene la zona horaria del usuario desde el navegador
 * @returns {string} - Zona horaria IANA detectada
 */
export const getUserTimeZone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};