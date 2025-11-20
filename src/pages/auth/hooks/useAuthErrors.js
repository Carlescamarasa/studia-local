import { useCallback } from 'react';
import { authMessages } from '../config/authMessages';

/**
 * Hook para manejar y formatear errores de autenticación
 */
export function useAuthErrors() {
  const getLoginErrorMessage = useCallback((error) => {
    if (!error) return authMessages.login.errors.generic;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status || '';
    
    // Email inválido
    if (errorMessage.includes('invalid email') || errorMessage.includes('email format')) {
      return authMessages.login.validation.emailInvalid;
    }
    
    // Credenciales inválidas
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid credentials') ||
        errorCode === 'invalid_credentials' ||
        error.status === 400) {
      return authMessages.login.errors.invalidCredentials;
    }
    
    // Email no confirmado
    if (errorMessage.includes('email not confirmed') || 
        errorMessage.includes('email_not_confirmed')) {
      return authMessages.login.errors.emailNotConfirmed;
    }
    
    // Contraseña débil
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return 'La contraseña es demasiado débil. Por favor, usa una contraseña más segura.';
    }
    
    // Usuario no encontrado
    if (errorMessage.includes('user not found') || 
        errorMessage.includes('no user found')) {
      return authMessages.login.errors.userNotFound;
    }
    
    // Error de red/conexión
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')) {
      return authMessages.login.errors.networkError;
    }
    
    // Error genérico
    return error.message || authMessages.login.errors.generic;
  }, []);

  const getForgotPasswordErrorMessage = useCallback((error) => {
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

