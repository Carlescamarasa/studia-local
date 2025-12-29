// Configuración centralizada y escalable para autenticación
export const authConfig = {
  // Features habilitadas/deshabilitadas
  features: {
    signUp: false, // Por ahora deshabilitado (solo invitación)
    forgotPassword: true,
    rememberMe: true,
    showPassword: true,
    magicLink: false, // Futuro
    twoFactor: false, // Futuro
  },
  
  // Límites y protección
  rateLimit: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos en milisegundos
    resetAfter: 60 * 60 * 1000, // 1 hora en milisegundos
  },
  
  // Validación
  validation: {
    email: {
      required: true,
      minLength: 5,
      maxLength: 254,
    },
    password: {
      required: true,
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      showStrength: false, // Futuro
    },
  },
  
  // UX
  ux: {
    autoFocus: true,
    showSuccessToast: true,
    redirectDelay: 500, // ms antes de redirigir
    validateOnBlur: true,
    validateOnChange: true,
  },
};

