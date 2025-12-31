/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { authMessages } from '../config/authMessages';

/**
 * Hook para manejar y formatear errores de autenticación
 */
export function useAuthErrors() {
  const getLoginErrorMessage = useCallback((error: any) => {
    if (!error) return authMessages.login.errors.generic;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status || '';

    // Email inválido (solo formato, no existencia)
    if (errorMessage.includes('invalid email') || errorMessage.includes('email format')) {
      return authMessages.login.validation.emailInvalid;
    }

    // Error de red/conexión (mantener diferenciado para UX)
    if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
      return authMessages.login.errors.networkError;
    }

    // SEGURIDAD: Unificar todos los errores de autenticación en un mensaje genérico
    // Esto previene email enumeration attacks
    // Incluye: credenciales inválidas, usuario no encontrado, email no confirmado, contraseña incorrecta
    if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('user not found') ||
      errorMessage.includes('no user found') ||
      errorMessage.includes('email not confirmed') ||
      errorMessage.includes('email_not_confirmed') ||
      errorCode === 'invalid_credentials' ||
      error.status === 400) {
      return authMessages.login.errors.invalidCredentials;
    }

    // Contraseña débil (mantener diferenciado para ayudar al usuario)
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return 'La contraseña es demasiado débil. Por favor, usa una contraseña más segura.';
    }

    // Error genérico para cualquier otro caso
    return authMessages.login.errors.generic;
  }, []);

  const getForgotPasswordErrorMessage = useCallback((error: any) => {
    if (!error) return authMessages.forgotPassword.errors.generic;

    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('user not found')) {
      return authMessages.forgotPassword.errors.userNotFound;
    } else if (errorMessage.includes('email')) {
      return authMessages.forgotPassword.errors.emailError;
    } else {
      return authMessages.forgotPassword.errors.generic;
    }
  }, []);

  return {
    getLoginErrorMessage,
    getForgotPasswordErrorMessage,
  };
}

