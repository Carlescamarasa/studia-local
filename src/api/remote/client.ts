/**
 * Supabase client and error handling wrappers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';

// Re-export supabase for convenience
export { supabase };

/**
 * Wrapper para interceptar errores de autenticación en llamadas a Supabase
 * Detecta errores 401/403 y dispara un evento personalizado para que AuthProvider pueda reaccionar
 */
export async function withAuthErrorHandling<T>(
    promise: PromiseLike<{ data: T | null; error: any; count?: number | null }>
): Promise<{ data: T | null; error: any; count?: number | null }> {
    try {
        const result = await promise;

        // Si hay error y es de autenticación, disparar evento
        if (result.error && isAuthError(result.error)) {
            // Disparar evento personalizado para que AuthProvider lo escuche
            window.dispatchEvent(new CustomEvent('auth-error', {
                detail: { error: result.error }
            }));
        }

        return result;
    } catch (error: any) {
        // Si es un error de autenticación, disparar evento
        if (isAuthError(error)) {
            window.dispatchEvent(new CustomEvent('auth-error', {
                detail: { error }
            }));
        }
        throw error;
    }
}

/**
 * Wrapper para operaciones que pueden lanzar errores directamente
 */
export async function wrapSupabaseCall<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (isAuthError(error)) {
            // Disparar evento personalizado para que AuthProvider lo escuche
            window.dispatchEvent(new CustomEvent('auth-error', {
                detail: { error }
            }));
        }
        throw error;
    }
}
