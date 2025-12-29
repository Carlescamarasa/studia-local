import { useAuth } from './AuthProvider';

/**
 * Hook to access the REAL authenticated user (Supabase user).
 * This bypasses any impersonation logic and should be used
 * when you specifically need the authenticated credentials or ID.
 */
export function useRealUser() {
    const { user } = useAuth();
    return { user };
}
