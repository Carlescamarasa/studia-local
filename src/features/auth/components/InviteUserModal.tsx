import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/features/shared/components/ui/dialog';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { FormField } from '@/features/shared/components/ds/FormField';
import { Mail, Send } from 'lucide-react';
import { validateEmail, isEmpty, normalizeEmail } from '../utils/validation';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';
import { inviteUserByEmail, sendPasswordResetAdmin } from '@/api/userAdmin';

export function InviteUserModal({ open, onOpenChange, onSuccess }) {
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Resetear formulario cuando se cierra
  useEffect(() => {
    if (!open) {
      setAlias('');
      setEmail('');
      setErrors({});
      setTouched({});
    }
  }, [open]);

  const validateField = (field, value) => {
    const fieldErrors = {};

    if (field === 'email') {
      if (isEmpty(value)) {
        fieldErrors.email = 'El email es requerido';
      } else if (!validateEmail(value)) {
        fieldErrors.email = 'El formato del email no es válido';
      }
    }

    setErrors(prev => ({ ...prev, ...fieldErrors }));
    return Object.keys(fieldErrors).length === 0;
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (touched.email) {
      validateField('email', value);
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') validateField('email', email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar email
    const emailValid = validateField('email', email);
    setTouched({ email: true });

    if (!emailValid) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Enviar invitación
      await inviteUserByEmail(normalizeEmail(email), {
        alias: alias.trim() || undefined,
      });

      // 2. Si la invitación fue exitosa, enviar también el email de reset password
      let resetPasswordSent = false;
      let resetPasswordError = null;

      try {
        await sendPasswordResetAdmin(normalizeEmail(email));
        resetPasswordSent = true;
      } catch (resetErr) {
        console.error('Error al enviar reset password:', resetErr);
        resetPasswordError = resetErr;
      }

      // Mostrar mensaje según el resultado
      if (resetPasswordSent) {
        toast.success('Se han enviado el email de bienvenida y el email para establecer contraseña');
      } else {
        toast.warning(
          'La invitación se envió correctamente, pero no se pudo enviar el email de cambio de contraseña. ' +
          'Puedes reenviarlo desde las acciones del usuario.'
        );
        console.warn('Error al enviar reset password:', resetPasswordError);
      }

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error al enviar invitación:', error);
      toast.error(error.message || 'Error al enviar invitación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invitar usuario
          </DialogTitle>
          <DialogDescription>
            Envía una invitación por email para que el usuario complete su registro y rellene el formulario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Alias (solo para el email) */}
          <FormField
            label="Alias (opcional)"
            optional
            helpText="Nombre que aparecerá en el email de bienvenida. No se guarda en el sistema."
          >
            <Input
              type="text"
              placeholder="Nombre del usuario"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={isLoading}
              className={`${componentStyles.controls.inputDefault} w-full`}
            />
          </FormField>

          {/* Campo Email */}
          <FormField
            label="Email"
            required
            error={errors.email}
          >
            <Input
              type="email"
              placeholder="usuario@example.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={isLoading}
              autoComplete="email"
              className={`${componentStyles.controls.inputDefault} w-full`}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={componentStyles.buttons.primary}
              loading={isLoading}
              loadingText="Enviando..."
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

