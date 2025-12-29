import { useMemo } from "react";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { useUsers, type UserEntity } from "@/features/shared/hooks/useUsers";
import type { QueryObserverResult } from "@tanstack/react-query";

/**
 * Hook centralizado para obtener el perfil del usuario actual.
 * 
 * OPTIMIZADO: Usa datos cacheados de useUsers() en lugar de hacer
 * llamadas directas a Supabase. Esto elimina queries duplicadas.
 * 
 * El perfil se obtiene de la caché de useUsers() que tiene:
 * - staleTime: 5 min
 * - gcTime: 10 min
 * 
 * NOTA: Usa effectiveUserId del EffectiveUserProvider para soportar impersonation.
 */

export interface CurrentProfileResult {
  profile: UserEntity | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<UserEntity[], Error>>;
}

export function useCurrentProfile(): CurrentProfileResult {
  const { effectiveUserId, effectiveEmail, isImpersonating } = useEffectiveUser();
  const { data: allUsers, isLoading: usersLoading, error: usersError, refetch } = useUsers();

  // Buscar perfil en datos cacheados de useUsers()
  const profile = useMemo(() => {
    if (!effectiveUserId || !allUsers || allUsers.length === 0) {
      return null;
    }

    // 1. Buscar por ID
    let foundProfile = allUsers.find(u => u.id === effectiveUserId);

    // 2. Si no se encuentra por ID y tenemos email, buscar por email
    // Esto cubre el caso de IDs legacy (Mongo) vs UUID
    if (!foundProfile && effectiveEmail) {
      const normalizedEmail = effectiveEmail.toLowerCase().trim();
      foundProfile = allUsers.find(u =>
        u.email && u.email.toLowerCase().trim() === normalizedEmail
      );
    }

    // 3. Si se encontró, retornar
    if (foundProfile) {
      return foundProfile;
    }

    // 4. Fallback: crear objeto básico si no se encuentra
    // Esto puede pasar si el usuario no tiene perfil en BD aún
    return {
      id: effectiveUserId,
      email: effectiveEmail || '',
      nombreCompleto: effectiveEmail?.split('@')[0] || '',
      fullName: effectiveEmail?.split('@')[0] || '',
      rolPersonalizado: 'ESTU' as const,
      role: 'ESTU' as const,
      profesorAsignadoId: null,
      isActive: true,
      nivelTecnico: 1,
    } as UserEntity;
  }, [effectiveUserId, effectiveEmail, allUsers]);

  // El loading es true solo si aún no tenemos datos de usuarios
  const isLoading = usersLoading && !allUsers;

  return {
    profile,
    isLoading,
    error: usersError as Error | null,
    refetch,
  };
}
