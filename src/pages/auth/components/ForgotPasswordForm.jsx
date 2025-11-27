import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ds/FormField';
import { Mail } from 'lucide-react';
import { authConfig } from '../config/authConfig';
import { componentStyles } from '@/design/componentStyles';
import { validateEmail, isEmpty } from '../utils/validation';
import { authMessages } from '../config/authMessages';

export function ForgotPasswordForm({ onSubmit, isLoading, initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validateEmailField = (value) => {
    if (isEmpty(value)) {
      setError(authMessages.forgotPassword.validation.emailRequired);
      return false;
    } else if (!validateEmail(value)) {
      setError(authMessages.forgotPassword.validation.emailInvalid);
      return false;
    }
    setError('');
    return true;
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (authConfig.ux.validateOnChange && touched) {
      validateEmailField(value);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (authConfig.ux.validateOnBlur) {
      validateEmailField(email);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (validateEmailField(email)) {
      onSubmit(email.trim());
    }
  };

  return (
    <div className={componentStyles.auth.loginForm}>
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-sm text-ui/60 hover:text-ui transition-colors mb-4"
        >
          ← Volver al inicio de sesión
        </button>
        
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Recuperar contraseña
        </h3>
        <p className="text-sm text-ui/60" style={{ color: 'var(--color-text-secondary)' }}>
          Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <FormField
          label="Email"
          required
          error={error}
        >
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleBlur}
            required
            disabled={isLoading}
            autoComplete="email"
            autoFocus={authConfig.ux.autoFocus}
            className={`${componentStyles.controls.inputDefault} w-full`}
          />
        </FormField>

        <Button
          type="submit"
          className={`${componentStyles.buttons.primary} w-full mt-6`}
          loading={isLoading}
          loadingText="Enviando..."
        >
          <Mail className="w-5 h-5 mr-2" />
          Enviar enlace de recuperación
        </Button>
      </form>
    </div>
  );
}

