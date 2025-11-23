/**
 * Helpers compartidos para cambio de contraseña
 * Reutilizables tanto en perfil propio como en modal de admin
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Obtiene la URL de redirect para reset password
 * Reutiliza el mismo patrón que se usa en el resto de la app
 */
function getResetPasswordRedirectUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${new URL(supabaseUrl).origin}/reset-password`;
  }
  // Fallback si no hay VITE_SUPABASE_URL
  return `${window.location.origin}/reset-password`;
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

