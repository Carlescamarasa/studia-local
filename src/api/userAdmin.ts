/**
 * Helpers reutilizables para acciones administrativas de usuarios
 * (invitación, reset password, etc.)
 */

import { supabase } from '@/lib/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Obtiene la URL de redirect para reset password
 * Reutiliza el mismo patrón que se usa en el resto de la app
 */
function getResetPasswordRedirectUrl(): string {
  if (supabaseUrl) {
    return `${new URL(supabaseUrl).origin}/reset-password`;
  }
  // Fallback si no hay VITE_SUPABASE_URL
  return `${window.location.origin}/reset-password`;
}

/**
 * Invita a un usuario por email usando la Edge Function invite-user
 * @param email - Email del usuario a invitar
 * @param extraPayload - Datos adicionales (alias, role, etc.)
 * @returns Promise con el resultado de la invitación
 */
export async function inviteUserByEmail(
  email: string,
  extraPayload: Record<string, any> = {}
): Promise<{ success: boolean; message?: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email, ...extraPayload }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(body.message || 'No se pudo enviar la invitación');
  }

  return body;
}

/**
 * Envía un email de restablecimiento de contraseña (admin)
 * @param email - Email del usuario
 * @returns Promise que se resuelve cuando se envía el email
 */
export async function sendPasswordResetAdmin(email: string): Promise<void> {
  const redirectTo = getResetPasswordRedirectUrl();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo enviar el email de restablecimiento');
  }
}

