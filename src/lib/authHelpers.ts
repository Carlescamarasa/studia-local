/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Helpers centralizados para autenticación
 * Compatible con frontend (browser) y Edge Functions (Deno)
 */

/**
 * Verifica si un error es un error de autenticación
 * Detecta errores 401 (Unauthorized) y 403 (Forbidden) de Supabase
 * @param error - Error a verificar
 * @returns {boolean} - true si es un error de autenticación
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;

  // Verificar código de estado HTTP
  const status = error.status || error.code;
  if (status === 401 || status === 403) {
    return true;
  }

  // Verificar mensaje de error
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('session_not_found') ||
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid token') ||
    message.includes('token expired') ||
    message.includes('authentication')
  ) {
    return true;
  }

  // Verificar código de error de Supabase
  const errorCode = error.code?.toLowerCase() || '';
  if (
    errorCode === 'pgrst301' || // No rows returned (pero puede ser RLS)
    errorCode === '42501' || // Insufficient privilege (PostgreSQL)
    errorCode === 'PGRST116' // The result contains 0 rows (RLS)
  ) {
    // Solo considerar como error de auth si el mensaje sugiere autenticación
    if (message.includes('permission') || message.includes('policy') || message.includes('row-level security')) {
      return true;
    }
  }

  return false;
}

/**
 * Obtiene la URL base de la aplicación
 * @returns {string} URL base (ej: https://studia.latrompetasonara.com)
 */
export function getAppBaseUrl(): string {
  // Prioridad: variable de entorno > window.location.origin > fallback
  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env.VITE_APP_URL;
    if (envUrl) {
      return envUrl;
    }
    return window.location.origin;
  }

  // Para Edge Functions (Deno)
  // Para Edge Functions (Deno)
  const globalAny = globalThis as any;
  if (typeof globalAny.Deno !== 'undefined') {
    const supabaseUrl = globalAny.Deno.env.get('SUPABASE_URL') || '';
    if (supabaseUrl) {
      return new URL(supabaseUrl).origin;
    }
  }

  // Fallback
  return 'https://studia.latrompetasonara.com';
}

/**
 * Genera la URL de redirección para reset de contraseña
 * @returns {string} URL completa de reset password
 */
export function getResetPasswordRedirectUrl(): string {
  const baseUrl = getAppBaseUrl();
  // Asegurar que no termine con /
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/reset-password`;
}

/**
 * Genera la URL de redirección para invitaciones
 * @returns {string} URL completa para invitaciones
 */
export function getInvitationRedirectUrl(): string {
  const baseUrl = getAppBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/invitation`;
}

/**
 * Genera la URL de redirección para magic links (OTP)
 * @returns {string} URL completa para magic links
 */
export function getMagicLinkRedirectUrl(): string {
  const baseUrl = getAppBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/auth/login`;
}
