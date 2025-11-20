import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDataClient } from '@/api/localDataClient';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormField from '@/components/ds/FormField';
import { UserPlus } from 'lucide-react';
import { useCreateUser } from '../hooks/useCreateUser';
import { validateEmail, isEmpty } from '../utils/validation';
import { componentStyles } from '@/design/componentStyles';
import { toast } from 'sonner';

export function CreateUserModal({ open, onOpenChange, onSuccess }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [nivel, setNivel] = useState('');
  const [profesorAsignadoId, setProfesorAsignadoId] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { createUser, isLoading } = useCreateUser();

  // Obtener lista de profesores
  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: async () => {
      const users = await localDataClient.entities.User.list();
      return users.filter(u => u.rolPersonalizado === 'PROF');
    },
  });

  // Resetear formulario cuando se cierra
  useEffect(() => {
    if (!open) {
      setEmail('');
      setFullName('');
      setNivel('');
      setProfesorAsignadoId('');
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

    if (field === 'full_name') {
      if (isEmpty(value)) {
        fieldErrors.full_name = 'El nombre completo es requerido';
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

  const handleFullNameChange = (value) => {
    setFullName(value);
    if (touched.full_name) {
      validateField('full_name', value);
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') validateField('email', email);
    if (field === 'full_name') validateField('full_name', fullName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar todos los campos
    const emailValid = validateField('email', email);
    const fullNameValid = validateField('full_name', fullName);
    setTouched({ email: true, full_name: true });

    if (!emailValid || !fullNameValid) {
      return;
    }

    try {
      // Siempre enviar invitación (sendInvitation: true)
      const result = await createUser({
        email: email.trim(),
        full_name: fullName.trim(),
        nivel: nivel || null,
        profesor_asignado_id: profesorAsignadoId || null,
        sendInvitation: true, // Siempre true - solo modo invitación
      });

      toast.success(result.message || 'Usuario creado e invitación enviada correctamente');
      
      if (onSuccess) {
        onSuccess(result.user);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      toast.error(error.message || 'Error al crear usuario');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Crear usuario
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario y envía una invitación por email para que establezca su contraseña.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Campo Profesor Asignado */}
          {profesores.length > 0 && (
            <FormField
              label="Profesor asignado"
              optional
            >
              <Select
                value={profesorAsignadoId || undefined}
                onValueChange={(value) => setProfesorAsignadoId(value === 'none' ? '' : value)}
                disabled={isLoading}
              >
                <SelectTrigger className={componentStyles.controls.selectDefault}>
                  <SelectValue placeholder="Seleccionar profesor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profesores.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nombreCompleto || prof.full_name || prof.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

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
              loadingText="Creando..."
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
