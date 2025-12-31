/**
 * Helpers reutilizables para acciones administrativas de usuarios
 * (invitación, reset password, etc.)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
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

  // Obtener token de sesión
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Por favor, inicia sesión de nuevo.');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, ...extraPayload }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(body.message || body.error || 'No se pudo enviar la invitación');
  }

  return body;
}

/**
 * Envía un email de restablecimiento de contraseña (admin)
 * @deprecated Usar sendPasswordResetEmailFor de @/lib/authPasswordHelpers en su lugar
 * @param email - Email del usuario
 * @returns Promise que se resuelve cuando se envía el email
 */
export async function sendPasswordResetAdmin(email: string): Promise<void> {
  // Reexportar el helper compartido para mantener compatibilidad
  const { sendPasswordResetEmailFor } = await import('@/lib/authPasswordHelpers');
  return sendPasswordResetEmailFor(email);
}

