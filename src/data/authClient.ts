// Manejo de sesión/auth en localStorage (ID de usuario actual)
// Centralizamos aquí para no usar localStorage directamente fuera de src/data

const CURRENT_USER_KEY = 'localCurrentUserId';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredUserId(fallbackId = null) {
  if (!isBrowser()) return fallbackId;
  try {
    const id = window.localStorage.getItem(CURRENT_USER_KEY);
    return id || fallbackId;
  } catch {
    return fallbackId;
  }
}

export function setStoredUserId(userId) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CURRENT_USER_KEY, userId);
  } catch {
    // silencio: si falla, simplemente no persistimos
  }
}

export function clearStoredUserId() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // silencio
  }
}


