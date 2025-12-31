import { supabase } from '@/api/remote/client';

// Caché en memoria para el usuario autenticado
// Evita múltiples llamadas a supabase.auth.getUser() por request
let cachedAuthUser: { id: string; email: string | null } | null = null;
let cachedAuthUserTimestamp: number = 0;
const AUTH_USER_CACHE_TTL = 30 * 1000; // 30 segundos

/**
 * Obtiene el usuario autenticado de la caché o lo carga una sola vez
 * Esto evita las múltiples llamadas redundantes a supabase.auth.getUser()
 */
export async function getCachedAuthUser(): Promise<{ id: string; email: string | null } | null> {
    const now = Date.now();

    // Si hay caché válida, usarla
    if (cachedAuthUser && (now - cachedAuthUserTimestamp) < AUTH_USER_CACHE_TTL) {
        return cachedAuthUser;
    }

    // Si no hay caché o expiró, cargar
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            cachedAuthUser = { id: user.id, email: user.email || null };
            cachedAuthUserTimestamp = now;
            return cachedAuthUser;
        }
    } catch {
        // Ignorar errores de autenticación
    }

    // Limpiar caché si no hay usuario
    cachedAuthUser = null;
    cachedAuthUserTimestamp = 0;
    return null;
}

/**
 * Limpia la caché del usuario autenticado (llamar en logout)
 */
export function clearAuthUserCache(): void {
    cachedAuthUser = null;
    cachedAuthUserTimestamp = 0;
}
