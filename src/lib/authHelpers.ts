/**
 * Helpers para detectar y manejar errores de autenticación
 */

/**
 * Detecta si un error es un error de autenticación
 * @param error - El error a verificar
 * @returns true si es un error de autenticación
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;

  // Verificar códigos de estado HTTP
  if (error.status === 401 || error.status === 403) {
    return true;
  }

  // Verificar mensajes de error comunes de Supabase
  const errorMessage = String(error.message || '').toLowerCase();
  const authErrorPatterns = [
    'jwt expired',
    'auth session missing',
    'invalid token',
    'token expired',
    'session expired',
    'session_not_found',
    'unauthorized',
    'forbidden',
    'authentication failed',
  ];
  
  // Verificar código de error específico de Supabase para session_not_found
  if (error.code === 'session_not_found' || error.statusCode === 403) {
    // Verificar también en headers de respuesta si está disponible
    if (error.response?.headers?.['x-sb-error-code'] === 'session_not_found') {
      return true;
    }
    // Si el mensaje contiene session_not_found o el status es 403, es probablemente un error de sesión
    if (errorMessage.includes('session_not_found') || error.status === 403) {
      return true;
    }
  }

  if (authErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
    return true;
  }

  // Verificar códigos de error de Supabase
  const errorCode = String(error.code || '').toLowerCase();
  if (errorCode === 'pgrst301' || errorCode === '42501') {
    return true;
  }

  return false;
}

/**
 * Maneja errores de autenticación forzando el cierre de sesión y redirigiendo al login
 * @param error - El error de autenticación
 * @param signOut - Función para cerrar sesión
 * @param navigate - Función de navegación (opcional)
 */
export async function handleAuthError(
  error: any,
  signOut: () => Promise<void>,
  navigate?: (path: string, options?: { replace?: boolean }) => void
): Promise<void> {
  if (!isAuthError(error)) {
    return;
  }

  // Log en desarrollo para debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn('[authHelpers] Error de autenticación detectado:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });
  }

  try {
    // Forzar cierre de sesión
    await signOut();
  } catch (signOutError) {
    // Si falla el signOut, continuar de todas formas
    if (process.env.NODE_ENV === 'development') {
      console.warn('[authHelpers] Error al cerrar sesión:', signOutError);
    }
  }

  // Redirigir al login si se proporciona navigate
  if (navigate) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      navigate('/login', { replace: true });
    }
  }
}




