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
        // OPTIMIZACIÓN: Siempre intentar desde localDataClient primero
        // El usuario autenticado ya debería estar en la lista gracias a la optimización en usuarios.list()
        const users = await localDataClient.entities.User.list();
        // 1. Intentar buscar por ID
        let localProfile = users.find(u => u.id === effectiveUser.id);

        // 2. Si no se encuentra por ID y tenemos email, buscar por email
        // Esto corrige el caso donde effectiveUser tiene un ID legacy (Mongo) pero el remoto tiene UUID
        if (!localProfile && effectiveUser.email) {
          const normalizedEmail = effectiveUser.email.toLowerCase().trim();
          localProfile = users.find(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
          if (localProfile) {
            // console.log('DEBUG: useCurrentProfile found profile by EMAIL (ID mismatch fixed):', localProfile);
          }
        }

        if (localProfile) {
          // console.log('DEBUG: useCurrentProfile found local profile:', localProfile);
          return localProfile;
        }

        // console.log('DEBUG: useCurrentProfile NOT found local, using fallback');

        // Si no se encuentra en la lista, usar datos del effectiveUser como fallback
        // Esto puede pasar si el usuario no tiene perfil en la BD aún
        return {
          id: effectiveUser.id,
          email: effectiveUser.email,
          nombreCompleto: effectiveUser.user_metadata?.full_name || effectiveUser.email?.split('@')[0],
          rolPersonalizado: effectiveUser.user_metadata?.role || 'ESTU',
          profesorAsignadoId: effectiveUser.user_metadata?.profesor_asignado_id || null,
          isActive: effectiveUser.user_metadata?.is_active !== false,
          nivelTecnico: effectiveUser.nivelTecnico || effectiveUser.user_metadata?.nivel_tecnico || 1,
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
          nivelTecnico: effectiveUser.nivelTecnico || effectiveUser.user_metadata?.nivel_tecnico || 1,
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

