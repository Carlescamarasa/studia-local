import { useQuery } from "@tanstack/react-query";
import { useEffectiveUser } from "@/components/utils/helpers";
import { localDataClient } from "@/api/localDataClient";
import { supabase } from "@/lib/supabaseClient";

/**
 * Hook centralizado para obtener el perfil del usuario actual
 * Usa React Query con staleTime para evitar peticiones duplicadas
 * El perfil se cachea durante 5 minutos (300000ms) para evitar refetches innecesarios
 */
export function useCurrentProfile() {
  const effectiveUser = useEffectiveUser();
  
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['currentProfile', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser?.id) {
        return null;
      }

      try {
        // Primero intentar desde localDataClient (si está disponible)
        try {
          const users = await localDataClient.entities.User.list();
          const localProfile = users.find(u => u.id === effectiveUser.id);
          if (localProfile) {
            return localProfile;
          }
        } catch (localError) {
          // Si falla local, continuar con Supabase
          console.warn('[useCurrentProfile] Error cargando desde local, intentando Supabase:', localError);
        }

        // Fallback a Supabase profiles table
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
          .eq('id', effectiveUser.id)
          .single();

        if (supabaseError) {
          // Si no hay perfil en Supabase, usar datos del effectiveUser
          if (supabaseError.code === 'PGRST116') {
            return {
              id: effectiveUser.id,
              email: effectiveUser.email,
              nombreCompleto: effectiveUser.user_metadata?.full_name || effectiveUser.email?.split('@')[0],
              rolPersonalizado: effectiveUser.user_metadata?.role || 'ESTU',
              profesorAsignadoId: effectiveUser.user_metadata?.profesor_asignado_id || null,
              isActive: effectiveUser.user_metadata?.is_active !== false,
            };
          }
          throw supabaseError;
        }

        // Mapear datos de Supabase a formato esperado
        return {
          id: data.id,
          email: effectiveUser.email,
          nombreCompleto: data.full_name,
          rolPersonalizado: data.role,
          profesorAsignadoId: data.profesor_asignado_id,
          isActive: data.is_active !== false,
        };
      } catch (error) {
        console.error('[useCurrentProfile] Error cargando perfil:', error);
        // En caso de error, retornar datos básicos del effectiveUser
        return {
          id: effectiveUser.id,
          email: effectiveUser.email,
          nombreCompleto: effectiveUser.user_metadata?.full_name || effectiveUser.email?.split('@')[0],
          rolPersonalizado: effectiveUser.user_metadata?.role || 'ESTU',
          profesorAsignadoId: effectiveUser.user_metadata?.profesor_asignado_id || null,
          isActive: true,
        };
      }
    },
    enabled: !!effectiveUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - evita refetches innecesarios
    cacheTime: 10 * 60 * 1000, // 10 minutos - mantener en caché
    retry: 1, // Solo reintentar una vez en caso de error
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
}

