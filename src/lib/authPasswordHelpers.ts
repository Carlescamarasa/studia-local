/**
 * Helpers compartidos para cambio de contraseña
 * Reutilizables tanto en perfil propio como en modal de admin
 */

import { supabase } from '@/lib/supabaseClient';

import { getResetPasswordRedirectUrl } from './authHelpers';

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

