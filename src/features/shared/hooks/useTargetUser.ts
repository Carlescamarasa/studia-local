/**
 * useTargetUser - Unified hook for loading a specific user
 * 
 * Extracts common logic from PerfilPage and PerfilModal for finding
 * a specific user from the allUsers cache.
 */

import { useQuery } from "@tanstack/react-query";
import { useUsers, type UserEntity } from "@/features/shared/hooks/useUsers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";

interface UseTargetUserOptions {
    /** Specific user ID to load (overrides effectiveUserId if provided) */
    userId?: string | null;
    /** Whether the hook is enabled (e.g., modal is open) */
    enabled?: boolean;
}

interface UseTargetUserResult {
    /** The loaded user, or null if not found */
    targetUser: UserEntity | null;
    /** Whether the query is loading */
    isLoading: boolean;
    /** Whether we're editing own profile */
    isEditingOwnProfile: boolean;
    /** Refetch function */
    refetch: () => void;
}

/**
 * Hook to load a target user by ID or default to the effective user
 */
export function useTargetUser(options: UseTargetUserOptions = {}): UseTargetUserResult {
    const { userId = null, enabled = true } = options;

    const { data: allUsers } = useUsers();
    const effectiveUserContext = useEffectiveUser();
    const effectiveUserId = effectiveUserContext.effectiveUserId;
    const effectiveEmail = effectiveUserContext.effectiveEmail as string | null;
    const effectiveUserName = effectiveUserContext.effectiveUserName;
    const effectiveRole = effectiveUserContext.effectiveRole;
    const isImpersonating = effectiveUserContext.isImpersonating;
    const effectiveUserLoading = effectiveUserContext.loading;

    // Determine which user ID to load
    const targetUserIdToLoad = userId || effectiveUserId;

    const { data: targetUser, isLoading, refetch } = useQuery({
        queryKey: ['targetUser', targetUserIdToLoad, isImpersonating],
        queryFn: async (): Promise<UserEntity | null> => {
            if (!targetUserIdToLoad) return null;

            // Try to find in allUsers cache
            if (allUsers && allUsers.length > 0) {
                // Find by ID first
                const foundById = allUsers.find(u => u.id === targetUserIdToLoad);
                if (foundById) return foundById;

                // Fallback: find by email if we have it
                if (effectiveEmail) {
                    const foundByEmail = allUsers.find(u =>
                        u.email?.toLowerCase().trim() === effectiveEmail.toLowerCase().trim()
                    );
                    if (foundByEmail) return foundByEmail;
                }
            }

            // Fallback: return partial user from context
            return {
                id: targetUserIdToLoad,
                email: effectiveEmail || '',
                nombreCompleto: effectiveUserName || effectiveEmail?.split('@')[0] || '',
                rolPersonalizado: effectiveRole || 'ESTU',
                profesorAsignadoId: null,
                telefono: null,
                nivel: null,
            } as UserEntity;
        },
        enabled: enabled && !!targetUserIdToLoad && !!allUsers && !effectiveUserLoading,
    });

    // Determine if editing own profile
    const isEditingOwnProfile = targetUser?.id === effectiveUserId ||
        (!!targetUser?.email && !!effectiveEmail &&
            targetUser.email.toLowerCase().trim() === effectiveEmail.toLowerCase().trim());

    return {
        targetUser: targetUser ?? null,
        isLoading,
        isEditingOwnProfile,
        refetch,
    };
}

