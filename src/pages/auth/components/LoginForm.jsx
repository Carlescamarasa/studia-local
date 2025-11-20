import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import FormField from '@/components/ds/FormField';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useLoginForm } from '../hooks/useLoginForm';
import { authConfig } from '../config/authConfig';
import { componentStyles } from '@/design/componentStyles';

export function LoginForm({ onSubmit, isLoading, rememberMe, onRememberMeChange, rateLimit, initialEmail = '' }) {
  const {
    email,
    password,
    errors,
    setEmail,
    setPassword,
    handleBlur,
    validateForm,
  } = useLoginForm(initialEmail);

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() && !rateLimit.isLocked) {
      onSubmit(email.trim(), password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={componentStyles.auth.loginForm}>
      {/* Campo Email */}
      <FormField
        label="Email"
        required
        error={errors.email}
      >
        <Input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur('email')}
          disabled={isLoading || rateLimit.isLocked}
          autoComplete="email"
          autoFocus={authConfig.ux.autoFocus}
          className={`${componentStyles.controls.inputDefault} w-full`}
        />
      </FormField>

      {/* Campo Contraseña */}
      <FormField
        label="Contraseña"
        required
        error={errors.password}
      >
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            disabled={isLoading || rateLimit.isLocked}
            autoComplete="current-password"
            className={`${componentStyles.controls.inputDefault} w-full ${authConfig.features.showPassword ? 'pr-10' : ''}`}
          />
          {authConfig.features.showPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ui/60 hover:text-ui transition-colors z-10"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </FormField>

      {/* Advertencias de rate limit */}
      {rateLimit.isLocked && (
        <div className="text-sm text-[var(--color-danger)] text-center p-3 rounded-md bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30">
          Demasiados intentos fallidos. Espera {rateLimit.getRemainingTime()} minutos antes de intentar de nuevo.
        </div>
      )}

      {rateLimit.remainingAttempts > 0 && rateLimit.remainingAttempts < 3 && !rateLimit.isLocked && (
        <div className="text-sm text-[var(--color-warning)] text-center p-3 rounded-md bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30">
          Te quedan {rateLimit.remainingAttempts} intentos antes de que tu cuenta se bloquee temporalmente.
        </div>
      )}

      {/* Checkbox Recordar inicio de sesión */}
      {authConfig.features.rememberMe && (
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={onRememberMeChange}
            disabled={isLoading || rateLimit.isLocked}
          />
          <Label
            htmlFor="rememberMe"
            className="cursor-pointer font-medium text-ui text-sm"
          >
            Recordar inicio de sesión
          </Label>
        </div>
      )}

      {/* Botón de submit */}
      <Button
        type="submit"
        className={`${componentStyles.buttons.primary} w-full mt-6`}
        loading={isLoading}
        loadingText="Iniciando sesión..."
        disabled={rateLimit.isLocked}
      >
        <LogIn className="w-5 h-5 mr-2" />
        Iniciar sesión
      </Button>
    </form>
  );
}

