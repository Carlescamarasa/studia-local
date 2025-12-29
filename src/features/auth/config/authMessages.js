// Mensajes centralizados para autenticación
export const authMessages = {
  login: {
    success: 'Sesión iniciada correctamente',
    errors: {
      invalidCredentials: 'Email o contraseña incorrectos. Verifica tus credenciales e intenta de nuevo.',
      emailNotConfirmed: 'Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
      userNotFound: 'No se encontró una cuenta con este email. Verifica tu dirección de correo.',
      networkError: 'Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.',
      rateLimited: 'Demasiados intentos fallidos. Por favor, espera {minutes} minutos antes de intentar de nuevo.',
      accountLocked: 'Tu cuenta ha sido bloqueada temporalmente por seguridad. Intenta más tarde.',
      generic: 'Error al iniciar sesión. Verifica tus credenciales e intenta de nuevo.',
    },
    validation: {
      emailRequired: 'Por favor, introduce tu dirección de email.',
      emailInvalid: 'El formato del email no es válido. Por favor, verifica tu dirección de correo.',
      passwordRequired: 'Por favor, introduce tu contraseña.',
    },
  },
  forgotPassword: {
    success: 'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada.',
    errors: {
      userNotFound: 'No se encontró una cuenta con este email.',
      emailError: 'Error al enviar el email. Verifica tu dirección de correo.',
      generic: 'Error al enviar el email de recuperación. Intenta de nuevo más tarde.',
    },
    validation: {
      emailRequired: 'Por favor, introduce tu dirección de email.',
      emailInvalid: 'El formato del email no es válido.',
    },
  },
  rateLimit: {
    locked: 'Demasiados intentos fallidos. Espera {minutes} minutos antes de intentar de nuevo.',
    remainingAttempts: 'Te quedan {count} intentos antes de que tu cuenta se bloquee temporalmente.',
  },
};

