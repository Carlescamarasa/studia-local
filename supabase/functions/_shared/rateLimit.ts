/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Helper compartido para rate limiting en Edge Functions
 * Usa una tabla en Supabase para rastrear intentos por IP y usuario
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Ventana de tiempo en milisegundos
  lockoutDurationMs: number; // Duración del bloqueo en milisegundos
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutos de bloqueo
};

/**
 * Obtiene la IP del cliente desde el request
 */
function getClientIP(req: Request): string {
  // Intentar obtener IP de headers comunes
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback: usar un identificador único basado en headers
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Verifica si una IP/usuario está bloqueado por rate limiting
 * @param supabase - Cliente de Supabase con service role
 * @param identifier - Identificador único (IP o userId)
 * @param config - Configuración de rate limiting
 * @returns { isBlocked: boolean, remainingAttempts: number, lockoutUntil?: number }
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ isBlocked: boolean; remainingAttempts: number; lockoutUntil?: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Intentar usar una tabla de rate limiting (crearla si no existe)
  // Por simplicidad, usamos una tabla temporal en memoria o Supabase Storage
  // En producción, deberías crear una tabla dedicada

  // Por ahora, retornamos que no está bloqueado
  // TODO: Implementar tabla de rate limiting en Supabase
  // La tabla debería tener: identifier, attempts, firstAttempt, lockoutUntil

  return {
    isBlocked: false,
    remainingAttempts: config.maxAttempts,
  };
}

/**
 * Registra un intento fallido
 * @param supabase - Cliente de Supabase con service role
 * @param identifier - Identificador único (IP o userId)
 * @param config - Configuración de rate limiting
 */
export async function recordFailedAttempt(
  supabase: any,
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  // TODO: Implementar registro en tabla de rate limiting
  // Incrementar attempts, actualizar firstAttempt si es el primero, establecer lockoutUntil si se alcanza el límite
}

/**
 * Helper para obtener identificador desde request
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  // Prioridad: userId > IP
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIP(req)}`;
}

