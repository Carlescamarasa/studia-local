import { useState, useCallback } from 'react';
import { authConfig } from '../config/authConfig';
import { authMessages } from '../config/authMessages';
import { validateEmail, isEmpty } from '../utils/validation';

interface LoginErrors {
  email?: string;
  password?: string;
}

interface LoginTouched {
  email?: boolean;
  password?: boolean;
}

/**
 * Hook para manejar el formulario de login con validación en tiempo real
 * @param {string} initialEmail - Email inicial para pre-llenar el campo
 */
export function useLoginForm(initialEmail = '') {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState<LoginTouched>({});

  // Validación en tiempo real
  const validateField = useCallback((field: 'email' | 'password', value: string) => {
    const fieldErrors: LoginErrors = {};

    if (field === 'email') {
      if (isEmpty(value)) {
        fieldErrors.email = authMessages.login.validation.emailRequired;
      } else if (!validateEmail(value)) {
        fieldErrors.email = authMessages.login.validation.emailInvalid;
      }
    }

    if (field === 'password') {
      if (isEmpty(value)) {
        fieldErrors.password = authMessages.login.validation.passwordRequired;
      }
    }

    setErrors(prev => ({ ...prev, ...fieldErrors }));
    return Object.keys(fieldErrors).length === 0;
  }, []);

  // Handlers con validación
  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    if (authConfig.ux.validateOnChange && touched.email) {
      validateField('email', value);
    }
  }, [touched.email, validateField]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (authConfig.ux.validateOnChange && touched.password) {
      validateField('password', value);
    }
  }, [touched.password, validateField]);

  const handleBlur = useCallback((field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (authConfig.ux.validateOnBlur) {
      if (field === 'email') validateField('email', email);
      if (field === 'password') validateField('password', password);
    }
  }, [email, password, validateField]);

  const validateForm = useCallback(() => {
    const emailValid = validateField('email', email);
    const passwordValid = validateField('password', password);
    setTouched({ email: true, password: true });
    return emailValid && passwordValid;
  }, [email, password, validateField]);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setErrors({});
    setTouched({});
  }, []);

  return {
    email,
    password,
    errors,
    touched,
    setEmail: handleEmailChange,
    setPassword: handlePasswordChange,
    handleBlur,
    validateForm,
    reset,
  };
}

