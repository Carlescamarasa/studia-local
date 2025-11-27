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
export function validatePasswordLength(password, minLength = 8) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= minLength;
}

/**
 * Valida la complejidad de una contraseña
 * Requiere: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
 * @param {string} password - Contraseña a validar
 * @returns {{ valid: boolean; errors: string[] }} - Resultado de la validación con lista de errores
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña es requerida'] };
  }
  
  // Mínimo 8 caracteres
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  // Al menos una mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  
  // Al menos una minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  
  // Al menos un número
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
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

/**
 * Normaliza un email a lowercase y lo recorta
 * @param {string} email - Email a normalizar
 * @returns {string} - Email normalizado (lowercase, trimmed)
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

