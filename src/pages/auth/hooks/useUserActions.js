import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

/**
 * Hook para realizar acciones sobre usuarios (magic link, reset password, etc.)
 * Solo disponible para ADMIN y PROF
 */
export function useUserActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { appRole } = useAuth();

  const executeAction = useCallback(async ({ action, userId, email }) => {
    setIsLoading(true);
    try {
      if (appRole !== 'ADMIN' && appRole !== 'PROF') {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      const accessToken = await supabase.auth.getSession().then(s => s.data.session?.access_token);
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, userId, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ejecutar la acción');
      }

      const data = await response.json();
      toast.success(data.message || 'Acción ejecutada correctamente');
      return data;
    } catch (error) {
      console.error('Error en useUserActions:', error);
      toast.error(error.message || 'Error al ejecutar la acción');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appRole]);

  const sendMagicLink = useCallback(async (userId, email) => {
    return executeAction({ action: 'magic_link', userId, email });
  }, [executeAction]);

  const sendResetPassword = useCallback(async (userId, email) => {
    return executeAction({ action: 'reset_password', userId, email });
  }, [executeAction]);

  const resendInvitation = useCallback(async (userId, email) => {
    return executeAction({ action: 'resend_invitation', userId, email });
  }, [executeAction]);

  return {
    sendMagicLink,
    sendResetPassword,
    resendInvitation,
    executeAction,
    isLoading,
  };
}


