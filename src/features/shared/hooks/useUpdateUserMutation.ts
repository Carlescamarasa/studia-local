/**
 * useUpdateUserMutation - Unified hook for updating user profiles
 * 
 * Extracts common mutation logic from PerfilPage and PerfilModal.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { toast } from "sonner";
import type { UserEntity } from "@/features/shared/hooks/useUsers";

interface UpdateUserData {
    nombreCompleto?: string;
    full_name?: string;
    rolPersonalizado?: string;
    profesorAsignadoId?: string | null;
    nivel?: string | null;
    nivelTecnico?: number | null;
    telefono?: string | null;
    [key: string]: unknown;
}

interface UseUpdateUserMutationOptions {
    /** User ID being updated (if null, uses current user) */
    targetUserId?: string | null;
    /** Additional query keys to invalidate on success */
    additionalQueryKeys?: string[][];
    /** Callback on successful update */
    onSuccess?: (updatedUser: UserEntity | null) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    /** Whether to show toast notifications */
    showToasts?: boolean;
}

interface UseUpdateUserMutationResult {
    /** Mutate function to update user */
    mutate: (data: UpdateUserData) => void;
    /** Async mutate function */
    mutateAsync: (data: UpdateUserData) => Promise<UserEntity | null>;
    /** Whether mutation is in progress */
    isPending: boolean;
    /** Whether mutation was successful */
    isSuccess: boolean;
    /** Error if mutation failed */
    error: Error | null;
}

/**
 * Hook to update a user profile with proper cache invalidation
 */
export function useUpdateUserMutation(
    options: UseUpdateUserMutationOptions = {}
): UseUpdateUserMutationResult {
    const {
        targetUserId,
        additionalQueryKeys = [],
        onSuccess,
        onError,
        showToasts = true,
    } = options;

    const queryClient = useQueryClient();
    const { effectiveUserId } = useEffectiveUser();

    const isOwnProfile = !targetUserId || targetUserId === effectiveUserId;

    const mutation = useMutation<UserEntity | null, Error, UpdateUserData>({
        mutationFn: async (data: UpdateUserData) => {
            const userIdToUpdate = targetUserId || effectiveUserId;

            if (!userIdToUpdate) {
                throw new Error('No se puede actualizar: usuario no encontrado');
            }

            if (isOwnProfile) {
                // Update own profile
                const updated = await localDataClient.auth.updateMe(data as any, userIdToUpdate);
                return updated as UserEntity | null;
            } else {
                // Update another user's profile (admin only)
                const updated = await localDataClient.entities.User.update(userIdToUpdate, data as any);
                return updated as UserEntity | null;
            }
        },
        onSuccess: async (updatedUser) => {
            // Update cache directly if we have the updated user
            if (updatedUser && targetUserId) {
                queryClient.setQueryData(['targetUser', targetUserId], updatedUser);
            }

            // Invalidate standard query keys
            await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            await queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
            await queryClient.invalidateQueries({ queryKey: ['targetUser'] });
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['allUsers'] });

            // Invalidate additional query keys if provided
            for (const queryKey of additionalQueryKeys) {
                await queryClient.invalidateQueries({ queryKey });
            }

            if (showToasts) {
                toast.success('Perfil actualizado correctamente.');
            }

            onSuccess?.(updatedUser);
        },
        onError: (error) => {
            if (showToasts) {
                toast.error(`Error al actualizar el perfil: ${error.message}`);
            }

            onError?.(error);
        },
    });

    return {
        mutate: mutation.mutate,
        mutateAsync: mutation.mutateAsync,
        isPending: mutation.isPending,
        isSuccess: mutation.isSuccess,
        error: mutation.error,
    };
}
