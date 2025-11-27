// Utilidades de validación reutilizables

/**
 * Valida el formato de un email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si el email es válido
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida la longitud de un email
 * @param {string} email - Email a validar
 * @param {number} minLength - Longitud mínima
 * @param {number} maxLength - Longitud máxima
 * @returns {boolean} - true si cumple con la longitud
 */
export function validateEmailLength(email, minLength = 5, maxLength = 254) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Valida la longitud de una contraseña
 * @param {string} password - Contraseña a validar
 * @param {number} minLength - Longitud mínima
 * @returns {boolean} - true si cumple con la longitud
 */
export function validatePasswordLength(password, minLength = 6) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= minLength;
}

/**
 * Valida si un campo está vacío
 * @param {string} value - Valor a validar
 * @returns {boolean} - true si está vacío
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

