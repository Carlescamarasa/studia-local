import React, { useState } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { FormField } from '@/features/shared/components/ds/FormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/components/ui/select';
import { UserPlus } from 'lucide-react';
import { validateEmail, isEmpty } from '../utils/validation';
import { componentStyles } from '@/design/componentStyles';
import { authConfig } from '../config/authConfig';

interface SignUpFormProps {
  onSubmit: (data: { email: string; full_name: string; nivel: string | null }) => void;
  isLoading: boolean;
}

interface SignUpErrors {
  email?: string;
  full_name?: string;
}

interface SignUpTouched {
  email?: boolean;
  full_name?: boolean;
}

/**
 * Formulario de registro público (futuro)
 * Reutiliza la misma estructura que CreateUserModal pero para registro público
 */
export function SignUpForm({ onSubmit, isLoading }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [nivel, setNivel] = useState('');
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [touched, setTouched] = useState<SignUpTouched>({});

  const validateField = (field: 'email' | 'full_name', value: string) => {
    const fieldErrors: SignUpErrors = {};

    if (field === 'email') {
      if (isEmpty(value)) {
        fieldErrors.email = 'El email es requerido';
      } else if (!validateEmail(value)) {
        fieldErrors.email = 'El formato del email no es válido';
      }
    }

    if (field === 'full_name') {
      if (isEmpty(value)) {
        fieldErrors.full_name = 'El nombre completo es requerido';
      }
    }

    setErrors(prev => ({ ...prev, ...fieldErrors }));
    return Object.keys(fieldErrors).length === 0;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authConfig.ux.validateOnChange && touched.email) {
      validateField('email', value);
    }
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (authConfig.ux.validateOnChange && touched.full_name) {
      validateField('full_name', value);
    }
  };

  const handleBlur = (field: 'email' | 'full_name') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (authConfig.ux.validateOnBlur) {
      if (field === 'email') validateField('email', email);
      if (field === 'full_name') validateField('full_name', fullName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailValid = validateField('email', email);
    const fullNameValid = validateField('full_name', fullName);
    setTouched({ email: true, full_name: true });

    if (!emailValid || !fullNameValid) {
      return;
    }

    onSubmit({
      email: email.trim(),
      full_name: fullName.trim(),
      nivel: nivel || null,
    });
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
          onChange={(e) => handleEmailChange(e.target.value)}
          onBlur={() => handleBlur('email')}
          disabled={isLoading}
          autoComplete="email"
          autoFocus={authConfig.ux.autoFocus}
          className={`${componentStyles.controls.inputDefault} w-full`}
        />
      </FormField>

      {/* Campo Nombre Completo */}
      <FormField
        label="Nombre completo"
        required
        error={errors.full_name}
      >
        <Input
          type="text"
          placeholder="Nombre Apellido"
          value={fullName}
          onChange={(e) => handleFullNameChange(e.target.value)}
          onBlur={() => handleBlur('full_name')}
          disabled={isLoading}
          autoComplete="name"
          className={`${componentStyles.controls.inputDefault} w-full`}
        />
      </FormField>

      {/* Campo Nivel (Experiencia) */}
      <FormField
        label="Experiencia (Nivel)"
        optional
      >
        <Select
          value={nivel || undefined}
          onValueChange={(value) => setNivel(value === 'none' ? '' : value)}
          disabled={isLoading}
        >
          <SelectTrigger className={componentStyles.controls.selectDefault}>
            <SelectValue placeholder="Seleccionar nivel (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin especificar</SelectItem>
            <SelectItem value="principiante">Principiante</SelectItem>
            <SelectItem value="intermedio">Intermedio</SelectItem>
            <SelectItem value="avanzado">Avanzado</SelectItem>
            <SelectItem value="profesional">Profesional</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Botón de submit */}
      <Button
        type="submit"
        className={`${componentStyles.buttons.primary} w-full mt-6`}
        loading={isLoading}
        loadingText="Registrando..."
        disabled={isLoading}
      >
        <UserPlus className="w-5 h-5 mr-2" />
        Registrarse
      </Button>
    </form>
  );
}

