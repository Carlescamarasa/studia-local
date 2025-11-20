import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ds/FormField';
import { Mail, Send } from 'lucide-react';
import { validateEmail, isEmpty } from '../utils/validation';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

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
      // Obtener el token de sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión.');
      }

      // Llamar a la Edge Function para enviar invitación
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          alias: alias.trim() || null, // Alias solo para el email, no se guarda
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar invitación');
      }

      toast.success('Invitación enviada correctamente');
      
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

