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
        // OPTIMIZACIÓN: Solo pedir el usuario actual, NO pedir la lista completa
        // 1. Intentar buscar por ID directamente
        let localProfile = await localDataClient.entities.User.get(effectiveUser.id);

        // 2. Si no se encuentra por ID y tenemos email, buscar por email
        // Esto corrige el caso donde effectiveUser tiene un ID legacy (Mongo) pero el remoto tiene UUID
        if (!localProfile && effectiveUser.email) {
          const normalizedEmail = effectiveUser.email.toLowerCase().trim();

          // FALLBACK SEGURO: Si falla por ID, cargamos la lista (costoso pero necesario si hay mismatch de IDs)
          // No podemos usar .filter({ email }) porque la columna email no existe en la tabla profiles
          try {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useCurrentProfile] Perfil no encontrado por ID, usando fallback costoso (User.list) para buscar por email:', {
                id: effectiveUser.id,
                email: normalizedEmail
              });
            }
            const allUsers = await localDataClient.entities.User.list();
            localProfile = allUsers.find(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
          } catch (fallbackError) {
            console.error('[useCurrentProfile] Error en fallback de búsqueda por email:', fallbackError);
          }
        }

        if (localProfile) {
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

