import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

/**
 * Hook para crear usuarios usando la Edge Function
 */
export function useCreateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const createUser = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Obtener el token de sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión.');
      }

      // Obtener la URL de Supabase desde las variables de entorno
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL no está configurada');
      }

      // Llamar a la Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email.trim(),
          full_name: userData.full_name.trim(),
          nivel: userData.nivel || null,
          profesor_asignado_id: userData.profesor_asignado_id || null,
          sendInvitation: userData.sendInvitation || false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      return result;
    } catch (err) {
      const errorMessage = err.message || 'Error al crear usuario';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createUser,
    isLoading,
    error,
  };
}

