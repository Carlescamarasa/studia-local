import { useQuery } from "@tanstack/react-query";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { localDataClient } from "@/api/localDataClient";
import { remoteDataAPI } from "@/api/remote/api";
import { supabase } from "@/lib/supabaseClient";

/**
 * Hook centralizado para obtener el perfil del usuario actual
 * Usa React Query con staleTime para evitar peticiones duplicadas
 * El perfil se cachea durante 5 minutos (300000ms) para evitar refetches innecesarios
 * 
 * NOTA: Usa effectiveUserId del EffectiveUserProvider para soportar impersonation
 * El queryKey incluye isImpersonating para forzar refetch cuando cambia el modo
 */
export function useCurrentProfile() {
  const { effectiveUserId, effectiveEmail, isImpersonating } = useEffectiveUser();

  const { data: profile, isLoading, error, refetch } = useQuery({
    // Incluir isImpersonating en el queryKey para forzar refetch al cambiar modo
    queryKey: ['currentProfile', effectiveUserId, isImpersonating],
    queryFn: async () => {
      if (!effectiveUserId) {
        return null;
      }

      try {
        // OPTIMIZACIÓN: Solo pedir el usuario actual, NO pedir la lista completa
        // 1. Intentar buscar por ID directamente
        let localProfile = await localDataClient.entities.User.get(effectiveUserId);

        // 2. Si no se encuentra por ID y tenemos email, buscar por email
        // Esto corrige el caso donde effectiveUser tiene un ID legacy (Mongo) pero el remoto tiene UUID
        if (!localProfile && effectiveEmail) {
          const normalizedEmail = effectiveEmail.toLowerCase().trim();

          // FALLBACK SEGURO: Si falla por ID, cargamos la lista (costoso pero necesario si hay mismatch de IDs)
          // No podemos usar .filter({ email }) porque la columna email no existe en la tabla profiles
          try {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useCurrentProfile] Perfil no encontrado por ID, usando fallback costoso (usuarios.list) para buscar por email:', {
                id: effectiveUserId,
                email: normalizedEmail,
                isImpersonating
              });
            }
            // Usar remoteDataAPI para consistencia con el resto del codebase
            const allUsers = await remoteDataAPI.usuarios.list();
            localProfile = allUsers.find(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
          } catch (fallbackError) {
            console.error('[useCurrentProfile] Error en fallback de búsqueda por email:', fallbackError);
          }
        }

        if (localProfile) {
          return localProfile;
        }

        // console.log('DEBUG: useCurrentProfile NOT found local, using fallback');

        // Si no se encuentra en la lista, usar datos básicos como fallback
        // Esto puede pasar si el usuario no tiene perfil en la BD aún
        return {
          id: effectiveUserId,
          email: effectiveEmail,
          nombreCompleto: effectiveEmail?.split('@')[0],
          rolPersonalizado: 'ESTU',
          profesorAsignadoId: null,
          isActive: true,
          nivelTecnico: 1,
        };
      } catch (error) {
        console.error('[useCurrentProfile] Error cargando perfil:', error);
        // En caso de error, retornar datos básicos
        return {
          id: effectiveUserId,
          email: effectiveEmail,
          nombreCompleto: effectiveEmail?.split('@')[0],
          rolPersonalizado: 'ESTU',
          profesorAsignadoId: null,
          isActive: true,
          nivelTecnico: 1,
        };
      }
    },
    enabled: !!effectiveUserId,
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

