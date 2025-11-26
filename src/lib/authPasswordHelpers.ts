/**
 * Helpers compartidos para cambio de contraseña
 * Reutilizables tanto en perfil propio como en modal de admin
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Obtiene la URL de redirect para reset password
 * IMPORTANTE: Debe usar la URL completa de la aplicación (ej: http://studia.latrompetasonara.com/reset-password)
 * NO debe usar la URL de Supabase
 */
function getResetPasswordRedirectUrl(): string {
  // Prioridad 1: Variable de entorno específica para la URL de la app
  // Ejemplo: VITE_APP_URL=http://studia.latrompetasonara.com
  const appUrl = import.meta.env.VITE_APP_URL;
  if (appUrl) {
    // Asegurar que termine con /reset-password
    const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    return `${baseUrl}/reset-password`;
  }
  
  // Prioridad 2: Usar window.location.origin (URL actual de la aplicación)
  // Esto funciona bien en desarrollo y producción si la app está en el mismo dominio
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  
  // Fallback: retornar una URL relativa
  // Supabase usará el dominio configurado en el Dashboard si no hay redirectTo absoluto
  console.warn('[authPasswordHelpers] No se encontró VITE_APP_URL ni window.location, usando fallback relativo');
  return '/reset-password';
}

/**
 * Envía un email de restablecimiento de contraseña a un usuario
 * @param email - Email del usuario
 * @returns Promise que se resuelve cuando se envía el email
 */
export async function sendPasswordResetEmailFor(email: string): Promise<void> {
  const redirectTo = getResetPasswordRedirectUrl();
  
  if (import.meta.env.DEV) {
    console.debug('[authPasswordHelpers] Enviando email de restablecimiento a:', email);
    console.debug('[authPasswordHelpers] URL de redirect:', redirectTo);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[authPasswordHelpers] Error al enviar email de restablecimiento:', error);
    }
    throw new Error(error.message || 'No se pudo enviar el email de restablecimiento');
  }
}

